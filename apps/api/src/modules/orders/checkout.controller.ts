import { BadRequestException, ConflictException, Controller, Get, Headers, Inject, Param, Post, Body, Patch, Delete, Put } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";
import { assertRazorpayConfigured, createRazorpayOrder, fetchOrderPayments, fetchRazorpayPayment, verifyRazorpaySignature } from "./razorpay";

const checkoutSchema = z.object({
  addressId: z.uuid(),
  idempotencyKey: z.string().min(16).max(100),
  couponCode: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(["COD", "ONLINE"]),
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10000), kitGroupKey: z.string().max(100).optional() })).min(1).max(100),
});
const quoteSchema = checkoutSchema.omit({ idempotencyKey: true });
const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120).regex(/^[\p{L}][\p{L}\p{M} .'-]*$/u), phone: z.string().regex(/^[6-9]\d{9}$/),
  line1: z.string().trim().min(5).max(200), line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M} .'-]+$/u), state: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M} .'-]+$/u),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
});
const cartSchema = z.object({ items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10000) })).max(100) });

@Controller("buyer")
export class CheckoutController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(AuthService) private readonly auth: AuthService) {}

  @Get("coupons")
  async availableCoupons(@Headers("cookie") cookie?: string) {
    await this.auth.requireRole(cookie, [Role.BUYER]);
    const now = new Date();
    const coupons = await this.db.coupon.findMany({ where: { active: true, startsAt: { lte: now }, expiresAt: { gte: now } }, select: { code: true, discountAmount: true, minSubtotal: true, expiresAt: true, usageLimit: true, usedCount: true }, orderBy: { expiresAt: "asc" }, take: 100 });
    return coupons.filter(coupon => coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit).slice(0, 50);
  }

  @Post("orders/quote")
  async quote(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    await this.expireStalePayments(buyer.id);
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid checkout details");
    const input = parsed.data;
    const address = await this.db.address.findFirst({ where: { id: input.addressId, userId: buyer.id } });
    if (!address) throw new BadRequestException("Address unavailable");
    const service = await this.db.servicePincode.findUnique({ where: { pincode: address.pincode } });
    if (!service?.active) throw new BadRequestException(`Delivery is not available for PIN code ${address.pincode}. Please choose another address.`);
    if (input.paymentMethod === "COD" && !service.cod) throw new BadRequestException(`Cash on delivery is not available for PIN code ${address.pincode}. Please choose online payment or another address.`);
    const ids = [...new Set(input.items.map(item => item.variantId))];
    const variants = await this.db.variant.findMany({ where: { id: { in: ids }, active: true, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true } } }, include: { product: { select: { name: true } } } });
    if (variants.length !== ids.length) throw new BadRequestException("A product is unavailable");
    const byId = new Map(variants.map(variant => [variant.id, variant]));
    const quantities = new Map<string, number>();
    let subtotal = new Prisma.Decimal(0);
    for (const item of input.items) {
      const variant = byId.get(item.variantId)!;
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
      subtotal = subtotal.add(variant.price.mul(item.quantity));
    }
    for (const [id, quantity] of quantities) if (byId.get(id)!.stock < quantity) throw new ConflictException(`${byId.get(id)!.product.name} is out of stock`);
    let discount = new Prisma.Decimal(0);
    if (input.couponCode) {
      const coupon = await this.db.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
      const now = new Date();
      if (!coupon?.active || coupon.startsAt > now || coupon.expiresAt < now || subtotal.lt(coupon.minSubtotal) || coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException("Coupon unavailable");
      discount = Prisma.Decimal.min(coupon.discountAmount, subtotal);
    }
    const codFee = input.paymentMethod === "COD" ? service.codFee : new Prisma.Decimal(0);
    return { subtotal, discount, shipping: service.shippingFee, codFee, total: subtotal.sub(discount).add(service.shippingFee).add(codFee) };
  }

  @Get("returns")
  async returns(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.returnRequest.findMany({ where: { buyerId: buyer.id }, include: { orderItem: { select: { productName: true, quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("returns")
  async requestReturn(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ orderItemId: z.uuid(), reason: z.string().trim().min(10).max(1000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid return request");
    const item = await this.db.orderItem.findFirst({ where: { id: parsed.data.orderItemId, sellerOrder: { status: "DELIVERED", order: { buyerId: buyer.id, status: { not: "CANCELLED" } } } }, include: { sellerOrder: { select: { sellerId: true } } } });
    if (!item) throw new BadRequestException("Return request is available after delivery only");
    return this.db.returnRequest.create({ data: { ...parsed.data, buyerId: buyer.id, sellerId: item.sellerOrder.sellerId } });
  }

  @Get("reviews")
  async reviews(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.review.findMany({ where: { buyerId: buyer.id }, include: { product: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("reviews")
  async submitReview(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ orderItemId: z.uuid(), rating: z.number().int().min(1).max(5), title: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(3000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid review");
    const item = await this.db.orderItem.findFirst({ where: { id: parsed.data.orderItemId, sellerOrder: { status: "DELIVERED", order: { buyerId: buyer.id, status: { not: "CANCELLED" } } } }, include: { variant: { select: { productId: true } } } });
    if (!item) throw new BadRequestException("Review is available after delivery only");
    return this.db.review.create({ data: { ...parsed.data, buyerId: buyer.id, productId: item.variant.productId } });
  }

  @Get("wishlist")
  async wishlist(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.wishlistItem.findMany({ where: { userId: buyer.id, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } }, include: { product: { include: { variants: { where: { active: true } }, seller: { select: { shopName: true } }, category: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("wishlist/:slug")
  async addWishlist(@Headers("cookie") cookie: string | undefined, @Param("slug") slug: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const product = await this.db.product.findFirst({ where: { slug, status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } });
    if (!product) throw new BadRequestException("Product unavailable");
    await this.db.wishlistItem.upsert({ where: { userId_productId: { userId: buyer.id, productId: product.id } }, create: { userId: buyer.id, productId: product.id }, update: {} });
    return { ok: true };
  }

  @Delete("wishlist/:slug")
  async removeWishlist(@Headers("cookie") cookie: string | undefined, @Param("slug") slug: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    await this.db.wishlistItem.deleteMany({ where: { userId: buyer.id, product: { slug } } });
    return { ok: true };
  }

  @Get("recently-viewed")
  async recentlyViewed(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.recentView.findMany({ where: { userId: buyer.id, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } }, include: { product: { select: { slug: true, name: true, imageUrl: true } } }, orderBy: { viewedAt: "desc" }, take: 20 });
  }

  @Post("recently-viewed/:slug")
  async recordView(@Headers("cookie") cookie: string | undefined, @Param("slug") slug: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const product = await this.db.product.findFirst({ where: { slug, status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } });
    if (!product) throw new BadRequestException("Product unavailable");
    await this.db.recentView.upsert({ where: { userId_productId: { userId: buyer.id, productId: product.id } }, create: { userId: buyer.id, productId: product.id }, update: { viewedAt: new Date() } });
    return { ok: true };
  }

  @Get("cart")
  async cart(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const items = await this.db.cartItem.findMany({ where: { userId: buyer.id }, include: { variant: { include: { product: { select: { slug: true, name: true, status: true, seller: { select: { status: true } } } } } } }, orderBy: { updatedAt: "desc" } });
    return { userId: buyer.id, items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity, slug: item.variant.product.slug, name: item.variant.product.name, stock: item.variant.stock, price: item.variant.price, available: item.variant.active && item.variant.product.status === "ACTIVE" && item.variant.product.seller.status === "APPROVED" })) };
  }

  @Put("cart")
  async saveCart(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = cartSchema.safeParse(body);
    if (!parsed.success || new Set(parsed.data.items.map(item => item.variantId)).size !== parsed.data.items.length) throw new BadRequestException("Invalid cart");
    const variants = await this.db.variant.findMany({ where: { id: { in: parsed.data.items.map(item => item.variantId) }, active: true, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } } });
    if (variants.length !== parsed.data.items.length || parsed.data.items.some(item => item.quantity > (variants.find(variant => variant.id === item.variantId)?.stock ?? 0))) throw new BadRequestException("Cart contains unavailable stock");
    await this.db.$transaction(async tx => {
      await tx.cartItem.deleteMany({ where: { userId: buyer.id } });
      if (parsed.data.items.length) await tx.cartItem.createMany({ data: parsed.data.items.map(item => ({ userId: buyer.id, ...item })) });
    });
    return this.cart(cookie);
  }

  @Post("cart/merge")
  async mergeCart(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = cartSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid cart");
    const valid = await this.db.variant.findMany({ where: { id: { in: parsed.data.items.map(item => item.variantId) }, active: true, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } } });
    const stocks = new Map(valid.map(item => [item.id, item.stock]));
    for (const item of parsed.data.items) {
      const stock = stocks.get(item.variantId);
      if (!stock) continue;
      const existing = await this.db.cartItem.findUnique({ where: { userId_variantId: { userId: buyer.id, variantId: item.variantId } } });
      const quantity = Math.min(Math.max(item.quantity, existing?.quantity ?? 0), stock);
      await this.db.cartItem.upsert({ where: { userId_variantId: { userId: buyer.id, variantId: item.variantId } }, create: { userId: buyer.id, variantId: item.variantId, quantity }, update: { quantity } });
    }
    return this.cart(cookie);
  }

  @Get("profile")
  async profile(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return { id: buyer.id, name: buyer.name, email: buyer.email, avatarUrl: buyer.avatarUrl, googleLinked: Boolean(buyer.googleSub), createdAt: buyer.createdAt };
  }

  @Patch("profile/avatar")
  async updateAvatar(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ avatarUrl: z.string().url().max(2048).regex(/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\//) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid profile image");
    return this.db.user.update({ where: { id: buyer.id }, data: { avatarUrl: parsed.data.avatarUrl }, select: { avatarUrl: true } });
  }

  @Patch("profile")
  async updateProfile(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ name: z.string().trim().min(2).max(120) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid name");
    const updated = await this.db.user.update({ where: { id: buyer.id }, data: { name: parsed.data.name }, select: { id: true, name: true, email: true } });
    await this.db.auditLog.create({ data: { actorId: buyer.id, action: "buyer.profile.update", entity: "user", entityId: buyer.id } });
    return updated;
  }

  @Get("orders")
  async orderHistory(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.order.findMany({ where: { buyerId: buyer.id }, include: { sellerOrders: { include: { seller: { select: { shopName: true } }, items: { include: { variant: { include: { product: { select: { slug: true, imageUrl: true } } } } } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("orders/:id/cancel")
  async cancelOrder(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Provide a cancellation reason");
    return this.db.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id, buyerId: buyer.id }, include: { sellerOrders: { include: { items: true } } } });
      if (!order || order.status !== "PLACED" || order.paymentMethod !== "COD" || order.sellerOrders.some(item => !["NEW", "ACCEPTED"].includes(item.status))) throw new BadRequestException("Order cannot be cancelled online");
      const changed = await tx.order.updateMany({ where: { id, buyerId: buyer.id, status: "PLACED" }, data: { status: "CANCELLED", cancellationReason: parsed.data.reason, cancelledAt: new Date() } });
      if (!changed.count) throw new ConflictException("Order changed; refresh and retry");
      await tx.sellerOrder.updateMany({ where: { orderId: id }, data: { status: "CANCELLED" } });
      for (const item of order.sellerOrders.flatMap(sellerOrder => sellerOrder.items)) {
        const before = await tx.variant.findUniqueOrThrow({ where: { id: item.variantId } });
        await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        await tx.inventoryMovement.create({ data: { variantId: item.variantId, actorId: buyer.id, reason: "ORDER_CANCELLED", delta: item.quantity, before: before.stock, after: before.stock + item.quantity } });
      }
      if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } });
      await tx.auditLog.create({ data: { actorId: buyer.id, action: "order.cancel", entity: "order", entityId: id } });
      return { id, status: "CANCELLED" };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  @Delete("addresses/:id")
  async deleteAddress(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.$transaction(async tx => {
      const address = await tx.address.findFirst({ where: { id, userId: buyer.id }, select: { isDefault: true } });
      const result = await tx.address.deleteMany({ where: { id, userId: buyer.id, orders: { none: {} } } });
      if (!result.count) throw new BadRequestException("Address is used by an order or unavailable");
      if (address?.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: buyer.id }, select: { id: true } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
      return { ok: true };
    });
  }

  @Patch("addresses/:id")
  async updateAddress(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid address details", errors: parsed.error.flatten().fieldErrors });
    const address = await this.db.address.findFirst({ where: { id, userId: buyer.id }, include: { _count: { select: { orders: true } } } });
    if (!address) throw new BadRequestException("Address unavailable");
    if (address._count.orders) throw new BadRequestException("This address belongs to an order. Add a new address to preserve order history.");
    return this.db.address.update({ where: { id }, data: parsed.data });
  }

  @Patch("addresses/:id/default")
  async setDefaultAddress(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.$transaction(async tx => {
      const target = await tx.address.findFirst({ where: { id, userId: buyer.id } });
      if (!target) throw new BadRequestException("Address unavailable");
      await tx.address.updateMany({ where: { userId: buyer.id, isDefault: true }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });
  }

  @Get("support")
  async tickets(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.supportTicket.findMany({ where: { userId: buyer.id }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("support")
  async createTicket(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ subject: z.string().trim().min(4).max(160), message: z.string().trim().min(10).max(5000) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid ticket");
    return this.db.supportTicket.create({ data: { userId: buyer.id, ...parsed.data } });
  }

  @Get("addresses")
  async addresses(@Headers("cookie") cookie?: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    return this.db.address.findMany({ where: { userId: buyer.id }, orderBy: [{ isDefault: "desc" }, { id: "desc" }] });
  }

  @Post("addresses")
  async addAddress(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ message: "Invalid address details", errors: parsed.error.flatten().fieldErrors });
    return this.db.$transaction(async tx => {
      const first = await tx.address.count({ where: { userId: buyer.id } }) === 0;
      return tx.address.create({ data: { userId: buyer.id, ...parsed.data, isDefault: first } });
    });
  }

  @Post("orders")
  async place(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    await this.expireStalePayments(buyer.id);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });
    const input = parsed.data;
    const existing = await this.db.order.findUnique({ where: { buyerId_idempotencyKey: { buyerId: buyer.id, idempotencyKey: input.idempotencyKey } }, include: { coupon: { select: { code: true } }, sellerOrders: { include: { items: { select: { variantId: true, quantity: true, kitGroupKey: true } } } } } });
    if (input.paymentMethod === "ONLINE") assertRazorpayConfigured();
    if (existing) {
      const normalize = (items: { variantId: string; quantity: number; kitGroupKey?: string | null }[]) => items.map(item => `${item.variantId}:${item.quantity}:${item.kitGroupKey ?? ""}`).sort().join("|");
      if (existing.paymentMethod !== input.paymentMethod || existing.addressId !== input.addressId || (existing.coupon?.code ?? "") !== (input.couponCode?.toUpperCase() ?? "") || normalize(existing.sellerOrders.flatMap(group => group.items)) !== normalize(input.items)) throw new ConflictException("Checkout request changed");
      return input.paymentMethod === "ONLINE" ? this.onlineCheckout(existing.id, buyer.id) : { id: existing.id, orderNumber: existing.orderNumber, status: existing.status, total: existing.total };
    }

    try {
      const placed = await this.db.$transaction(async tx => {
        const address = await tx.address.findFirst({ where: { id: input.addressId, userId: buyer.id } });
        if (!address) throw new BadRequestException("Address unavailable");
        const service = await tx.servicePincode.findUnique({ where: { pincode: address.pincode } });
        if (!service?.active) throw new BadRequestException(`Delivery is not available for PIN code ${address.pincode}. Please choose another address.`);
        if (input.paymentMethod === "COD" && !service.cod) throw new BadRequestException(`Cash on delivery is not available for PIN code ${address.pincode}. Please choose online payment or another address.`);
        const uniqueIds = [...new Set(input.items.map(item => item.variantId))];
        const variants = await tx.variant.findMany({ where: { id: { in: uniqueIds }, active: true, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true } } }, include: { product: true } });
        if (variants.length !== uniqueIds.length) throw new BadRequestException("A product is unavailable");
        const variantMap = new Map(variants.map(v => [v.id, v]));
        const quantities = new Map<string, number>();
        for (const item of input.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
        for (const [variantId, quantity] of quantities) {
          const before = variantMap.get(variantId)!;
          const updated = await tx.variant.updateMany({ where: { id: variantId, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
          if (updated.count !== 1) throw new ConflictException(`${variantMap.get(variantId)?.product.name ?? "Product"} is out of stock`);
          await tx.inventoryMovement.create({ data: { variantId, actorId: buyer.id, reason: "ORDER_PLACED", delta: -quantity, before: before.stock, after: before.stock - quantity } });
        }
        let subtotal = new Prisma.Decimal(0);
        const bySeller = new Map<string, { subtotal: Prisma.Decimal; items: { variantId: string; productName: string; sku: string; quantity: number; unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal; kitGroupKey?: string }[] }>();
        for (const item of input.items) {
          const variant = variantMap.get(item.variantId)!;
          const lineTotal = variant.price.mul(item.quantity);
          subtotal = subtotal.add(lineTotal);
          const group = bySeller.get(variant.product.sellerId) ?? { subtotal: new Prisma.Decimal(0), items: [] };
          group.subtotal = group.subtotal.add(lineTotal);
          group.items.push({ variantId: variant.id, productName: variant.product.name, sku: variant.sku, quantity: item.quantity, unitPrice: variant.price, lineTotal, kitGroupKey: item.kitGroupKey });
          bySeller.set(variant.product.sellerId, group);
        }
        let discount = new Prisma.Decimal(0);
        let couponId: string | undefined;
        if (input.couponCode) {
          const coupon = await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
          const now = new Date();
          if (!coupon?.active || coupon.startsAt > now || coupon.expiresAt < now || subtotal.lt(coupon.minSubtotal)) throw new BadRequestException("Coupon unavailable");
          const updated = await tx.coupon.updateMany({ where: { id: coupon.id, ...(coupon.usageLimit === null ? {} : { usedCount: { lt: coupon.usageLimit } }) }, data: { usedCount: { increment: 1 } } });
          if (updated.count !== 1) throw new ConflictException("Coupon usage limit reached");
          couponId = coupon.id;
          discount = Prisma.Decimal.min(coupon.discountAmount, subtotal);
        }
        const shipping = service.shippingFee;
        const codFee = input.paymentMethod === "COD" ? service.codFee : new Prisma.Decimal(0);
        const order = await tx.order.create({ data: {
          buyerId: buyer.id, addressId: address.id, idempotencyKey: input.idempotencyKey,
          orderNumber: `GGH-${randomInt(100000000, 1000000000)}`,
          couponId, status: input.paymentMethod === "COD" ? "PLACED" : "PAYMENT_PENDING", paymentMethod: input.paymentMethod, paymentStatus: input.paymentMethod === "COD" ? "COD_DUE" : "PENDING",
          paymentExpiresAt: input.paymentMethod === "ONLINE" ? new Date(Date.now() + 30 * 60 * 1000) : null,
          subtotal, discount, shipping, codFee, total: subtotal.sub(discount).add(shipping).add(codFee),
          sellerOrders: { create: Array.from(bySeller, ([sellerId, group]) => ({ sellerId, subtotal: group.subtotal, items: { create: group.items } })) },
        } });
        if (input.paymentMethod === "COD") await tx.cartItem.deleteMany({ where: { userId: buyer.id, variantId: { in: uniqueIds } } });
        return { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return input.paymentMethod === "ONLINE" ? this.onlineCheckout(placed.id, buyer.id) : placed;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const order = await this.db.order.findUnique({ where: { buyerId_idempotencyKey: { buyerId: buyer.id, idempotencyKey: input.idempotencyKey } } });
        if (order) return input.paymentMethod === "ONLINE" ? this.onlineCheckout(order.id, buyer.id) : { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total };
      }
      throw error;
    }
  }

  private async cancelPendingPayment(orderId: string, buyerId: string) {
    return this.db.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id: orderId, buyerId, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, include: { sellerOrders: { include: { items: true } } } });
      if (!order) return false;
      const changed = await tx.order.updateMany({ where: { id: orderId, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, data: { status: "CANCELLED", paymentStatus: "FAILED", cancellationReason: "Online payment window expired", cancelledAt: new Date() } });
      if (!changed.count) return false;
      await tx.sellerOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
      for (const item of order.sellerOrders.flatMap(group => group.items)) {
        const variant = await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        await tx.inventoryMovement.create({ data: { variantId: item.variantId, actorId: buyerId, reason: "PAYMENT_EXPIRED", delta: item.quantity, before: variant.stock - item.quantity, after: variant.stock } });
      }
      if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } });
      await tx.auditLog.create({ data: { actorId: buyerId, action: "payment.expired", entity: "order", entityId: orderId } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async expireStalePayments(buyerId: string) {
    const expired = await this.db.order.findMany({ where: { buyerId, status: "PAYMENT_PENDING", paymentExpiresAt: { lt: new Date() } }, select: { id: true, razorpayOrderId: true }, take: 10 });
    for (const order of expired) {
      try {
        if (order.razorpayOrderId) {
          const payments = await fetchOrderPayments(order.razorpayOrderId);
          const current = await this.db.order.findUnique({ where: { id: order.id } });
          const captured = payments.items.find(payment => payment.order_id === order.razorpayOrderId && payment.status === "captured" && payment.currency === "INR" && payment.amount === current?.total.mul(100).toNumber());
          if (captured) {
            const updated = await this.db.order.updateMany({ where: { id: order.id, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, data: { status: "PLACED", paymentStatus: "PAID", razorpayPaymentId: captured.id, paymentExpiresAt: null } });
            if (updated.count) await this.clearPaidCart(order.id, buyerId);
          } else await this.cancelPendingPayment(order.id, buyerId);
        } else await this.cancelPendingPayment(order.id, buyerId);
      } catch { /* Retain the stock reservation when payment status cannot be verified. */ }
    }
  }

  private async onlineCheckout(orderId: string, buyerId: string) {
    const order = await this.db.order.findFirst({ where: { id: orderId, buyerId } });
    if (!order || order.paymentMethod !== "ONLINE") throw new BadRequestException("Payment order unavailable");
    if (order.paymentStatus === "PAID") return { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total, paid: true };
    if (order.status !== "PAYMENT_PENDING") throw new BadRequestException("Payment order is no longer available");
    if (order.paymentExpiresAt && order.paymentExpiresAt < new Date()) throw new BadRequestException("Payment window expired. Please start checkout again.");
    if (order.razorpayOrderId) {
      const payments = await fetchOrderPayments(order.razorpayOrderId);
      const captured = payments.items.find(payment => payment.order_id === order.razorpayOrderId && payment.status === "captured" && payment.currency === "INR" && payment.amount === order.total.mul(100).toNumber());
      if (captured) {
        await this.db.order.updateMany({ where: { id: order.id, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, data: { status: "PLACED", paymentStatus: "PAID", razorpayPaymentId: captured.id, paymentExpiresAt: null } });
        await this.clearPaidCart(order.id, buyerId);
        return { id: order.id, orderNumber: order.orderNumber, status: "PLACED", total: order.total, paid: true };
      }
    }
    if (!order.razorpayOrderId && order.paymentExpiresAt && order.paymentExpiresAt < new Date()) throw new BadRequestException("Payment window expired. Please start checkout again.");
    const amount = order.total.mul(100).toNumber();
    if (!Number.isSafeInteger(amount) || amount < 100) throw new BadRequestException("Invalid online payment amount");
    let razorpayOrderId = order.razorpayOrderId;
    if (!razorpayOrderId) {
      const created = await createRazorpayOrder(amount, order.orderNumber);
      const updated = await this.db.order.updateMany({ where: { id: order.id, razorpayOrderId: null, status: "PAYMENT_PENDING" }, data: { razorpayOrderId: created.id } });
      razorpayOrderId = updated.count ? created.id : (await this.db.order.findUniqueOrThrow({ where: { id: order.id } })).razorpayOrderId;
    }
    if (!razorpayOrderId) throw new ConflictException("Payment order changed; retry");
    return { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total, razorpayOrderId, keyId: process.env.RAZORPAY_KEY_ID, amount };
  }

  @Post("orders/:id/payment/verify")
  async verifyPayment(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const parsed = z.object({ razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/), razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid payment details");
    const order = await this.db.order.findFirst({ where: { id, buyerId: buyer.id, paymentMethod: "ONLINE" } });
    if (!order?.razorpayOrderId || order.razorpayOrderId !== parsed.data.razorpay_order_id) throw new BadRequestException("Payment order mismatch");
    verifyRazorpaySignature(order.razorpayOrderId, parsed.data.razorpay_payment_id, parsed.data.razorpay_signature);
    const payment = await fetchRazorpayPayment(parsed.data.razorpay_payment_id);
    const amount = order.total.mul(100).toNumber();
    if (payment.id !== parsed.data.razorpay_payment_id || payment.order_id !== order.razorpayOrderId || payment.status !== "captured" || payment.currency !== "INR" || payment.amount !== amount) throw new BadRequestException("Payment has not been captured");
    if (order.paymentStatus !== "PAID") {
      const updated = await this.db.order.updateMany({ where: { id, buyerId: buyer.id, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, data: { status: "PLACED", paymentStatus: "PAID", razorpayPaymentId: payment.id, paymentExpiresAt: null } });
      if (!updated.count) throw new ConflictException("Payment state changed; refresh order");
      await this.clearPaidCart(id, buyer.id);
      await this.db.auditLog.create({ data: { actorId: buyer.id, action: "payment.captured", entity: "order", entityId: id } });
    }
    return { id: order.id, orderNumber: order.orderNumber, status: "PLACED", total: order.total, paid: true };
  }

  async clearPaidCart(orderId: string, buyerId: string) {
    const items = await this.db.orderItem.findMany({ where: { sellerOrder: { orderId, order: { buyerId, paymentStatus: "PAID" } } }, select: { variantId: true } });
    if (items.length) await this.db.cartItem.deleteMany({ where: { userId: buyerId, variantId: { in: items.map(item => item.variantId) } } });
  }

  @Get("orders/:id")
  async one(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    const buyer = await this.auth.requireRole(cookie, [Role.BUYER]);
    const order = await this.db.order.findFirst({ where: { id, buyerId: buyer.id }, include: { address: true, sellerOrders: { include: { seller: { select: { shopName: true } }, items: { include: { variant: { include: { product: { select: { slug: true, imageUrl: true } } } } } } } } } });
    if (!order) throw new BadRequestException("Order unavailable");
    return order;
  }
}
