import { BadRequestException, Controller, Get, Headers, Inject, Param, Patch, Post, Body, Delete, UseGuards } from "@nestjs/common";
import { ContentKind, Role, Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";
import { AdminPermissionGuard } from "./admin-permission.guard";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import { fullProductInput, validateAttributes, validateKitItems } from "../sellers/seller.controller";
const money = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/);
const contentInput = z.strictObject({ kind: z.enum(ContentKind), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160), title: z.string().trim().min(2).max(200), body: z.string().trim().min(1).max(30000), imageUrl: z.url().max(2048).refine(value => new URL(value).protocol === "https:", "An HTTPS URL is required").optional(), metaTitle: z.string().trim().max(200).optional(), metaDescription: z.string().trim().max(500).optional(), published: z.boolean().default(false) });
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
    const parsed = z.strictObject({ status: z.enum(["ADMIN_REVIEW", "REFUND_PENDING"]), reason: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid return status", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
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
    const parsed = z.strictObject({ status: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().min(3).max(500).optional() }).safeParse(body);
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
    const parsed = z.strictObject({ name: z.string().trim().min(2).max(100), permissions: z.array(permission).max(30) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid staff role", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const role = await tx.staffRole.create({ data: { name: parsed.data.name, permissions: [...new Set(parsed.data.permissions)] } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.role.create", entity: "staff_role", entityId: role.id } });
      return role;
    });
  }

  @Patch("roles/:id")
  async updateRole(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN]);
    const parsed = z.strictObject({ permissions: z.array(permission).max(30) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid permissions", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
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
    const parsed = z.strictObject({ name: z.string().trim().min(2).max(120), email: z.email().max(320), password: z.string().min(12).max(128), roleId: z.uuid() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid staff details", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    const role = await this.db.staffRole.findUnique({ where: { id: parsed.data.roleId } });
    if (!role) throw new BadRequestException("Staff role unavailable");
    return this.db.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash: await argon2.hash(parsed.data.password), role: Role.ADMIN_STAFF, staffRoleId: role.id }, select: { id: true, name: true, email: true, role: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.create", entity: "user", entityId: user.id } });
      return user;
    });
  }

  @Get("homepage")
  async homepage(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.homepageSection.findMany({ where: { pageKey: "home" }, orderBy: [{ position: "asc" }, { key: "asc" }] });
  }

  @Post("homepage")
  async saveHomepageSection(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ key: z.enum(["header","announcement","hero","categories","promotions","bestsellers","celebration-kits","personalized-gifts","gifts-under-budget","curated-collections","testimonials","faq","newsletter","footer","navigation","social-links"]), draft: z.strictObject({ heading: z.string().trim().max(200).optional(), description: z.string().trim().max(2000).optional(), imageUrl: z.url().refine(value => value.startsWith("https://")).optional(), buttonLabel: z.string().trim().max(100).optional(), buttonUrl: z.string().regex(/^\/shop(?:\/|\?|$)/).max(500).optional(), items: z.array(z.record(z.string(), z.unknown())).max(50).optional() }), enabled: z.boolean(), position: z.number().int().min(0).max(100) }).safeParse(body);
    if (!parsed.success || !Object.values(parsed.data?.draft ?? {}).some(value => typeof value === "string" ? value.trim() : Array.isArray(value) && value.length)) throw new BadRequestException("Enter section content before saving");
    return this.db.$transaction(async tx => { const section = await tx.homepageSection.upsert({ where: { pageKey_key: { pageKey: "home", key: parsed.data.key } }, create: { pageKey: "home", key: parsed.data.key, draft: parsed.data.draft as Prisma.InputJsonValue, enabled: parsed.data.enabled, position: parsed.data.position }, update: { draft: parsed.data.draft as Prisma.InputJsonValue, enabled: parsed.data.enabled, position: parsed.data.position } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "homepage.save_draft", entity: "homepage_section", entityId: section.id } }); return section; });
  }

  @Patch("homepage/:id")
  async publishHomepageSection(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ publish: z.literal(true) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Confirm publication");
    return this.db.$transaction(async tx => { const section = await tx.homepageSection.findUnique({ where: { id } }); if (!section) throw new BadRequestException("Section unavailable"); const updated = await tx.homepageSection.update({ where: { id }, data: { published: { ...(section.draft as Record<string, unknown>), enabled: section.enabled, position: section.position } as Prisma.InputJsonValue, publishedAt: new Date() } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "homepage.publish", entity: "homepage_section", entityId: id } }); return updated; });
  }

  @Get("site-sections/:pageKey")
  async siteSections(@Headers("cookie") cookie: string | undefined, @Param("pageKey") pageKey: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    if (!/^[a-z][a-z0-9-]{1,79}$/.test(pageKey)) throw new BadRequestException("Invalid page");
    return this.db.homepageSection.findMany({ where: { pageKey }, orderBy: [{ position: "asc" }, { key: "asc" }] });
  }

  @Post("site-sections/:pageKey")
  async saveSiteSection(@Headers("cookie") cookie: string | undefined, @Param("pageKey") pageKey: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    if (!/^[a-z][a-z0-9-]{1,79}$/.test(pageKey)) throw new BadRequestException("Invalid page");
    const parsed = z.strictObject({ key: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/), draft: z.strictObject({ heading: z.string().trim().max(200).optional(), subheading: z.string().trim().max(200).optional(), description: z.string().trim().max(2000).optional(), imageUrl: z.string().max(2048).optional(), buttonLabel: z.string().trim().max(100).optional(), buttonUrl: z.string().max(500).optional(), items: z.array(z.record(z.string(), z.unknown())).max(50).optional() }), enabled: z.boolean(), position: z.number().int().min(0).max(100) }).safeParse(body);
    if (!parsed.success || !Object.values(parsed.data?.draft ?? {}).some(value => typeof value === "string" ? value.trim() : Array.isArray(value) && value.length)) throw new BadRequestException("Enter section content before saving");
    return this.db.$transaction(async tx => { const section = await tx.homepageSection.upsert({ where: { pageKey_key: { pageKey, key: parsed.data.key } }, create: { pageKey, key: parsed.data.key, draft: parsed.data.draft as Prisma.InputJsonValue, enabled: parsed.data.enabled, position: parsed.data.position }, update: { draft: parsed.data.draft as Prisma.InputJsonValue, enabled: parsed.data.enabled, position: parsed.data.position } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "site_section.save_draft", entity: "site_section", entityId: section.id } }); return section; });
  }

  @Patch("site-sections/:id/publish")
  async publishSiteSection(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    if (!z.strictObject({ confirm: z.literal(true) }).safeParse(body).success) throw new BadRequestException("Confirm publication");
    return this.db.$transaction(async tx => { const section = await tx.homepageSection.findUnique({ where: { id } }); if (!section) throw new BadRequestException("Section unavailable"); const updated = await tx.homepageSection.update({ where: { id }, data: { published: { ...(section.draft as Record<string, unknown>), enabled: section.enabled, position: section.position } as Prisma.InputJsonValue, publishedAt: new Date() } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "site_section.publish", entity: "site_section", entityId: id } }); return updated; });
  }

  @Get("media")
  async media(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  }

  @Post("media")
  async registerMedia(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ publicId: z.string().min(1).max(255), url: z.url().refine(value => value.startsWith("https://res.cloudinary.com/")), filename: z.string().trim().min(1).max(255), width: z.number().int().positive(), height: z.number().int().positive(), bytes: z.number().int().positive().max(8000000), format: z.enum(["jpg", "jpeg", "png", "webp", "avif"]) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid media metadata");
    return this.db.$transaction(async tx => { const asset = await tx.mediaAsset.upsert({ where: { publicId: parsed.data.publicId }, create: parsed.data, update: {} }); await tx.auditLog.create({ data: { actorId: actor.id, action: "media.register", entity: "media_asset", entityId: asset.id } }); return asset; });
  }

  @Patch("media/:id")
  async updateMedia(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ filename: z.string().trim().min(1).max(255).optional(), altText: z.string().trim().max(500).optional() }).refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid media details");
    return this.db.$transaction(async tx => { const asset = await tx.mediaAsset.update({ where: { id }, data: parsed.data }); await tx.auditLog.create({ data: { actorId: actor.id, action: "media.update", entity: "media_asset", entityId: id } }); return asset; });
  }

  @Delete("media/:id")
  async removeMedia(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const asset = await this.db.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new BadRequestException("Media unavailable");
    const [products, variants, content, sections] = await Promise.all([
      this.db.product.count({ where: { OR: [{ imageUrl: asset.url }, { imageUrls: { has: asset.url } }] } }),
      this.db.variant.count({ where: { imageUrl: asset.url } }),
      this.db.contentEntry.findMany({ select: { imageUrl: true, body: true, publishedSnapshot: true } }),
      this.db.homepageSection.findMany({ select: { draft: true, published: true } }),
    ]);
    if (products || variants || content.some(item => item.imageUrl === asset.url || item.body.includes(asset.url) || JSON.stringify(item.publishedSnapshot).includes(asset.url)) || sections.some(item => JSON.stringify(item.draft).includes(asset.url) || JSON.stringify(item.published).includes(asset.url))) throw new BadRequestException("Media is in use and cannot be removed");
    return this.db.$transaction(async tx => { await tx.mediaAsset.delete({ where: { id } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "media.remove", entity: "media_asset", entityId: id } }); return { ok: true }; });
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
    if (!parsed.success) throw new BadRequestException({ message: "Invalid content", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const entry = await tx.contentEntry.create({ data: { ...parsed.data, publishedSnapshot: parsed.data.published ? { ...parsed.data, updatedAt: new Date().toISOString() } : undefined, publishedAt: parsed.data.published ? new Date() : undefined, publishedSlug: parsed.data.published ? parsed.data.slug : undefined } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.create", entity: "content_entry", entityId: entry.id } });
      return entry;
    });
  }

  @Patch("cms/:id")
  async updateContent(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = contentInput.partial().refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid content", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const current = await tx.contentEntry.findUnique({ where: { id } });
      if (!current) throw new BadRequestException("Content unavailable");
      const next = { kind: parsed.data.kind ?? current.kind, slug: parsed.data.slug ?? current.slug, title: parsed.data.title ?? current.title, body: parsed.data.body ?? current.body, imageUrl: parsed.data.imageUrl ?? current.imageUrl, metaTitle: parsed.data.metaTitle ?? current.metaTitle, metaDescription: parsed.data.metaDescription ?? current.metaDescription, updatedAt: new Date().toISOString() };
      const publishing = parsed.data.published === true;
      const entry = await tx.contentEntry.update({ where: { id }, data: { ...parsed.data, ...(publishing ? { publishedSnapshot: next, publishedAt: new Date(), publishedSlug: next.slug } : {}) } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.update", entity: "content_entry", entityId: id } });
      return entry;
    });
  }

  @Patch("cms/:id/publish")
  async publishContent(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    if (!z.strictObject({ confirm: z.literal(true) }).safeParse(body).success) throw new BadRequestException("Confirm publication");
    return this.db.$transaction(async tx => {
      const current = await tx.contentEntry.findUnique({ where: { id } });
      if (!current) throw new BadRequestException("Content unavailable");
      const snapshot = { kind: current.kind, slug: current.slug, title: current.title, body: current.body, imageUrl: current.imageUrl, metaTitle: current.metaTitle, metaDescription: current.metaDescription, updatedAt: new Date().toISOString() };
      const entry = await tx.contentEntry.update({ where: { id }, data: { published: true, publishedSnapshot: snapshot, publishedSlug: current.slug, publishedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.publish", entity: "content_entry", entityId: id } });
      return entry;
    });
  }

  @Delete("cms/:id")
  async deleteContent(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    await this.db.$transaction(async tx => {
      await tx.contentEntry.update({ where: { id }, data: { published: false } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cms.archive", entity: "content_entry", entityId: id } });
    });
    return { ok: true };
  }

  @Get("categories")
  async categories(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.category.findMany({ include: { parent: { select: { id: true, name: true, slug: true } }, _count: { select: { products: true, children: true } } }, orderBy: [{ parentId: "asc" }, { name: "asc" }], take: 500 });
  }

  @Get("category-requests")
  async categoryRequests(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.categoryRequest.findMany({ include: { seller: { select: { shopName: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  }

  @Patch("category-requests/:id/status")
  async categoryRequestStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ status: z.enum(["APPROVED", "REJECTED"]) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid category decision", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const request = await tx.categoryRequest.findUnique({ where: { id } });
      if (!request || request.status !== "PENDING") throw new BadRequestException("Category request is unavailable or already reviewed");
      if (parsed.data.status === "APPROVED") {
        if (await tx.category.findUnique({ where: { slug: request.slug } })) throw new BadRequestException("A category with this slug already exists");
        await tx.category.create({ data: { name: request.name, slug: request.slug } });
      }
      const updated = await tx.categoryRequest.update({ where: { id }, data: { status: parsed.data.status } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: `category_request.${parsed.data.status.toLowerCase()}`, entity: "category_request", entityId: id } });
      return updated;
    });
  }

  @Post("categories")
  async createCategory(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140), parentId: z.uuid().nullable().optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid category", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    if (parsed.data.parentId && !await this.db.category.findUnique({ where: { id: parsed.data.parentId }, select: { id: true, parentId: true } })) throw new BadRequestException("Parent category does not exist");
    if (parsed.data.parentId && (await this.db.category.findUnique({ where: { id: parsed.data.parentId }, select: { parentId: true } }))?.parentId) throw new BadRequestException("Subcategories can only be one level deep");
    return this.db.$transaction(async tx => {
      const category = await tx.category.create({ data: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "category.create", entity: "category", entityId: category.id } });
      return category;
    });
  }

  @Patch("categories/:id")
  async updateCategory(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ name: z.string().trim().min(2).max(120).optional(), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140).optional(), parentId: z.uuid().nullable().optional() }).refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid category", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    if (parsed.data.parentId === id) throw new BadRequestException("A category cannot be its own parent");
    if (parsed.data.parentId) {
      const parent = await this.db.category.findUnique({ where: { id: parsed.data.parentId }, select: { id: true, parentId: true } });
      if (!parent) throw new BadRequestException("Parent category does not exist");
      if (parent.parentId) throw new BadRequestException("Subcategories can only be one level deep");
      const current = await this.db.category.findUnique({ where: { id }, select: { id: true, parentId: true, _count: { select: { children: true } } } });
      if (current?._count.children) throw new BadRequestException("A parent category with subcategories cannot become a subcategory");
    }
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
    const [totals, recentActivity] = await Promise.all([
      this.db.$queryRaw<Prisma.JsonObject[]>(Prisma.sql`
        SELECT
          (SELECT COALESCE(SUM(total),0) FROM "Order" WHERE status <> 'CANCELLED') AS sales,
          (SELECT COUNT(*)::int FROM "Order") AS orders,
          (SELECT COUNT(*)::int FROM "Seller" WHERE status='APPROVED') AS sellers,
          (SELECT COUNT(*)::int FROM "User" WHERE role='BUYER' AND "deletedAt" IS NULL) AS buyers,
          (SELECT COUNT(*)::int FROM "Seller" WHERE status='PENDING') AS "sellerApprovals",
          (SELECT COUNT(*)::int FROM "Product" WHERE status='PENDING' AND "deletedAt" IS NULL) AS "productApprovals"
      `),
      this.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return { ...totals[0], recentActivity };
  }

  @Get("products/:id")
  async productDetail(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.product.findFirst({ where: { id, deletedAt: null }, include: { variants: true, seller: { select: { id: true, shopName: true } } } });
  }

  @Post("products/full")
  async createFullProduct(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = fullProductInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid product", details: parsed.error.flatten() });
    const { variants, ...product } = parsed.data;
    if (variants.some(item => item.id)) throw new BadRequestException("New product cannot contain existing variants");
    const category = await this.db.category.findUnique({ where: { id: product.categoryId }, include: { parent: true } });
    if (!category) throw new BadRequestException("Category unavailable");
    if (product.status === "ACTIVE") validateAttributes(category, product.attributes);
    return this.db.$transaction(async tx => {
      const owner = actor.role === Role.ADMIN ? actor : await tx.user.findFirst({ where: { role: Role.ADMIN }, select: { id: true } });
      if (!owner) throw new BadRequestException("Platform owner unavailable");
      const seller = await tx.seller.upsert({ where: { userId: owner.id }, create: { userId: owner.id, shopName: "Go Gather Hub", status: "APPROVED", isOpen: true }, update: {} });
      await validateKitItems(this.db, seller.id, product.attributes, product.status);
      const created = await tx.product.create({ data: { ...product, brand: product.brand || null, imageUrl: product.imageUrls[0] ?? null, slug: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "product"}-${randomUUID().slice(0, 8)}`, sellerId: seller.id, variants: { create: variants.map(({ id: _id, ...item }) => item) } }, include: { variants: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "product.admin_create", entity: "product", entityId: created.id } });
      return created;
    });
  }

  @Patch("products/:id/full")
  async updateFullProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = fullProductInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid product", details: parsed.error.flatten() });
    const { variants, ...product } = parsed.data;
    return this.db.$transaction(async tx => {
      const current = await tx.product.findFirst({ where: { id, deletedAt: null }, include: { variants: true } });
      if (!current) throw new BadRequestException("Product unavailable");
      const category = await tx.category.findUnique({ where: { id: product.categoryId }, include: { parent: true } });
      if (!category) throw new BadRequestException("Category unavailable");
      if (product.status === "ACTIVE") validateAttributes(category, product.attributes);
      await validateKitItems(this.db, current.sellerId, product.attributes, product.status, id);
      const existing = new Set(current.variants.map(item => item.id));
      if (variants.some(item => item.id && !existing.has(item.id))) throw new BadRequestException("Variant unavailable");
      const ids = variants.flatMap(item => item.id ? [item.id] : []);
      await tx.variant.updateMany({ where: { productId: id, id: { notIn: ids } }, data: { active: false } });
      for (const variant of variants) { const { id: variantId, ...values } = variant; if (variantId) { const previous = current.variants.find(item => item.id === variantId)!; await tx.variant.update({ where: { id: variantId }, data: values }); if (previous.stock !== values.stock) await tx.inventoryMovement.create({ data: { variantId, actorId: actor.id, reason: "ADMIN_ADJUSTMENT", delta: values.stock - previous.stock, before: previous.stock, after: values.stock } }); } else await tx.variant.create({ data: { ...values, productId: id } }); }
      const updated = await tx.product.update({ where: { id }, data: { ...product, brand: product.brand || null, imageUrl: product.imageUrls[0] ?? null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "product.admin_full_edit", entity: "product", entityId: id } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  @Get("products")
  async products(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.product.findMany({ where: { deletedAt: null }, include: { seller: { select: { shopName: true } }, variants: true }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("orders")
  async orders(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.order.findMany({ include: { buyer: { select: { name: true, email: true, avatarUrl: true } }, sellerOrders: { include: { seller: { select: { shopName: true } }, items: { include: { variant: { include: { product: { select: { imageUrl: true, imageUrls: true } } } } } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("buyers")
  async buyers(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.user.findMany({
      where: { role: Role.BUYER, deletedAt: null },
      select: {
        id: true, name: true, email: true, avatarUrl: true, createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" }, take: 20,
          select: {
            id: true, orderNumber: true, total: true, status: true, createdAt: true,
            sellerOrders: { select: { items: { select: {
              id: true, productName: true, quantity: true, lineTotal: true,
              variant: { select: { product: { select: { imageUrl: true, imageUrls: true } } } },
            } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" }, take: 100,
    });
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
    const parsed = z.strictObject({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid ticket status", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
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
    const parsed = z.strictObject({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]), reason: z.string().trim().min(3).max(500).optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid status", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
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

  @Patch("products/:id")
  async editProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ name: z.string().trim().min(3).max(200).optional(), description: z.string().trim().min(10).max(10000).optional(), brand: z.string().trim().max(160).nullable().optional(), tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(), categoryId: z.uuid().optional() }).refine(value => Object.keys(value).length > 0).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid product details");
    return this.db.$transaction(async tx => { const updated = await tx.product.updateMany({ where: { id, deletedAt: null }, data: parsed.data }); if (!updated.count) throw new BadRequestException("Product unavailable"); await tx.auditLog.create({ data: { actorId: actor.id, action: "product.admin_edit", entity: "product", entityId: id } }); return { id }; });
  }

  @Delete("products/:id")
  async archiveProduct(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    return this.db.$transaction(async tx => { const updated = await tx.product.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), status: "ARCHIVED" } }); if (!updated.count) throw new BadRequestException("Product unavailable"); await tx.auditLog.create({ data: { actorId: actor.id, action: "product.admin_archive", entity: "product", entityId: id } }); return { id, status: "ARCHIVED" }; });
  }

  @Patch("products/:id/status")
  async productStatus(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({ status: z.enum(["ACTIVE", "REJECTED", "ARCHIVED"]), reason: z.string().trim().min(3).max(500).optional() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid status", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
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
    const parsed = z.strictObject({ imageUrl: z.url().max(2048).refine(value => new URL(value).protocol === "https:", "An HTTPS URL is required").refine(value => value.startsWith("https://res.cloudinary.com/"), "A Cloudinary URL is required") }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "A Cloudinary image URL is required", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const product = await tx.product.update({ where: { id }, data: { imageUrl: parsed.data.imageUrl } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "product.image.update", entity: "product", entityId: id } });
      return product;
    });
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
    const parsed = z.strictObject({ active: z.boolean(), cod: z.boolean(), shippingFee: money, codFee: money }).safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid availability", fields: parsed.error.flatten().fieldErrors, issues: parsed.error.flatten().formErrors });
    return this.db.$transaction(async tx => {
      const result = await tx.servicePincode.upsert({ where: { pincode }, create: { pincode, ...parsed.data }, update: parsed.data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "pincode.update", entity: "service_pincode", entityId: pincode } });
      return result;
    });
  }

  @Post("coupons")
  async addCoupon(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const actor = await this.auth.requireRole(cookie, [Role.ADMIN, Role.ADMIN_STAFF]);
    const parsed = z.strictObject({
      code: z.string().regex(/^[A-Z0-9_-]{3,40}$/), discountAmount: money.refine(value => Number(value) > 0),
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
