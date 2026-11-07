import { BadRequestException, Controller, Get, Headers, Inject, Param, Patch, Post, Body, Delete } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";
import { parseCsv } from "./csv-import";
import * as argon2 from "argon2";
import { randomUUID } from "node:crypto";

const application = z.strictObject({ shopName: z.string().trim().min(3).max(160) });
const shopInput = z.strictObject({
  shopName: z.string().trim().min(3).max(160).optional(), businessName: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(5000).optional(), addressLine1: z.string().trim().min(5).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(), state: z.string().trim().min(2).max(100).optional(),
  pincode: z.string().regex(/^[1-9]\d{5}$/).optional(), logoUrl: z.url().max(2048).refine(value => new URL(value).protocol === "https:", "An HTTPS URL is required").optional(), bannerUrl: z.url().max(2048).refine(value => new URL(value).protocol === "https:", "An HTTPS URL is required").optional(), isOpen: z.boolean().optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/).optional(),
  bankHolderName: z.string().trim().min(3).max(160).optional(), bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  bankAccountNumber: z.string().regex(/^\d{8,20}$/).optional(), currentPassword: z.string().optional(),
}).refine(value => Object.keys(value).some(key => key !== "currentPassword"));
const money = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/);
const productInput = z.strictObject({
  categoryId: z.uuid(), name: z.string().trim().min(3).max(200), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220),
  description: z.string().trim().min(10).max(10000), imageUrl: z.url().max(2048).refine(value => new URL(value).protocol === "https:", "An HTTPS URL is required").optional(), imageUrls: z.array(z.url().max(2048).refine(value => new URL(value).protocol === "https:", "An HTTPS URL is required")).max(5).optional(),
  variants: z.array(z.strictObject({ sku: z.string().trim().min(2).max(80), label: z.string().trim().min(1).max(120), price: money.refine(value => Number(value) > 0), stock: z.number().int().min(0).max(1000000) })).min(1).max(50),
});

export const fullProductInput = z.strictObject({
  name: z.string().trim().min(3).max(200), categoryId: z.uuid(), description: z.string().trim().max(10000), seoTitle: z.string().trim().max(200).nullable().optional(), seoDescription: z.string().trim().max(500).nullable().optional(),
  brand: z.string().trim().max(160).optional(), tags: z.array(z.string().trim().min(1).max(60)).max(30),
  attributes: z.record(z.string().max(80), z.string().trim().max(1000)).refine(v => Object.keys(v).length <= 50),
  imageUrls: z.array(z.url().max(2048).refine(v => v.startsWith("https://"))).max(5),
  status: z.enum(["DRAFT", "ACTIVE"]),
  variants: z.array(z.strictObject({ id: z.uuid().optional(), sku: z.string().trim().min(2).max(80), label: z.string().trim().min(1).max(120), price: money.refine(v => Number(v) > 0), compareAt: money.nullable(), stock: z.number().int().min(0).max(1000000), active: z.boolean(), imageUrl: z.url().max(2048).refine(v => v.startsWith("https://")).nullable() }).refine(v => v.compareAt === null || Number(v.compareAt) >= Number(v.price), { message: "MRP must be at least the selling price" })).min(1).max(50),
}).refine(v => v.status !== "ACTIVE" || v.description.length >= 10, { message: "Published products need a description of at least 10 characters", path: ["description"] }).refine(v => new Set(v.variants.map(item => item.sku.toLowerCase())).size === v.variants.length, { message: "Variant SKUs must be unique" }).refine(v => new Set(v.variants.flatMap(item => item.id ? [item.id] : [])).size === v.variants.filter(item => item.id).length, { message: "Variant IDs must be unique" }).refine(v => v.status !== "ACTIVE" || v.variants.some(item => item.active), { message: "Publish requires an active variant" });

