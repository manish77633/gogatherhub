import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();
const base = process.env.API_TEST_URL ?? "http://localhost:4000";
const suffix = randomBytes(8).toString("hex");
const password = randomBytes(24).toString("base64url");
let buyerId: string | undefined, adminId: string | undefined, orderId: string | undefined, reviewId: string | undefined, returnId: string | undefined, sellerSessionId: string | undefined;
async function call(path: string, method = "GET", body?: object, cookie?: string) { return fetch(`${base}/v1/${path}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
async function login(email: string) { const response = await call("auth/login", "POST", { email, password }); assert.equal(response.status, 200); return response.headers.get("set-cookie")!.split(";")[0]; }
async function main() {
  try {
    const variant = await db.variant.findFirst({ where: { product: { status: "ACTIVE", seller: { status: "APPROVED" } } }, include: { product: true } });
    assert.ok(variant, "Seeded catalog required");
    const buyerEmail = `review-buyer-${suffix}@example.invalid`, adminEmail = `review-admin-${suffix}@example.invalid`;
    buyerId = (await db.user.create({ data: { name: "Review Buyer", email: buyerEmail, role: Role.BUYER, passwordHash: await argon2.hash(password) } })).id;
    adminId = (await db.user.create({ data: { name: "Review Admin", email: adminEmail, role: Role.ADMIN, passwordHash: await argon2.hash(password) } })).id;
    const buyerCookie = await login(buyerEmail), adminCookie = await login(adminEmail);
    const address = await db.address.create({ data: { userId: buyerId, fullName: "Review Buyer", phone: "9999999999", line1: "123 Test Street", city: "Mumbai", state: "Maharashtra", pincode: "400001" } });
    const order = await db.order.create({ data: { buyerId, addressId: address.id, idempotencyKey: suffix, orderNumber: `REVIEW-${suffix}`, status: "FULFILLED", paymentMethod: "COD", paymentStatus: "COD_DUE", subtotal: variant.price, discount: 0, shipping: 0, codFee: 0, total: variant.price, sellerOrders: { create: [{ sellerId: variant.product.sellerId, subtotal: variant.price, status: "NEW", items: { create: [{ variantId: variant.id, productName: variant.product.name, sku: variant.sku, quantity: 1, unitPrice: variant.price, lineTotal: variant.price }] } }] } }, include: { sellerOrders: { include: { items: true } } } });
    orderId = order.id; const itemId = order.sellerOrders[0].items[0].id;
    const input = { orderItemId: itemId, rating: 5, title: "Great product", body: "Delivered safely and matched the description." };
    assert.equal((await call("buyer/reviews", "POST", input, buyerCookie)).status, 400, "Review requires delivery");
    assert.equal((await call("buyer/returns", "POST", { orderItemId: itemId, reason: "Return test before delivery" }, buyerCookie)).status, 400, "Return requires delivery");
    await db.sellerOrder.update({ where: { id: order.sellerOrders[0].id }, data: { status: "DELIVERED" } });
    const requested = await call("buyer/returns", "POST", { orderItemId: itemId, reason: "Item needs a manual return review" }, buyerCookie);
    assert.equal(requested.status, 201); returnId = (await requested.json()).id;
    const seller = await db.seller.findUniqueOrThrow({ where: { id: variant.product.sellerId } });
    const sellerToken = randomBytes(32).toString("base64url");
    const session = await db.session.create({ data: { userId: seller.userId, tokenHash: createHash("sha256").update(sellerToken).digest("hex"), expiresAt: new Date(Date.now() + 60000) } });
    sellerSessionId = session.id;
    const decided = await call(`seller/returns/${returnId}/decision`, "PATCH", { status: "SELLER_APPROVED", reason: "Eligible for manual review" }, `ggh_session=${sellerToken}`);
    assert.equal(decided.status, 200);
    assert.equal((await call(`admin/returns/${returnId}/status`, "PATCH", { status: "ADMIN_REVIEW", reason: "Review started" }, adminCookie)).status, 200);
    assert.equal((await call(`admin/returns/${returnId}/status`, "PATCH", { status: "REFUND_PENDING", reason: "Waiting for payment policy" }, adminCookie)).status, 200);
    const submitted = await call("buyer/reviews", "POST", input, buyerCookie);
    assert.equal(submitted.status, 201); reviewId = (await submitted.json()).id;
    assert.equal((await (await call(`catalog/products/${variant.product.slug}/reviews`)).json()).length, 0, "Pending review is private");
    assert.equal((await call(`admin/reviews/${reviewId}/status`, "PATCH", { status: "APPROVED" }, adminCookie)).status, 200);
    assert.equal((await (await call(`catalog/products/${variant.product.slug}/reviews`)).json()).length, 1, "Approved review is public");
    console.log("Delivered-order review and moderation checks passed");
  } finally {
    if (reviewId) await db.review.delete({ where: { id: reviewId } });
    if (returnId) await db.returnRequest.delete({ where: { id: returnId } });
    if (sellerSessionId) await db.session.delete({ where: { id: sellerSessionId } });
    if (orderId) { await db.orderItem.deleteMany({ where: { sellerOrder: { orderId } } }); await db.sellerOrder.deleteMany({ where: { orderId } }); await db.order.delete({ where: { id: orderId } }); }
    if (buyerId) await db.address.deleteMany({ where: { userId: buyerId } });
    const ids = [buyerId, adminId].filter((id): id is string => Boolean(id));
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { entity: "return_request", entityId: returnId ?? "" } });
    await db.session.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
}
void main();
