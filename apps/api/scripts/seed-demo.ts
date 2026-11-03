import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { products } from "../../web/src/features/buyer/data/demo-data";
import { demoServiceablePincodes } from "../../web/src/features/buyer/data/store-catalog";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production");
  const configuredSellerEmail = process.env.DEMO_SELLER_EMAIL?.toLowerCase();
  const configuredSellerPassword = process.env.DEMO_SELLER_PASSWORD;
  const customSeller = Boolean(configuredSellerEmail && configuredSellerPassword && !configuredSellerEmail.endsWith("@example.com") && !configuredSellerPassword.startsWith("replace-with"));
  if (customSeller && configuredSellerPassword!.length < 12) throw new Error("Demo seller password must be at least 12 characters");
  const sellerEmail = customSeller ? configuredSellerEmail! : "demo-seller@local.invalid";
  const sellerPassword = customSeller ? configuredSellerPassword! : randomBytes(32).toString("base64url");
  const adminEmail = process.env.DEMO_ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const customAdmin = Boolean(adminEmail && adminPassword && !adminEmail.endsWith("@example.com") && !adminPassword.startsWith("replace-with"));
  if (customAdmin && adminPassword!.length < 12) throw new Error("Demo admin password must be at least 12 characters");
  const db = new PrismaClient();
  try {
    const sellerUser = await db.user.upsert({ where: { email: sellerEmail }, create: { email: sellerEmail, name: "Demo Seller", role: "SELLER", passwordHash: await argon2.hash(sellerPassword) }, update: {} });
    const seller = await db.seller.upsert({ where: { userId: sellerUser.id }, create: { userId: sellerUser.id, shopName: "Go Gather Hub Demo", status: "APPROVED" }, update: {} });
    if (customAdmin) await db.user.upsert({ where: { email: adminEmail! }, create: { email: adminEmail!, name: "Demo Admin", role: "ADMIN", passwordHash: await argon2.hash(adminPassword!) }, update: {} });
    for (const pincode of demoServiceablePincodes) await db.servicePincode.upsert({ where: { pincode }, create: { pincode, active: true, cod: true, shippingFee: "0.00", codFee: "0.00" }, update: {} });
    const categories = new Map<string, string>();
    for (const name of new Set(products.map(product => product.category))) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const category = await db.category.upsert({ where: { slug }, create: { slug, name }, update: {} });
      categories.set(name, category.id);
    }
    for (const product of products) {
      const created = await db.product.upsert({ where: { slug: product.id }, create: { slug: product.id, name: product.name, description: product.description, imageUrl: product.image, sellerId: seller.id, categoryId: categories.get(product.category)!, status: "ACTIVE" }, update: {} });
      await db.variant.upsert({ where: { sku: `DEMO-${product.id}` }, create: { sku: `DEMO-${product.id}`, label: "Standard", productId: created.id, price: product.price.toFixed(2), compareAt: product.compareAt.toFixed(2), stock: 10000 }, update: {} });
    }
    console.info(`Seeded ${products.length} demo products and ${demoServiceablePincodes.size} serviceable pincodes.`);
  } finally { await db.$disconnect(); }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
