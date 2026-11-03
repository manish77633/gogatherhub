import { BadRequestException, Controller, Get, Headers, Inject, Param, Patch, Post, Body, Delete, UseGuards } from "@nestjs/common";
import { ContentKind, Role } from "@prisma/client";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";
import { AdminPermissionGuard } from "./admin-permission.guard";
import * as argon2 from "argon2";
const money = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/);
const contentInput = z.object({ kind: z.enum(ContentKind), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160), title: z.string().trim().min(2).max(200), body: z.string().trim().min(1).max(30000), imageUrl: z.url().optional(), metaTitle: z.string().trim().max(200).optional(), metaDescription: z.string().trim().max(500).optional(), published: z.boolean().default(false) });
const permission = z.enum(["analytics.read", "audit.read", "seller.read", "seller.write", "catalog.read", "catalog.write", "buyer.read", "order.read", "review.read", "review.write", "return.read", "return.write", "promotion.read", "promotion.write", "shipping.read", "shipping.write", "support.read", "support.write", "content.read", "content.write"]);

@UseGuards(AdminPermissionGuard)
@Controller("admin")
export class AdminController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(AuthService) private readonly auth: AuthService) {}

  @Get("returns")
  async returns(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.returnRequest.findMany({ include: { buyer: { select: { name: true, email: true } }, seller: { select: { shopName: true } }, orderItem: { select: { productName: true, quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Patch("returns/:id/status")
  async returnStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ status: z.enum(["ADMIN_REVIEW", "REFUND_PENDING"]), reason: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid return status");
    const permitted = parsed.data.status === "ADMIN_REVIEW" ? ["SELLER_APPROVED", "SELLER_REJECTED"] : ["ADMIN_REVIEW"];
    return this.db.$transaction(async tx => {
      const updated = await tx.returnRequest.updateMany({ where: { id, status: { in: permitted as ("SELLER_APPROVED" | "SELLER_REJECTED" | "ADMIN_REVIEW")[] } }, data: { status: parsed.data.status, adminReason: parsed.data.reason } });
      if (!updated.count) throw new BadRequestException("Invalid return transition");
      await tx.auditLog.create({ data: { actorId: actor.id, action: `return.${parsed.data.status.toLowerCase()}`, entity: "return_request", entityId: id } });
      return tx.returnRequest.findUnique({ where: { id } });
    });
  }

  @Get("reviews")
  async reviews(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.review.findMany({ include: { buyer: { select: { name: true } }, product: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Patch("reviews/:id/status")
  async reviewStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ status: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().min(3).max(500).optional() }).safeParse(body);
    if (!parsed.success || parsed.data.status === "REJECTED" && !parsed.data.reason) throw new BadRequestException("Invalid review decision");
    return this.db.$transaction(async tx => {
      const review = await tx.review.update({ where: { id }, data: { status: parsed.data.status, moderationReason: parsed.data.status === "REJECTED" ? parsed.data.reason : null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: `review.${parsed.data.status.toLowerCase()}`, entity: "review", entityId: id } });
      return review;
    });
  }

  @Get("roles")
  async roles(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN]);
    return this.db.staffRole.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  }

  @Post("roles")
  async createRole(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN]);
    const parsed = z.object({ name: z.string().trim().min(2).max(100), permissions: z.array(permission).max(30) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid staff role");
    return this.db.$transaction(async tx => {
      const role = await tx.staffRole.create({ data: { name: parsed.data.name, permissions: [...new Set(parsed.data.permissions)] } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.role.create", entity: "staff_role", entityId: role.id } });
      return role;
    });
  }

  @Patch("roles/:id")
  async updateRole(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN]);
    const parsed = z.object({ permissions: z.array(permission).max(30) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid permissions");
    return this.db.$transaction(async tx => {
      const role = await tx.staffRole.update({ where: { id }, data: { permissions: [...new Set(parsed.data.permissions)] } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.role.update", entity: "staff_role", entityId: id } });
      return role;
    });
  }

  @Get("staff")
  async staff(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN]);
    return this.db.user.findMany({ where: { role: Role.ADMIN_STAFF, deletedAt: null }, select: { id: true, name: true, email: true, staffRole: { select: { id: true, name: true, permissions: true } }, createdAt: true }, take: 100 });
  }

  @Post("staff")
  async createStaff(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN]);
    const parsed = z.object({ name: z.string().trim().min(2).max(120), email: z.email().max(320), password: z.string().min(12).max(128), roleId: z.uuid() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid staff details");
    const role = await this.db.staffRole.findUnique({ where: { id: parsed.data.roleId } });
    if (!role) throw new BadRequestException("Staff role unavailable");
    return this.db.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash: await argon2.hash(parsed.data.password), role: Role.ADMIN_STAFF, staffRoleId: role.id }, select: { id: true, name: true, email: true, role: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.create", entity: "user", entityId: user.id } });
      return user;
    });
  }

  @Get("cms")
  async cms(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.contentEntry.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
  }

  @Post("cms")
  async createContent(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = contentInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid content");
    return this.db.$transaction(async tx => {
      const entry = await tx.contentEntry.create({ data: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.create", entity: "content_entry", entityId: entry.id } });
      return entry;
    });
  }

  @Patch("cms/:id")
  async updateContent(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = contentInput.partial().refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid content");
    return this.db.$transaction(async tx => {
      const entry = await tx.contentEntry.update({ where: { id }, data: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.update", entity: "content_entry", entityId: id } });
      return entry;
    });
  }

  @Delete("cms/:id")
  async deleteContent(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    await this.db.$transaction(async tx => {
      await tx.contentEntry.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.delete", entity: "content_entry", entityId: id } });
    });
    return { ok: true };
  }

  @Get("categories")
  async categories(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.category.findMany({ include: { _count: { select: { products: true, children: true } } }, orderBy: { name: "asc" }, take: 500 });
  }

  @Post("categories")
  async createCategory(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140), parentId: z.uuid().optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid category");
    return this.db.$transaction(async tx => {
      const category = await tx.category.create({ data: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "category.create", entity: "category", entityId: category.id } });
      return category;
    });
  }

  @Patch("categories/:id")
  async updateCategory(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ name: z.string().trim().min(2).max(120).optional(), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140).optional() }).refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid category");
    return this.db.$transaction(async tx => {
      const category = await tx.category.update({ where: { id }, data: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "category.update", entity: "category", entityId: id } });
      return category;
    });
  }

  @Delete("categories/:id")
  async deleteCategory(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const linked = await this.db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!linked || linked._count.products || linked._count.children) throw new BadRequestException("Category is in use or unavailable");
    await this.db.$transaction(async tx => {
      await tx.category.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "category.delete", entity: "category", entityId: id } });
    });
    return { ok: true };
  }

  @Get("overview")
  async overview(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const [sales, orders, sellers, buyers, sellerApprovals, productApprovals, recentActivity] = await Promise.all([
      this.db.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
      this.db.order.count(), this.db.seller.count({ where: { status: "APPROVED" } }),
      this.db.user.count({ where: { role: Role.BUYER, deletedAt: null } }),
      this.db.seller.count({ where: { status: "PENDING" } }),
      this.db.product.count({ where: { status: "PENDING", deletedAt: null } }),
      this.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return { sales: sales._sum.total ?? 0, orders, sellers, buyers, sellerApprovals, productApprovals, recentActivity };
  }

  @Get("products")
  async products(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.product.findMany({ where: { deletedAt: null }, include: { seller: { select: { shopName: true } }, variants: true }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("orders")
  async orders(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.order.findMany({ include: { buyer: { select: { name: true, email: true } }, sellerOrders: { include: { seller: { select: { shopName: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("buyers")
  async buyers(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.user.findMany({ where: { role: Role.BUYER, deletedAt: null }, select: { id: true, name: true, email: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("coupons")
  async coupons(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.coupon.findMany({ orderBy: { startsAt: "desc" }, take: 100 });
  }

  @Get("activity")
  async activity(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("support")
  async support(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.supportTicket.findMany({ include: { user: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Patch("support/:id/status")
  async supportStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid ticket status");
    return this.db.$transaction(async tx => {
      const ticket = await tx.supportTicket.update({ where: { id }, data: { status: parsed.data.status } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "support.status.update", entity: "support_ticket", entityId: id } });
      return ticket;
    });
  }

  @Get("sellers")
  async sellers(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.seller.findMany({ include: { user: { select: { id: true, name: true, email: true } } }, take: 100, orderBy: { createdAt: "desc" } });
  }

  @Patch("sellers/:id/status")
  async sellerStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]), reason: z.string().trim().min(3).max(500).optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid status");
    if (parsed.data.status !== "APPROVED" && !parsed.data.reason) throw new BadRequestException("A reason is required");
    if (parsed.data.status === "APPROVED" && process.env.NODE_ENV === "production") {
      const profile = await this.db.seller.findUnique({ where: { id } });
      if (!profile?.businessName || profile.gstStatus !== "VERIFIED" || profile.bankStatus !== "VERIFIED") throw new BadRequestException("Seller verification is incomplete");
    }
    return this.db.$transaction(async tx => {
      const seller = await tx.seller.update({ where: { id }, data: { status: parsed.data.status, reviewReason: parsed.data.status === "APPROVED" ? null : parsed.data.reason } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: `seller.${parsed.data.status.toLowerCase()}`, entity: "seller", entityId: id } });
      return seller;
    });
  }

  @Patch("products/:id/status")
  async productStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ status: z.enum(["ACTIVE", "REJECTED", "ARCHIVED"]), reason: z.string().trim().min(3).max(500).optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid status");
    if (parsed.data.status === "REJECTED" && !parsed.data.reason) throw new BadRequestException("A reason is required");
    return this.db.$transaction(async tx => {
      const product = await tx.product.update({ where: { id }, data: { status: parsed.data.status, reviewReason: parsed.data.status === "ACTIVE" ? null : parsed.data.reason ?? null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: `product.${parsed.data.status.toLowerCase()}`, entity: "product", entityId: id } });
      return product;
    });
  }

  @Patch("products/:id/image")
  async productImage(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({ imageUrl: z.url().startsWith("https://res.cloudinary.com/") }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("A Cloudinary image URL is required");
    const product = await this.db.product.update({ where: { id }, data: { imageUrl: parsed.data.imageUrl } });
    await this.db.auditLog.create({ data: { actorId: actor.id, action: "product.image.update", entity: "product", entityId: id } });
    return product;
  }

  @Get("pincodes")
  async pincodes(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.servicePincode.findMany({ take: 1000, orderBy: { pincode: "asc" } });
  }

  @Patch("pincodes/:pincode")
  async pincode(@Headers("cookie") cookie: string | undefined, @Param("pincode") pincode: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    if (!/^\d{6}$/.test(pincode)) throw new BadRequestException("Invalid pincode");
    const parsed = z.object({ active: z.boolean(), cod: z.boolean(), shippingFee: money, codFee: money }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid availability");
    return this.db.$transaction(async tx => {
      const result = await tx.servicePincode.upsert({ where: { pincode }, create: { pincode, ...parsed.data }, update: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "pincode.update", entity: "service_pincode", entityId: pincode } });
      return result;
    });
  }

  @Post("coupons")
  async addCoupon(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.object({
      code: z.string().regex(/^[A-Z0-9_-]{3,40}$/), discountAmount: money.refine(value => value !== "0" && value !== "0.00"),
      minSubtotal: money, usageLimit: z.number().int().positive().optional(),
      startsAt: z.iso.datetime(), expiresAt: z.iso.datetime(), active: z.boolean().default(true),
    }).safeParse(body);
    if (!parsed.success || new Date(parsed.data.expiresAt) <= new Date(parsed.data.startsAt)) throw new BadRequestException("Invalid coupon");
    return this.db.$transaction(async tx => {
      const coupon = await tx.coupon.create({ data: { ...parsed.data, startsAt: new Date(parsed.data.startsAt), expiresAt: new Date(parsed.data.expiresAt) } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "coupon.create", entity: "coupon", entityId: coupon.id } });
      return coupon;
    });
  }
}
