import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Add a useful two-level catalog to development data without replacing admin changes.
if (process.env.NODE_ENV === "production") throw new Error("Catalog seed is disabled in production");
const db = new PrismaClient();
const taxonomy: Record<string, Array<[string, string, RegExp]>> = {
  beauty: [["Skincare", "skincare", /serum|skin|cream|lotion/i]],
  cakes: [["Chocolate Cakes", "chocolate-cakes", /chocolate|truffle/i]],
  decor: [["Balloons", "balloons", /balloon/i], ["Candles", "candles", /candle/i]],
  electronics: [["Watches", "electronics-watches", /watch/i], ["Headphones", "headphones", /headphone|earphone/i]],
  fashion: [["Clothing", "clothing", /shirt|dress|kurta|top/i], ["Bags & Totes", "fashion-bags", /tote|bag/i]],
  flowers: [["Bouquets", "bouquets", /bouquet|rose/i], ["Floral Decor", "floral-decor", /floral|flower.*decor/i]],
  gifts: [["Gift Boxes", "gift-boxes", /gift box|gift pack/i], ["Toys", "toys", /toy|plush/i], ["Party Supplies", "party-supplies", /party supplies/i]],
  home: [["Furniture", "furniture", /chair|table|sofa/i], ["Lighting", "home-lighting", /lamp|light/i], ["Vases", "vases", /vase/i]],
  lifestyle: [["Watches", "lifestyle-watches", /watch/i]],
  puja: [["Diyas", "diyas", /diya/i], ["Incense", "incense", /incense/i], ["Puja Thalis", "puja-thalis", /thali/i]],
  treats: [["Chocolates", "chocolates", /chocolate/i]],
};

async function main() {
  const roots = await db.category.findMany({ where: { parentId: null }, select: { id: true, slug: true } });
  let created = 0, moved = 0;
  for (const root of roots) {
    for (const [name, slug, pattern] of taxonomy[root.slug] ?? []) {
      const existing = await db.category.findUnique({ where: { slug } });
      if (existing?.parentId && existing.parentId !== root.id) throw new Error(`Slug ${slug} belongs to another category`);
      const child = existing ?? await db.category.create({ data: { name, slug, parentId: root.id } });
      if (!existing) created++;
      const products = await db.product.findMany({ where: { categoryId: root.id, deletedAt: null }, select: { id: true, name: true } });
      const matches = products.filter(product => pattern.test(product.name)).map(product => product.id);
      if (matches.length) { const result = await db.product.updateMany({ where: { id: { in: matches }, categoryId: root.id }, data: { categoryId: child.id } }); moved += result.count; }
    }
  }
  const cakeRoot = roots.find(root => root.slug === "cakes");
  const chocolateCake = await db.category.findUnique({ where: { slug: "chocolate-cakes" } });
  if (cakeRoot && chocolateCake) {
    const giftsRoot = roots.find(root => root.slug === "gifts");
    if (giftsRoot) { const result = await db.product.updateMany({ where: { categoryId: giftsRoot.id, name: { contains: "cake", mode: "insensitive" }, deletedAt: null }, data: { categoryId: chocolateCake.id } }); moved += result.count; }
  }
  console.log(`Catalog ready: ${created} subcategories created, ${moved} products assigned.`);
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