const categoryRequired: Record<string,string[]> = { cakes: ["Flavour", "Weight"], flowers: ["Flower type"], fashion: ["Size"], beauty: ["Net quantity"], electronics: ["Specifications"], gifts: ["Gift type"], decor: ["Material"], home: ["Material"], puja: ["Purpose"], treats: ["Ingredients"] };
export function validateAttributes(category: { slug: string; parent?: { slug: string } | null }, attributes: Record<string,string>) { for (const field of categoryRequired[category.parent?.slug ?? category.slug] ?? []) if (!attributes[field]?.trim()) throw new BadRequestException(`${field} is required for this category`); }
export async function validateKitItems(db: PrismaService, sellerId: string, attributes: Record<string,string>, status: string, ownId?: string) {
  if (attributes["Listing type"] !== "Kit / combo") return;
  const ids = (attributes["Kit items"] ?? "").split(",").filter(Boolean);
  if (status === "ACTIVE" && !ids.length) throw new BadRequestException("Select at least one product for this kit");
  if (new Set(ids).size !== ids.length || ids.includes(ownId ?? "")) throw new BadRequestException("Kit items must be unique products");
  const count = await db.product.count({ where: { id: { in: ids }, sellerId, status: "ACTIVE", deletedAt: null } });
  if (count !== ids.length) throw new BadRequestException("Kit contains unavailable products");
}

