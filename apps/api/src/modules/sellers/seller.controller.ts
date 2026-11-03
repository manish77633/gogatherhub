import { BadRequestException, Controller, Get, Headers, Inject, Param, Patch, Post, Body, Delete } from "@nestjs/common";
import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";
import { parseCsv } from "./csv-import";
import * as argon2 from "argon2";

const application = z.object({ shopName: z.string().trim().min(3).max(160) });
const shopInput = z.object({
  shopName: z.string().trim().min(3).max(160).optional(), businessName: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(5000).optional(), addressLine1: z.string().trim().min(5).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(), state: z.string().trim().min(2).max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(), logoUrl: z.url().optional(), bannerUrl: z.url().optional(), isOpen: z.boolean().optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/).optional(),
  bankHolderName: z.string().trim().min(3).max(160).optional(), bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  bankAccountNumber: z.string().regex(/^\d{8,20}$/).optional(), currentPassword: z.string().optional(),
}).refine(value => Object.keys(value).some(key => key !== "currentPassword"));
const money = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/);
const productInput = z.object({
  categoryId: z.uuid(), name: z.string().trim().min(3).max(200), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220),
  description: z.string().trim().min(10).max(10000), imageUrl: z.url().optional(), imageUrls: z.array(z.url()).max(5).optional(),
  variants: z.array(z.object({ sku: z.string().trim().min(2).max(80), label: z.string().trim().min(1).max(120), price: money.refine(value => value !== "0" && value !== "0.00"), stock: z.number().int().min(0).max(1000000) })).min(1).max(50),
});

