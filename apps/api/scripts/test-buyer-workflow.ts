import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const base = process.env.API_TEST_URL ?? "http://localhost:4000";
const email = `workflow-${randomBytes(8).toString("hex")}@example.invalid`;
let userId: string | undefined;
let orderId: string | undefined;
let couponId: string | undefined;
async function call(path: string, method = "GET", body?: object, cookie?: string) {
  return fetch(`${base}/v1/${path}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
async function main() {
try {
  const denied = await call("buyer/orders");
  assert.equal(denied.status, 401, "Order history requires login");
  const registered = await call("auth/register", "POST", { name: "Workflow Test", email, password: randomBytes(24).toString("base64url") });
  assert.equal(registered.status, 201, "Buyer registration succeeds");
  const cookie = registered.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("ggh_session="), "Session cookie issued");
  if (process.env.WEB_TEST_URL) for (const path of ["/shop/account", "/shop/account/orders", "/shop/account/addresses", "/shop/account/wishlist", "/shop/account/returns", "/shop/account/profile", "/shop/account/coupons", "/shop/account/payments", "/shop/account/notifications", "/shop/account/support"]) {
    const page = await fetch(`${process.env.WEB_TEST_URL}${path}`, { headers: { cookie }, redirect: "manual" });
    assert.equal(page.status, 200, `${path} renders for the signed-in buyer`);
  }
  const profile = await call("buyer/profile", "GET", undefined, cookie);
  assert.equal(profile.status, 200);
  userId = (await profile.json()).id;
  const updated = await call("buyer/profile", "PATCH", { name: "Updated Buyer" }, cookie);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).name, "Updated Buyer");
  const ticket = await call("buyer/support", "POST", { subject: "Order question", message: "Please help with a sample order." }, cookie);
  assert.equal(ticket.status, 201);
  assert.equal((await call("buyer/support", "GET", undefined, cookie)).status, 200);
  assert.deepEqual(await (await call("buyer/orders", "GET", undefined, cookie)).json(), []);
  assert.equal((await call("admin/overview", "GET", undefined, cookie)).status, 403, "Buyer cannot access admin data");
  const variant = await db.variant.findFirst({ where: { active: true, stock: { gt: 1 }, product: { status: "ACTIVE", seller: { status: "APPROVED" } } } });
  const pincode = await db.servicePincode.findFirst({ where: { active: true, cod: true } });
  assert.ok(variant && pincode, "Development catalog and COD pincode are seeded");
  const product = await db.product.findUniqueOrThrow({ where: { id: variant.productId } });
  assert.equal((await call(`buyer/wishlist/${product.slug}`, "POST", undefined, cookie)).status, 201);
  const wishlist = await call("buyer/wishlist", "GET", undefined, cookie);
  assert.equal((await wishlist.json()).length, 1, "Wishlist persists");
  assert.equal((await call(`buyer/recently-viewed/${product.slug}`, "POST", undefined, cookie)).status, 201);
  assert.equal((await (await call("buyer/recently-viewed", "GET", undefined, cookie)).json()).length, 1);
  assert.equal((await call(`buyer/wishlist/${product.slug}`, "DELETE", undefined, cookie)).status, 200);
  const initialStock = variant.stock;
  const mergedCart = await call("buyer/cart/merge", "POST", { items: [{ variantId: variant.id, quantity: 1 }] }, cookie);
  assert.equal(mergedCart.status, 201, "Guest cart merges into account");
  const mergedCartData=await mergedCart.json();
  assert.equal(mergedCartData.items.length, 1);
  const savedCart = await call("buyer/cart", "PUT", { revision: mergedCartData.revision, items: [{ variantId: variant.id, quantity: 1 }] }, cookie);
  assert.equal(savedCart.status, 200, "Cart persists in database");
  const address = await call("buyer/addresses", "POST", { fullName: "Workflow Test", phone: "9999999999", line1: "123 Example Street", city: "Mumbai", state: "Maharashtra", pincode: pincode.pincode }, cookie);
  assert.equal(address.status, 201);
  const addressId = (await address.json()).id;
  const savedAddress = await call("buyer/addresses", "GET", undefined, cookie);
  assert.equal((await savedAddress.json())[0].isDefault, true, "First address becomes default");
  const validAddress = { fullName: "Workflow Test", phone: "9999999999", line1: "123 Example Street", city: "Mumbai", state: "Maharashtra", pincode: pincode.pincode };
  for (const invalid of [{ phone: "12345" }, { pincode: "000000" }, { fullName: "1" }, { line1: "x" }, { city: "1" }, { state: "1" }]) {
    const rejected = await call("buyer/addresses", "POST", { ...validAddress, ...invalid }, cookie);
    assert.equal(rejected.status, 400, `Invalid address ${Object.keys(invalid)[0]} is rejected`);
  }
  const second = await call("buyer/addresses", "POST", { ...validAddress, line1: "456 Example Street" }, cookie);
  assert.equal(second.status, 201, "Second address added");
  const secondId = (await second.json()).id;
  assert.equal((await call(`buyer/addresses/${secondId}/default`, "PATCH", undefined, cookie)).status, 200, "Default address changed");
  assert.equal((await call(`buyer/addresses/${secondId}`, "DELETE", undefined, cookie)).status, 200, "Unused address deleted");
  assert.equal((await (await call("buyer/addresses", "GET", undefined, cookie)).json())[0].isDefault, true, "Remaining address becomes default");
  const editedAddress = await call(`buyer/addresses/${addressId}`, "PATCH", { fullName: "Workflow Test", phone: "9999999999", line1: "124 Example Street", city: "Mumbai", state: "Maharashtra", pincode: pincode.pincode }, cookie);
  assert.equal(editedAddress.status, 200, "Buyer can edit an unused address");
  assert.equal((await editedAddress.json()).line1, "124 Example Street");
  assert.equal((await call("buyer/coupons", "GET", undefined, cookie)).status, 200, "Buyer can list available coupons");
  const payload = { addressId, idempotencyKey: randomBytes(24).toString("hex"), paymentMethod: "COD", items: [{ variantId: variant.id, quantity: 1 }] };
  const quoted = await call("buyer/orders/quote", "POST", { addressId, paymentMethod: "COD", items: payload.items }, cookie);
  assert.equal(quoted.status, 201, "Checkout quote is available before placing an order");
  const quote = await quoted.json();
  assert.equal(Number(quote.subtotal), Number(variant.price));
  assert.equal(Number(quote.total), Number(variant.price) + Number(pincode.shippingFee) + Number(pincode.codFee));
  const coupon = await db.coupon.create({ data: { code: `TEST${randomBytes(6).toString("hex").toUpperCase()}`, discountAmount: 10, minSubtotal: 0, startsAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 60_000) } });
  couponId = coupon.id;
  const discounted = await call("buyer/orders/quote", "POST", { addressId, paymentMethod: "COD", couponCode: coupon.code, items: payload.items }, cookie);
  assert.equal(discounted.status, 201, "Coupon quote succeeds");
  const discountedQuote = await discounted.json();
  assert.equal(Number(discountedQuote.discount), Math.min(10, Number(variant.price)));
  assert.equal(Number(discountedQuote.total), Number(quote.total) - Number(discountedQuote.discount));
  const onlineQuote = await call("buyer/orders/quote", "POST", { addressId, paymentMethod: "ONLINE", couponCode: coupon.code, items: payload.items }, cookie);
  assert.equal(onlineQuote.status, 201, "Online payment quote succeeds");
  const onlineAmount = await onlineQuote.json();
  assert.equal(Number(onlineAmount.codFee), 0);
  assert.equal(Number(onlineAmount.total), Number(variant.price) - Number(discountedQuote.discount) + Number(pincode.shippingFee));
  const placed = await call("buyer/orders", "POST", payload, cookie);
  assert.equal(placed.status, 201, "COD order placed");
  const placedOrder = await placed.json();
  assert.match(placedOrder.orderNumber, /^GGH-\d{9}$/, "Order number stays compact");
  orderId = placedOrder.id;
  assert.equal((await call(`buyer/addresses/${addressId}`, "PATCH", { fullName: "Workflow Test", phone: "9999999999", line1: "125 Example Street", city: "Mumbai", state: "Maharashtra", pincode: pincode.pincode }, cookie)).status, 400, "Used order address cannot be changed");
  assert.equal(Number((await db.order.findUniqueOrThrow({ where: { id: orderId } })).total), Number(quote.total));
  assert.equal((await db.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock, initialStock - 1);
  assert.equal((await db.cartItem.count({ where: { userId } })), 0, "Purchased cart item cleared");
  const repeated = await call("buyer/orders", "POST", payload, cookie);
  assert.equal((await repeated.json()).id, orderId, "Checkout idempotency prevents duplicate order");
  const cancelled = await call(`buyer/orders/${orderId}/cancel`, "POST", { reason: "Workflow test cancellation" }, cookie);
  assert.equal(cancelled.status, 201, "COD order cancelled");
  assert.equal((await db.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock, initialStock, "Stock restored");
  assert.equal(await db.inventoryMovement.count({ where: { actorId: userId, variantId: variant.id } }), 2, "Order and cancellation stock movements recorded");
  const repeatedCancel = await call(`buyer/orders/${orderId}/cancel`, "POST", { reason: "Second cancellation" }, cookie);
  assert.equal(repeatedCancel.status, 400, "Duplicate cancellation rejected");
  console.log("Buyer workflow checks passed");
} finally {
  if (userId) {
    if (orderId) {
      await db.orderItem.deleteMany({ where: { sellerOrder: { orderId } } });
      await db.sellerOrder.deleteMany({ where: { orderId } });
      await db.order.delete({ where: { id: orderId } });
    }
    await db.address.deleteMany({ where: { userId } });
    await db.wishlistItem.deleteMany({ where: { userId } });
    await db.recentView.deleteMany({ where: { userId } });
    await db.supportTicket.deleteMany({ where: { userId } });
    await db.auditLog.deleteMany({ where: { actorId: userId } });
    await db.inventoryMovement.deleteMany({ where: { actorId: userId } });
    await db.user.delete({ where: { id: userId } });
  }
  if (couponId) await db.coupon.delete({ where: { id: couponId } });
  await db.$disconnect();
}
}
void main();