@Controller("seller")
export class SellerController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(AuthService) private readonly auth: AuthService) {}

  @Get("integrations")
  async integrations(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.SELLER]);
    return { paymentKeysPresent: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET), paymentMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ? "test" : "unverified", webhookSecretPresent: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET), shippingAutomationConnected: false, payoutsConnected: false, emailDeliveryConnected: false };
  }

  @Get("coupons")
  async coupons(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.coupon.findMany({ where: { sellerId: seller.id }, orderBy: { expiresAt: "desc" }, take: 200 });
  }

  @Post("coupons")
  async createCoupon(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ code: z.string().trim().regex(/^[A-Z0-9_-]{3,40}$/), discountAmount: money.refine(v => Number(v) > 0), minSubtotal: money, usageLimit: z.number().int().min(1).max(1000000), startsAt: z.iso.datetime(), expiresAt: z.iso.datetime(), active: z.boolean() }).safeParse(body);
    if (!parsed.success || new Date(parsed.data.expiresAt) <= new Date(parsed.data.startsAt)) throw new BadRequestException("Invalid coupon fields or date range");
    if (await this.db.coupon.findUnique({ where: { code: parsed.data.code } })) throw new BadRequestException("Coupon code is already in use");
    return this.db.coupon.create({ data: { ...parsed.data, sellerId: seller.id } });
  }

  @Patch("coupons/:id")
  async updateCoupon(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ active: z.boolean().optional(), discountAmount: money.refine(v => Number(v) > 0).optional(), minSubtotal: money.optional() }).refine(v => Object.keys(v).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid coupon details", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const updated = await this.db.coupon.updateMany({ where: { id, sellerId: seller.id }, data: parsed.data });
    if (!updated.count) throw new BadRequestException("Coupon unavailable");
    return { id };
  }

  @Get("reviews")
  async reviews(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.review.findMany({ where: { product: { sellerId: seller.id } }, select: { id: true, title: true, body: true, rating: true, status: true, createdAt: true, product: { select: { name: true } }, buyer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  }

  @Get("customers")
  async customers(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    const rows = await this.db.sellerOrder.findMany({ where: { sellerId: seller.id, order: { status: { in: ["PLACED", "FULFILLED"] } } }, select: { id: true, subtotal: true, status: true, order: { select: { orderNumber: true, createdAt: true, buyer: { select: { id: true, name: true } } } } }, orderBy: { order: { createdAt: "desc" } } });
    const grouped = new Map<string, { id: string; name: string; orders: typeof rows; total: Prisma.Decimal }>();
    for (const row of rows) {
      const buyer = row.order.buyer;
      const entry = grouped.get(buyer.id) ?? { ...buyer, orders: [], total: new Prisma.Decimal(0) };
      entry.orders.push(row); if (row.status !== "CANCELLED") entry.total = entry.total.add(row.subtotal);
      grouped.set(buyer.id, entry);
    }
    return [...grouped.values()];
  }

  @Get("payments")
  async payments(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.sellerOrder.findMany({ where: { sellerId: seller.id }, select: { id: true, subtotal: true, status: true, order: { select: { orderNumber: true, createdAt: true, status: true, paymentMethod: true, paymentStatus: true } } }, orderBy: { order: { createdAt: "desc" } }, take: 200 });
  }

  @Get("analytics")
  async analytics(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    const where = { sellerOrder: { sellerId: seller.id, status: { not: "CANCELLED" as const }, order: { status: { in: ["PLACED" as const, "FULFILLED" as const] } } } };
    const [products, days] = await Promise.all([
      this.db.orderItem.groupBy({ by: ["sku", "productName"], where, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: "desc" } } }),
      this.db.$queryRaw<{ date: string; sales: Prisma.Decimal }[]>(Prisma.sql`
        SELECT to_char(o."createdAt",'YYYY-MM-DD') AS date, SUM(i."lineTotal") AS sales
        FROM "OrderItem" i JOIN "SellerOrder" so ON so.id=i."sellerOrderId" JOIN "Order" o ON o.id=so."orderId"
        WHERE so."sellerId"=${seller.id}::uuid AND so.status <> 'CANCELLED' AND o.status IN ('PLACED','FULFILLED')
        GROUP BY to_char(o."createdAt",'YYYY-MM-DD') ORDER BY date ASC
      `),
    ]);
    return { products: products.map(row => ({ sku: row.sku, name: row.productName, quantity: row._sum.quantity ?? 0, sales: row._sum.lineTotal ?? 0 })), days };
  }

  @Get("returns")
  async returns(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.returnRequest.findMany({ where: { sellerId: seller.id }, include: { orderItem: { select: { productName: true, quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("category-requests")
  async categoryRequests(@Headers("cookie") cookie?: string) {
    const user = await this.auth.requireRole(cookie, [Role.SELLER]);
    const seller = await this.db.seller.findUnique({ where: { userId: user.id } });
    if (!seller) throw new BadRequestException("Seller profile unavailable");
    return this.db.categoryRequest.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("category-requests")
  async requestCategory(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const sellerUser = await this.auth.requireRole(cookie, [Role.SELLER]);
    const parsed = z.strictObject({ name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140), note: z.string().trim().max(500).optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid category request", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const seller = await this.db.seller.findUnique({ where: { userId: sellerUser.id } });
    if (!seller) throw new BadRequestException("Seller profile unavailable");
    if (await this.db.category.findUnique({ where: { slug: parsed.data.slug } })) throw new BadRequestException("This category already exists. Refresh the category list.");
    if (await this.db.categoryRequest.findUnique({ where: { sellerId_slug: { sellerId: seller.id, slug: parsed.data.slug } } })) throw new BadRequestException("You already requested this category");
    return this.db.categoryRequest.create({ data: { ...parsed.data, sellerId: seller.id } });
  }

  @Patch("returns/:id/decision")
  async returnDecision(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ status: z.enum(["SELLER_APPROVED", "SELLER_REJECTED"]), reason: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid return decision", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const updated = await tx.returnRequest.updateMany({ where: { id, sellerId: seller.id, status: "REQUESTED" }, data: { status: parsed.data.status, sellerReason: parsed.data.reason } });
      if (!updated.count) throw new BadRequestException("Return request unavailable or already reviewed");
      await tx.auditLog.create({ data: { actorId: seller.userId, action: `return.${parsed.data.status.toLowerCase()}`, entity: "return_request", entityId: id } });
      return tx.returnRequest.findUnique({ where: { id } });
    });
  }

  private async importPreview(sellerId: string, csv: string) {
    let rows;
    try { rows = parseCsv(csv); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Invalid CSV"); }
    const seenSku = new Set<string>(), seenSlug = new Set<string>();
    const results = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      const input = { categoryId: row.categoryid, name: row.name, slug: row.slug, description: row.description, imageUrl: row.imageurl || undefined, variants: [{ sku: row.sku, label: row.label, price: row.price, stock: Number(row.stock) }] };
      const parsed = productInput.safeParse(input);
      const errors: string[] = parsed.success ? [] : parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`);
      if (seenSku.has(row.sku)) errors.push("Duplicate SKU in file");
      if (seenSlug.has(row.slug)) errors.push("Duplicate slug in file");
      seenSku.add(row.sku); seenSlug.add(row.slug);
      if (parsed.success) {
        const [category, sku, slug] = await Promise.all([
          this.db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } }),
          this.db.variant.findUnique({ where: { sku: row.sku }, select: { id: true } }),
          this.db.product.findUnique({ where: { slug: row.slug }, select: { id: true } }),
        ]);
        if (!category) errors.push("Category does not exist");
        if (sku) errors.push("SKU already exists");
        if (slug) errors.push("Slug already exists");
      }
      results.push({ row: index + 2, name: row.name, sku: row.sku, category: parsed.success ? await this.db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { name: true, parent: { select: { name: true } } } }) : null, errors, input: parsed.success ? parsed.data : null });
    }
    return { sellerId, rows: results.map(({ input: _input, ...result }) => result), validCount: results.filter(row => !row.errors.length).length, inputs: results.map(row => row.input) };
  }

  @Post("products/import/preview")
  async previewImport(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ csv: z.string().min(1).max(80000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid CSV", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const { inputs: _inputs, ...preview } = await this.importPreview(seller.id, parsed.data.csv);
    return preview;
  }

  @Post("products/import")
  async commitImport(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ csv: z.string().min(1).max(80000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid CSV", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const preview = await this.importPreview(seller.id, parsed.data.csv);
    if (preview.validCount !== preview.rows.length) throw new BadRequestException({ error: { code: "IMPORT_VALIDATION", rows: preview.rows.filter(row => row.errors.length) } });
    return this.db.$transaction(async tx => {
      const created = [];
      for (const input of preview.inputs) {
        if (!input) continue;
        const { variants, ...product } = input;
        created.push(await tx.product.create({ data: { ...product, sellerId: seller.id, status: "ACTIVE", variants: { create: variants } }, select: { id: true, slug: true } }));
      }
      await tx.auditLog.create({ data: { actorId: seller.userId, action: "product.import", entity: "seller", entityId: seller.id } });
      return { createdCount: created.length, products: created };
    });
  }

  @Get("overview")
  async overview(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    const [totals, recentOrders] = await Promise.all([
      this.db.$queryRaw<{ sales: Prisma.Decimal; orders: number; products: number; lowStock: number }[]>(Prisma.sql`
        SELECT
          (SELECT COALESCE(SUM(so.subtotal),0) FROM "SellerOrder" so JOIN "Order" o ON o.id=so."orderId" WHERE so."sellerId"=${seller.id}::uuid AND so.status <> 'CANCELLED' AND o.status IN ('PLACED','FULFILLED')) AS sales,
          (SELECT COUNT(*)::int FROM "SellerOrder" so JOIN "Order" o ON o.id=so."orderId" WHERE so."sellerId"=${seller.id}::uuid AND o.status IN ('PLACED','FULFILLED')) AS orders,
          (SELECT COUNT(*)::int FROM "Product" p WHERE p."sellerId"=${seller.id}::uuid AND p."deletedAt" IS NULL) AS products,
          (SELECT COUNT(*)::int FROM "Variant" v JOIN "Product" p ON p.id=v."productId" WHERE p."sellerId"=${seller.id}::uuid AND p."deletedAt" IS NULL AND v.active=true AND v.stock<=5) AS "lowStock"
      `),
      this.db.sellerOrder.findMany({ where: { sellerId: seller.id, order: { status: { in: ["PLACED", "FULFILLED"] } } }, include: { items: { include: { variant: { select: { imageUrl: true, product: { select: { imageUrl: true, imageUrls: true } } } } } } }, orderBy: { order: { createdAt: "desc" } }, take: 10 }),
    ]);
    return { ...totals[0], recentOrders };
  }

  @Get("shop")
  async shop(@Headers("cookie") cookie?: string) {
    const seller = await this.auth.requireRole(cookie, [Role.SELLER]);
    return this.db.seller.findUnique({ where: { userId: seller.id }, select: { id: true, shopName: true, status: true, reviewReason: true, businessName: true, gstin: true, gstStatus: true, bankHolderName: true, bankIfsc: true, bankAccountLast4: true, bankStatus: true, description: true, addressLine1: true, city: true, state: true, pincode: true, logoUrl: true, bannerUrl: true, isOpen: true, createdAt: true } });
  }

  @Patch("shop")
  async updateShop(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const user = await this.auth.requireRole(cookie, [Role.SELLER]);
    const parsed = shopInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid shop details", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const { currentPassword, bankAccountNumber, ...updates } = parsed.data;
    const sensitive = Boolean(parsed.data.gstin || parsed.data.bankHolderName || parsed.data.bankIfsc || bankAccountNumber);
    if (sensitive && (!currentPassword || !await argon2.verify(user.passwordHash, currentPassword))) throw new BadRequestException("Confirm your current password for GST or bank changes");
    return this.db.$transaction(async tx => {
      const seller = await tx.seller.update({ where: { userId: user.id }, data: { ...updates, ...(parsed.data.gstin ? { gstStatus: "UNVERIFIED" } : {}), ...(bankAccountNumber ? { bankAccountLast4: bankAccountNumber.slice(-4) } : {}), ...(bankAccountNumber || updates.bankHolderName || updates.bankIfsc ? { bankStatus: "UNVERIFIED" } : {}) } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "seller.shop.update", entity: "seller", entityId: seller.id } });
      return { id: seller.id, shopName: seller.shopName, status: seller.status, gstStatus: seller.gstStatus, bankStatus: seller.bankStatus, bankAccountLast4: seller.bankAccountLast4 };
    });
  }

  @Get("inventory")
  async inventory(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.variant.findMany({ where: { product: { sellerId: seller.id, deletedAt: null } }, include: { product: { select: { name: true, status: true } } }, take: 100, orderBy: { sku: "asc" } });
  }

  @Get("inventory/alerts")
  async inventoryAlerts(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.variant.findMany({ where: { product: { sellerId: seller.id, deletedAt: null }, active: true, stock: { lte: 5 } }, include: { product: { select: { name: true } } }, orderBy: { stock: "asc" }, take: 100 });
  }

  @Get("inventory/movements")
  async inventoryMovements(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.inventoryMovement.findMany({ where: { variant: { product: { sellerId: seller.id } } }, include: { variant: { select: { sku: true, product: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("support")
  async support(@Headers("cookie") cookie?: string) {
    const seller = await this.auth.requireRole(cookie, [Role.SELLER]);
    return this.db.supportTicket.findMany({ where: { userId: seller.id }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("support")
  async createSupport(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.auth.requireRole(cookie, [Role.SELLER]);
    const parsed = z.strictObject({ subject: z.string().trim().min(4).max(160), message: z.string().trim().min(10).max(5000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid ticket", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.supportTicket.create({ data: { userId: seller.id, ...parsed.data } });
  }

  @Patch("inventory/:id")
  async updateInventory(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ stock: z.number().int().min(0).max(1000000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid stock", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const current = await tx.variant.findFirst({ where: { id, product: { sellerId: seller.id, deletedAt: null } } });
      if (!current) throw new BadRequestException("Variant unavailable");
      const result = await tx.variant.updateMany({ where: { id, stock: current.stock }, data: parsed.data });
      if (!result.count) throw new BadRequestException("Stock changed; refresh and retry");
      await tx.inventoryMovement.create({ data: { variantId: id, actorId: seller.userId, reason: "SELLER_ADJUSTMENT", delta: parsed.data.stock - current.stock, before: current.stock, after: parsed.data.stock } });
      await tx.auditLog.create({ data: { actorId: seller.userId, action: "inventory.update", entity: "variant", entityId: id } });
      return { id, stock: parsed.data.stock };
    });
  }

  @Patch("orders/:id/status")
  async orderStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ status: z.enum(["ACCEPTED", "PACKED", "SHIPPED", "DELIVERED"]) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid order status", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const current = await this.db.sellerOrder.findFirst({ where: { id, sellerId: seller.id, order: { status: { in: ["PLACED", "FULFILLED"] } } } });
    const next: Record<string, string> = { NEW: "ACCEPTED", ACCEPTED: "PACKED", PACKED: "SHIPPED", SHIPPED: "DELIVERED" };
    if (!current || next[current.status] !== parsed.data.status) throw new BadRequestException("Invalid order transition");
    return this.db.$transaction(async tx => {
      const updated = await tx.sellerOrder.updateMany({ where: { id, sellerId: seller.id, status: current.status }, data: { status: parsed.data.status } });
      if (!updated.count) throw new BadRequestException("Order changed; refresh and retry");
      await tx.auditLog.create({ data: { actorId: seller.userId, action: `order.${parsed.data.status.toLowerCase()}`, entity: "seller_order", entityId: id } });
      return { id, status: parsed.data.status };
    });
  }

  @Post("apply")
  async apply(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const user = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = application.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid shop name", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const seller = await tx.seller.create({ data: { userId: user.id, shopName: parsed.data.shopName } });
      await tx.user.update({ where: { id: user.id }, data: { role: Role.SELLER } });
      return { id: seller.id, status: seller.status };
    });
  }

  private async approved(cookie?: string) {
    const user = await this.auth.requireRole(cookie, [Role.SELLER]);
    const seller = await this.db.seller.findUnique({ where: { userId: user.id } });
    if (!seller || seller.status !== "APPROVED") throw new BadRequestException("Seller account is not approved");
    return seller;
  }

  @Get("products")
  async products(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.product.findMany({ where: { sellerId: seller.id, deletedAt: null }, include: { variants: true }, take: 100, orderBy: { createdAt: "desc" } });
  }

  @Get("products/:id")
  async productDetail(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const seller = await this.approved(cookie);
    const product = await this.db.product.findFirst({ where: { id, sellerId: seller.id, deletedAt: null }, include: { variants: true } });
    if (!product) throw new BadRequestException("Product unavailable");
    return product;
  }

  @Post("products/full")
  async createFullProduct(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie); const parsed = fullProductInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Please check product fields", details: parsed.error.flatten() });
    const { variants, ...product } = parsed.data;
    if (variants.some(v => v.id)) throw new BadRequestException("New products cannot contain existing variant IDs");
    const category = await this.db.category.findUnique({ where: { id: product.categoryId }, include: { parent: true } }); if (!category) throw new BadRequestException("Category unavailable"); if(product.status === "ACTIVE") validateAttributes(category, product.attributes); await validateKitItems(this.db, seller.id, product.attributes, product.status);
    return this.db.product.create({ data: { ...product, brand: product.brand || null, imageUrl: product.imageUrls[0] ?? null, slug: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,180) || "product"}-${randomUUID().slice(0,8)}`, sellerId: seller.id, variants: { create: variants.map(({ id: _id, ...v }) => v) } }, include: { variants: true } });
  }

  @Patch("products/:id/full")
  async updateFullProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie); const parsed = fullProductInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Please check product fields", details: parsed.error.flatten() });
    const { variants, ...product } = parsed.data;
    return this.db.$transaction(async tx => {
      const current = await tx.product.findFirst({ where: { id, sellerId: seller.id, deletedAt: null }, include: { variants: true } });
      if (!current) throw new BadRequestException("Product unavailable");
      if (["REJECTED", "ARCHIVED"].includes(current.status)) throw new BadRequestException("Contact support about this product before publishing changes");
      const category = await tx.category.findUnique({ where: { id: product.categoryId }, include: { parent: true } }); if (!category) throw new BadRequestException("Category unavailable"); if(product.status === "ACTIVE") validateAttributes(category, product.attributes); await validateKitItems(this.db, seller.id, product.attributes, product.status, id);
      const existing = new Set(current.variants.map(v => v.id));
      if (variants.some(v => v.id && !existing.has(v.id))) throw new BadRequestException("Variant unavailable");
      const ids = variants.flatMap(v => v.id ? [v.id] : []);
      await tx.variant.updateMany({ where: { productId: id, id: { notIn: ids } }, data: { active: false } });
      for (const variant of variants) { const { id: variantId, ...values } = variant; if (variantId) { const previous=current.variants.find(item => item.id === variantId)!; await tx.variant.update({ where: { id: variantId }, data: values }); if(previous.stock !== values.stock) await tx.inventoryMovement.create({ data: { variantId, actorId: seller.userId, reason: "SELLER_ADJUSTMENT", delta: values.stock - previous.stock, before: previous.stock, after: values.stock } }); } else await tx.variant.create({ data: { ...values, productId: id } }); }
      await tx.product.update({ where: { id }, data: { ...product, brand: product.brand || null, imageUrl: product.imageUrls[0] ?? null } });
      return tx.product.findUnique({ where: { id }, include: { variants: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  @Post("products")
  async createProduct(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = productInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });
    const { variants, ...product } = parsed.data;
    return this.db.product.create({ data: { ...product, imageUrl: product.imageUrls?.[0] ?? product.imageUrl, sellerId: seller.id, status: "ACTIVE", variants: { create: variants } }, include: { variants: true } });
  }

  @Patch("products/:id")
  async updateProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = productInput.omit({ variants: true }).partial().refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid product details", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const updated = await tx.product.updateMany({ where: { id, sellerId: seller.id, deletedAt: null }, data: { ...parsed.data, ...(parsed.data.imageUrls ? { imageUrl: parsed.data.imageUrls[0] ?? null } : {}) } });
      if (!updated.count) throw new BadRequestException("Product unavailable");
      await tx.product.updateMany({ where: { id, sellerId: seller.id, deletedAt: null, status: "PENDING" }, data: { status: "ACTIVE", reviewReason: null } });
      return tx.product.findUnique({ where: { id } });
    });
  }

  @Patch("products/:id/variants/:variantId")
  async updateVariant(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Param("variantId") variantId: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.strictObject({ label: z.string().trim().min(1).max(120).optional(), price: money.refine(value => Number(value) > 0).optional(), active: z.boolean().optional() }).refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid variant", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const variant = await this.db.variant.findFirst({ where: { id: variantId, productId: id, product: { sellerId: seller.id, deletedAt: null } } });
    if (!variant) throw new BadRequestException("Variant unavailable");
    return this.db.$transaction(async tx => {
      const updated = await tx.variant.update({ where: { id: variantId }, data: parsed.data });
      await tx.auditLog.create({ data: { actorId: seller.userId, action: "variant.update", entity: "variant", entityId: variantId } });
      return updated;
    });
  }

  @Delete("products/:id")
  async archiveProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const seller = await this.approved(cookie);
    const updated = await this.db.product.updateMany({ where: { id, sellerId: seller.id, deletedAt: null }, data: { status: "ARCHIVED", deletedAt: new Date() } });
    if (!updated.count) throw new BadRequestException("Product unavailable");
    await this.db.auditLog.create({ data: { actorId: seller.userId, action: "product.archive", entity: "product", entityId: id } });
    return { id, status: "ARCHIVED" };
  }

  @Get("orders")
  async orders(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.sellerOrder.findMany({ where: { sellerId: seller.id, order: { status: { in: ["PLACED", "FULFILLED"] } } }, include: { items: { include: { variant: { select: { imageUrl: true, product: { select: { imageUrl: true, imageUrls: true } } } } } }, order: { select: { orderNumber: true, createdAt: true, paymentMethod: true, paymentStatus: true, address: true, buyer: { select: { name: true } } } } }, take: 100, orderBy: { order: { createdAt: "desc" } } });
  }
}