@Controller("seller")
export class SellerController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(AuthService) private readonly auth: AuthService) {}

  @Get("returns")
  async returns(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    return this.db.returnRequest.findMany({ where: { sellerId: seller.id }, include: { orderItem: { select: { productName: true, quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Patch("returns/:id/decision")
  async returnDecision(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.object({ status: z.enum(["SELLER_APPROVED", "SELLER_REJECTED"]), reason: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid return decision");
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
      results.push({ row: index + 2, name: row.name, sku: row.sku, errors, input: parsed.success ? parsed.data : null });
    }
    return { sellerId, rows: results.map(({ input: _input, ...result }) => result), validCount: results.filter(row => !row.errors.length).length, inputs: results.map(row => row.input) };
  }

  @Post("products/import/preview")
  async previewImport(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.object({ csv: z.string().min(1).max(80000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid CSV");
    const { inputs: _inputs, ...preview } = await this.importPreview(seller.id, parsed.data.csv);
    return preview;
  }

  @Post("products/import")
  async commitImport(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.object({ csv: z.string().min(1).max(80000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid CSV");
    const preview = await this.importPreview(seller.id, parsed.data.csv);
    if (preview.validCount !== preview.rows.length) throw new BadRequestException({ error: { code: "IMPORT_VALIDATION", rows: preview.rows.filter(row => row.errors.length) } });
    return this.db.$transaction(async tx => {
      const created = [];
      for (const input of preview.inputs) {
        if (!input) continue;
        const { variants, ...product } = input;
        created.push(await tx.product.create({ data: { ...product, sellerId: seller.id, status: "PENDING", variants: { create: variants } }, select: { id: true, slug: true } }));
      }
      await tx.auditLog.create({ data: { actorId: seller.userId, action: "product.import", entity: "seller", entityId: seller.id } });
      return { createdCount: created.length, products: created };
    });
  }

  @Get("overview")
  async overview(@Headers("cookie") cookie?: string) {
    const seller = await this.approved(cookie);
    const [sales, orders, products, lowStock, recentOrders] = await Promise.all([
      this.db.sellerOrder.aggregate({ where: { sellerId: seller.id, status: { not: "CANCELLED" }, order: { status: "PLACED" } }, _sum: { subtotal: true } }),
      this.db.sellerOrder.count({ where: { sellerId: seller.id, order: { status: "PLACED" } } }),
      this.db.product.count({ where: { sellerId: seller.id, deletedAt: null } }),
      this.db.variant.count({ where: { product: { sellerId: seller.id, deletedAt: null }, stock: { lte: 5 }, active: true } }),
      this.db.sellerOrder.findMany({ where: { sellerId: seller.id, order: { status: "PLACED" } }, include: { items: true }, orderBy: { order: { createdAt: "desc" } }, take: 10 }),
    ]);
    return { sales: sales._sum.subtotal ?? 0, orders, products, lowStock, recentOrders };
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
    if (!parsed.success) throw new BadRequestException("Invalid shop details");
    const { currentPassword, bankAccountNumber, ...updates } = parsed.data;
    const sensitive = Boolean(parsed.data.gstin || parsed.data.bankHolderName || parsed.data.bankIfsc || bankAccountNumber);
    if (sensitive && (!currentPassword || !await argon2.verify(user.passwordHash, currentPassword))) throw new BadRequestException("Confirm your current password for GST or bank changes");
    return this.db.$transaction(async tx => {
      const seller = await tx.seller.update({ where: { userId: user.id }, data: { ...updates, ...(parsed.data.gstin ? { gstStatus: "UNVERIFIED" } : {}), ...(bankAccountNumber ? { bankAccountLast4: bankAccountNumber.slice(-4), bankStatus: "UNVERIFIED" } : {}) } });
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
    const parsed = z.object({ subject: z.string().trim().min(4).max(160), message: z.string().trim().min(10).max(5000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid ticket");
    return this.db.supportTicket.create({ data: { userId: seller.id, ...parsed.data } });
  }

  @Patch("inventory/:id")
  async updateInventory(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.object({ stock: z.number().int().min(0).max(1000000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid stock");
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
    const parsed = z.object({ status: z.enum(["ACCEPTED", "PACKED", "SHIPPED", "DELIVERED"]) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid order status");
    const current = await this.db.sellerOrder.findFirst({ where: { id, sellerId: seller.id, order: { status: "PLACED" } } });
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
    if (!parsed.success) throw new BadRequestException("Invalid shop name");
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

  @Post("products")
  async createProduct(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = productInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });
    const { variants, ...product } = parsed.data;
    return this.db.product.create({ data: { ...product, sellerId: seller.id, status: "PENDING", variants: { create: variants } }, include: { variants: true } });
  }

  @Patch("products/:id")
  async updateProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = productInput.omit({ variants: true }).partial().safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid product details");
    const updated = await this.db.product.updateMany({ where: { id, sellerId: seller.id, deletedAt: null }, data: { ...parsed.data, status: "PENDING" } });
    if (!updated.count) throw new BadRequestException("Product unavailable");
    return this.db.product.findUnique({ where: { id } });
  }

  @Patch("products/:id/variants/:variantId")
  async updateVariant(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Param("variantId") variantId: string, @Body() body: unknown) {
    const seller = await this.approved(cookie);
    const parsed = z.object({ label: z.string().trim().min(1).max(120).optional(), price: money.refine(value => value !== "0" && value !== "0.00").optional(), active: z.boolean().optional() }).refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid variant");
    const variant = await this.db.variant.findFirst({ where: { id: variantId, productId: id, product: { sellerId: seller.id, deletedAt: null } } });
    if (!variant) throw new BadRequestException("Variant unavailable");
    return this.db.$transaction(async tx => {
      const updated = await tx.variant.update({ where: { id: variantId }, data: parsed.data });
      if (parsed.data.price !== undefined || parsed.data.label !== undefined) await tx.product.update({ where: { id }, data: { status: "PENDING" } });
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
    return this.db.sellerOrder.findMany({ where: { sellerId: seller.id, order: { status: "PLACED" } }, include: { items: true }, take: 100, orderBy: { order: { createdAt: "desc" } } });
  }
}
