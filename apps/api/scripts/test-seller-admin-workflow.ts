import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();
const base = process.env.API_TEST_URL ?? "http://localhost:4000";
const suffix = randomBytes(7).toString("hex");
const password = randomBytes(24).toString("base64url");
const userIds: string[] = [];
let productId: string | undefined;
let importedId: string | undefined;
let categoryId: string | undefined;
let contentId: string | undefined;
let staffRoleId: string | undefined;
async function call(path: string, method = "GET", body?: object, cookie?: string) {
  return fetch(`${base}/v1/${path}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
async function account(role: Role, name: string) {
  const email = `${name}-${suffix}@example.invalid`;
  const user = await db.user.create({ data: { name, email, role, passwordHash: await argon2.hash(password) } });
  userIds.push(user.id);
  if (role === Role.SELLER) await db.seller.create({ data: { userId: user.id, shopName: name, status: "APPROVED" } });
  const response = await call("auth/login", "POST", { email, password });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return { user, cookie };
}
async function main() {
  try {
    const category = await db.category.findFirst();
    assert.ok(category, "Development categories are seeded");
    const owner = await account(Role.SELLER, "owner");
    assert.equal((await call("seller/shop", "PATCH", { gstin: "22AAAAA0000A1Z5", currentPassword: "wrong" }, owner.cookie)).status, 400, "Sensitive shop update requires password");
    const shopUpdated = await call("seller/shop", "PATCH", { businessName: "Workflow Business", gstin: "22AAAAA0000A1Z5", bankHolderName: "Workflow Owner", bankIfsc: "ABCD0123456", bankAccountNumber: "123456789012", currentPassword: password }, owner.cookie);
    assert.equal(shopUpdated.status, 200);
    const shop = await shopUpdated.json();
    assert.equal(shop.gstStatus, "UNVERIFIED");
    assert.equal(shop.bankStatus, "UNVERIFIED");
    assert.equal(shop.bankAccountLast4, "9012");
    assert.ok(!JSON.stringify(shop).includes("123456789012"), "Full bank account is not returned");
    const other = await account(Role.SELLER, "other");
    const admin = await account(Role.ADMIN, "admin");
    const roleCreated = await call("admin/roles", "POST", { name: `Catalog reader ${suffix}`, permissions: ["catalog.read"] }, admin.cookie);
    assert.equal(roleCreated.status, 201);
    staffRoleId = (await roleCreated.json()).id;
    const staffEmail = `staff-${suffix}@example.invalid`;
    const staffCreated = await call("admin/staff", "POST", { name: "Limited Staff", email: staffEmail, password, roleId: staffRoleId }, admin.cookie);
    assert.equal(staffCreated.status, 201);
    userIds.push((await staffCreated.json()).id);
    const staffLogin = await call("auth/login", "POST", { email: staffEmail, password });
    assert.equal(staffLogin.status, 200);
    const staffCookie = staffLogin.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await call("admin/products", "GET", undefined, staffCookie)).status, 200, "Staff can read permitted module");
    assert.equal((await call("admin/buyers", "GET", undefined, staffCookie)).status, 403, "Staff cannot read other module");
    assert.equal((await call("admin/roles", "GET", undefined, staffCookie)).status, 403, "Staff cannot manage roles");
    const categoryCreated = await call("admin/categories", "POST", { name: "Workflow Category", slug: `workflow-category-${suffix}` }, admin.cookie);
    assert.equal(categoryCreated.status, 201);
    categoryId = (await categoryCreated.json()).id;
    assert.equal((await call(`admin/categories/${categoryId}`, "PATCH", { name: "Updated Workflow Category" }, admin.cookie)).status, 200);
    const contentCreated = await call("admin/cms", "POST", { kind: "PAGE", title: "Workflow Page", slug: `workflow-page-${suffix}`, body: "A test page that starts as a draft.", published: false }, admin.cookie);
    assert.equal(contentCreated.status, 201);
    contentId = (await contentCreated.json()).id;
    assert.equal((await call(`cms/page/workflow-page-${suffix}`)).status, 404, "Draft is private");
    assert.equal((await call(`admin/cms/${contentId}`, "PATCH", { published: true }, admin.cookie)).status, 200);
    assert.equal((await call(`cms/page/workflow-page-${suffix}`)).status, 200, "Published content is public");
    const created = await call("seller/products", "POST", { categoryId: category.id, name: "Workflow Product", slug: `workflow-product-${suffix}`, description: "Product used only for an ownership test", variants: [{ sku: `WF-${suffix}`, label: "Standard", price: "99.00", stock: 4 }] }, owner.cookie);
    assert.equal(created.status, 201);
    const product = await created.json(); productId = product.id;
    const imageUrl = "https://res.cloudinary.com/test-cloud/image/upload/v1/workflow-image.jpg";
    assert.equal((await call(`admin/products/${productId}/image`, "PATCH", { imageUrl }, admin.cookie)).status, 200, "Admin can attach a Cloudinary image");
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: productId } })).imageUrl, imageUrl);
    assert.equal((await call(`admin/products/${productId}/image`, "PATCH", { imageUrl }, staffCookie)).status, 403, "Read-only staff cannot attach images");
    assert.equal((await call(`admin/products/${productId}/status`, "PATCH", { status: "ACTIVE" }, admin.cookie)).status, 200);
    assert.equal((await call(`catalog/products/${product.slug}`)).status, 200);
    assert.equal((await call("seller/shop", "PATCH", { isOpen: false }, owner.cookie)).status, 200);
    assert.equal((await call(`catalog/products/${product.slug}`)).status, 400, "Closed shop is hidden from public catalog");
    assert.equal((await call("seller/shop", "PATCH", { isOpen: true }, owner.cookie)).status, 200);
    assert.equal((await call(`admin/products/${productId}/status`, "PATCH", { status: "ACTIVE" }, staffCookie)).status, 403, "Read-only staff cannot approve product");
    const stockUpdate = await call(`seller/inventory/${product.variants[0].id}`, "PATCH", { stock: 5 }, owner.cookie);
    assert.equal(stockUpdate.status, 200);
    assert.equal((await db.inventoryMovement.findFirstOrThrow({ where: { variantId: product.variants[0].id } })).delta, 1);
    assert.equal((await call(`seller/products/${productId}`, "PATCH", { name: "Stolen Product" }, other.cookie)).status, 400, "Other seller cannot edit product");
    assert.equal((await call(`seller/products/${productId}/variants/${product.variants[0].id}`, "PATCH", { price: "1.00" }, other.cookie)).status, 400, "Other seller cannot edit variant");
    const rejected = await call(`admin/products/${productId}/status`, "PATCH", { status: "REJECTED", reason: "Needs clearer description" }, admin.cookie);
    assert.equal(rejected.status, 200);
    assert.equal((await rejected.json()).reviewReason, "Needs clearer description");
    assert.equal((await call(`seller/products/${productId}/variants/${product.variants[0].id}`, "PATCH", { price: "89.00" }, owner.cookie)).status, 200);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: productId } })).status, "PENDING", "Price edit returns product to review queue");
    assert.equal((await call(`seller/products/${productId}`, "DELETE", undefined, other.cookie)).status, 400, "Other seller cannot archive product");
    assert.equal((await call(`seller/products/${productId}`, "DELETE", undefined, owner.cookie)).status, 200);
    const csv = `categoryId,name,slug,description,sku,label,price,stock\n${category.id},Imported Product,imported-${suffix},Imported workflow test product,IMP-${suffix},Standard,120.00,3`;
    const preview = await call("seller/products/import/preview", "POST", { csv }, owner.cookie);
    assert.equal(preview.status, 201);
    assert.equal((await preview.json()).validCount, 1);
    const duplicatePreview = await call("seller/products/import/preview", "POST", { csv: `${csv}\n${csv.split("\n")[1]}` }, owner.cookie);
    assert.equal((await duplicatePreview.json()).validCount, 1, "Duplicate SKU row is reported");
    const imported = await call("seller/products/import", "POST", { csv }, owner.cookie);
    assert.equal(imported.status, 201);
    importedId = (await imported.json()).products[0].id;
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: importedId } })).status, "PENDING");
    assert.equal((await call(`admin/categories/${categoryId}`, "DELETE", undefined, admin.cookie)).status, 200);
    categoryId = undefined;
    assert.equal((await call(`admin/cms/${contentId}`, "DELETE", undefined, admin.cookie)).status, 200);
    contentId = undefined;
    console.log("Seller/admin ownership and moderation checks passed");
  } finally {
    if (importedId) { await db.variant.deleteMany({ where: { productId: importedId } }); await db.product.delete({ where: { id: importedId } }); }
    if (categoryId) await db.category.delete({ where: { id: categoryId } });
    if (contentId) await db.contentEntry.delete({ where: { id: contentId } });
    if (productId) {
      await db.inventoryMovement.deleteMany({ where: { variant: { productId } } });
      await db.variant.deleteMany({ where: { productId } });
      await db.product.delete({ where: { id: productId } });
    }
    await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.seller.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    if (staffRoleId) await db.staffRole.delete({ where: { id: staffRoleId } });
    await db.$disconnect();
  }
}
void main();
