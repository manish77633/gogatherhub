import { BadRequestException, Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Get("categories")
  async categories() {
    const [categories, counts] = await Promise.all([
      this.db.category.findMany({ select: { id: true, name: true, slug: true, parentId: true, parent: { select: { name: true, slug: true } } }, orderBy: { name: "asc" }, take: 500 }),
      this.db.product.groupBy({ by: ["categoryId"], where: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true }, variants: { some: { active: true } } }, _count: { _all: true } }),
    ]);
    const byCategory = new Map(counts.map(row => [row.categoryId, row._count._all]));
    return categories.map(category => ({ ...category, productCount: (byCategory.get(category.id) ?? 0) + categories.filter(child => child.parentId === category.id).reduce((sum, child) => sum + (byCategory.get(child.id) ?? 0), 0) }));
  }

  @Get("price-range")
  async priceRange() {
    const prices = await this.db.variant.aggregate({ where: { active: true, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true } } }, _max: { price: true } });
    return { max: prices._max.price ?? 0 };
  }

  @Get("facets")
  async facets(@Query("category") category?: string) {
    const rows = await this.db.product.findMany({ where: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true }, variants: { some: { active: true } } }, select: { brand: true, tags: true, attributes: true, category: { select: { slug: true, parent: { select: { slug: true } } } }, seller: { select: { shopName: true } } }, take: 5000 });
    const categoryRows = category ? rows.filter(row => row.category.slug === category || row.category.parent?.slug === category) : [];
    const attributes = new Map<string, Set<string>>();
    for (const row of categoryRows) for (const [key, value] of Object.entries(row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes) ? row.attributes : {})) if (typeof value === "string" && key.length <= 40 && value.length <= 80) { if (!attributes.has(key)) attributes.set(key, new Set()); attributes.get(key)!.add(value); }
    return {
      brands: [...new Set(rows.map(row => row.brand?.trim()).filter((value): value is string => Boolean(value)))].sort(),
      sellers: [...new Set(rows.map(row => row.seller.shopName))].sort(),
      occasions: [...new Set(rows.flatMap(row => row.tags).filter(tag => /birthday|wedding|festival|diwali|puja|anniversary|housewarming/i.test(tag)))].sort(),
      attributes: [...attributes].filter(([, values]) => values.size > 0 && values.size <= 30).slice(0, 6).map(([name, values]) => ({ name, values: [...values].sort() })),
    };
  }

  @Get("products")
  async products(@Query("q") query?: string, @Query("category") category?: string | string[], @Query("collection") collection?: string, @Query("page") rawPage?: string, @Query("sort") sort?: string, @Query("available") available?: string, @Query("minPrice") rawMinPrice?: string, @Query("maxPrice") rawMaxPrice?: string, @Query("brand") brand?: string, @Query("seller") seller?: string, @Query("occasion") occasion?: string, @Query("rating") rawRating?: string, @Query("discount") rawDiscount?: string, @Query("attribute") attribute?: string) {
    const page = Number(rawPage ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new BadRequestException("Invalid page");
    const q = query?.trim().slice(0, 100);
    if (sort && !["newest", "name", "price-asc", "price-desc", "popular", "top-rated", "discount-desc"].includes(sort)) throw new BadRequestException("Invalid sort");
    if (available && available !== "1") throw new BadRequestException("Invalid availability filter");
    if ([brand, seller, occasion].some(value => value && (value.length > 160 || /[<>]/.test(value)))) throw new BadRequestException("Invalid filter");
    if (attribute && (attribute.length > 130 || !attribute.includes("|"))) throw new BadRequestException("Invalid attribute filter");
    const [attributeKey, attributeValue] = attribute?.split("|", 2) ?? [];
    const rating = rawRating ? Number(rawRating) : undefined;
    const discount = rawDiscount ? Number(rawDiscount) : undefined;
    if (rating !== undefined && (![3, 4, 5].includes(rating)) || discount !== undefined && (![10, 20, 30, 40, 50].includes(discount))) throw new BadRequestException("Invalid rating or discount filter");
    const categories = [...new Set((Array.isArray(category) ? category : category ? [category] : []).filter(Boolean))];
    if (categories.length > 30 || categories.some(value => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) throw new BadRequestException("Invalid categories");
    if (collection && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection)) throw new BadRequestException("Invalid collection");
    const collectionCategorySlugs: Record<string, string[]> = {
      "birthday-party": ["cakes", "flowers", "gifts", "decor", "treats"], wedding: ["flowers", "gifts", "decor"],
      "puja-festivals": ["puja", "decor", "treats"], "cakes-flowers": ["cakes", "flowers"], combos: ["combos"],
      "gifts-decor": ["gifts", "decor", "home"], "birthday-combos": ["combos"], "wedding-combos": ["combos"], "puja-combos": ["combos"],
      "cake-flowers": ["cakes", "flowers"], "cake-chocolates": ["cakes", "treats"], "gifts-decor-pairing": ["gifts", "decor"],
      cakes: ["cakes"], "chocolate-cakes": ["cakes"], "photo-cakes": ["cakes"], "eggless-cakes": ["cakes"], flowers: ["flowers"],
      "rose-bouquets": ["flowers"], "mixed-bouquets": ["flowers"], "flower-combos": ["flowers"], "balloons-decor": ["decor"], "party-supplies": ["decor"],
      chocolates: ["treats"], "personalized-gifts": ["gifts"], "kids-gifts": ["gifts"], "puja-samagri": ["puja"], "diyas-candles": ["puja"],
      "gift-hampers": ["gifts"], "festival-hampers": ["gifts"], "home-decor": ["home", "decor"], lanterns: ["decor"], "gift-boxes": ["gifts"],
      toys: ["gifts"], "home-essentials": ["home"], "first-birthday": ["cakes", "gifts", "decor"], "milestone-birthday": ["cakes", "gifts", "decor"],
      "surprise-party": ["cakes", "gifts", "decor"], invitations: ["gifts"], "table-styling": ["decor"], diwali: ["puja", "decor", "gifts"],
      "ganesh-chaturthi": ["puja", "decor"], navratri: ["puja", "decor"], housewarming: ["home", "decor", "gifts"], sweets: ["treats"],
    };
    const collectionRoots = collection ? collectionCategorySlugs[collection] : undefined;
    if (collection && !collectionRoots) throw new BadRequestException("Unknown collection");
    const collectionCategories = collectionRoots?.length ? await this.db.category.findMany({ where: { OR: collectionRoots.flatMap(slug => [{ slug }, { parent: { slug } }]) }, select: { slug: true } }) : [];
    const categorySlugs = [...new Set([...categories, ...collectionCategories.map(row => row.slug)])];
    if (rawMinPrice && !/^\d{1,8}(\.\d{1,2})?$/.test(rawMinPrice) || rawMaxPrice && !/^\d{1,8}(\.\d{1,2})?$/.test(rawMaxPrice)) throw new BadRequestException("Invalid price range");
    const minPrice = rawMinPrice ? new Prisma.Decimal(rawMinPrice) : undefined;
    const maxPrice = rawMaxPrice ? new Prisma.Decimal(rawMaxPrice) : undefined;
    if (minPrice && maxPrice && minPrice.gt(maxPrice)) throw new BadRequestException("Minimum price exceeds maximum price");
    const ratingIds = rating ? (await this.db.review.groupBy({ by: ["productId"], where: { status: "APPROVED" }, _avg: { rating: true }, having: { rating: { _avg: { gte: rating } } } })).map(row => row.productId) : undefined;
    const discountIds = discount ? (await this.db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT DISTINCT p.id FROM "Product" p JOIN "Variant" v ON v."productId" = p.id WHERE v.active = true AND v."compareAt" > 0 AND (v."compareAt" - v.price) * 100 >= v."compareAt" * ${discount}`)).map(row => row.id) : undefined;
    const attributeIds = attributeKey && attributeValue ? (await this.db.product.findMany({ where: { attributes: { path: [attributeKey], equals: attributeValue } }, select: { id: true } })).map(row => row.id) : undefined;
    const filteredIds = [ratingIds, discountIds, attributeIds].filter((ids): ids is string[] => Boolean(ids)).reduce<string[] | undefined>((current, ids) => current ? current.filter(id => ids.includes(id)) : ids, undefined);
    const where = {
      status: "ACTIVE" as const,
      deletedAt: null,
      seller: { status: "APPROVED" as const, isOpen: true },
      ...(brand ? { brand } : {}),
      ...(seller ? { seller: { status: "APPROVED" as const, isOpen: true, shopName: seller } } : {}),
      ...(occasion ? { tags: { has: occasion } } : {}),
      ...(filteredIds ? { id: { in: filteredIds } } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(categorySlugs.length ? { OR: [{ category: { slug: { in: categorySlugs } } }, { category: { parent: { slug: { in: categorySlugs } } } }] } : {}),
      variants: { some: { active: true, ...(available ? { stock: { gt: 0 } } : {}), ...(minPrice || maxPrice ? { price: { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) } } : {}) } },
    };
    const include = { variants: { where: { active: true } }, category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } }, seller: { select: { shopName: true } }, reviews: { where: { status: "APPROVED" as const }, select: { rating: true } } } as const;
    const totalTask = this.db.product.count({ where });
    void totalTask.catch(() => {});
    let items;
    if (["price-asc", "price-desc", "popular", "top-rated", "discount-desc"].includes(sort ?? "")) {
      const orderExpression = sort === "price-asc" ? Prisma.sql`MIN(v.price) ASC` : sort === "price-desc" ? Prisma.sql`MIN(v.price) DESC` : sort === "top-rated" ? Prisma.sql`(SELECT AVG(r.rating) FROM "Review" r WHERE r."productId" = p.id AND r.status = 'APPROVED') DESC NULLS LAST` : sort === "discount-desc" ? Prisma.sql`MAX(CASE WHEN v."compareAt" > v.price THEN (v."compareAt" - v.price) * 100 / v."compareAt" ELSE 0 END) DESC` : Prisma.sql`(SELECT COALESCE(SUM(oi.quantity), 0) FROM "OrderItem" oi JOIN "Variant" ov ON ov.id = oi."variantId" JOIN "SellerOrder" so ON so.id = oi."sellerOrderId" JOIN "Order" o ON o.id = so."orderId" AND o.status IN ('PLACED', 'FULFILLED') WHERE ov."productId" = p.id) DESC`;
      const ids = await this.db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT p.id FROM "Product" p
        JOIN "Seller" s ON s.id = p."sellerId" AND s.status = 'APPROVED' AND s."isOpen" = true
        JOIN "Category" c ON c.id = p."categoryId"
        JOIN "Variant" v ON v."productId" = p.id AND v.active = true
        WHERE p.status = 'ACTIVE' AND p."deletedAt" IS NULL
        ${q ? Prisma.sql`AND p.name ILIKE ${`%${q}%`}` : Prisma.empty}
        ${brand ? Prisma.sql`AND p.brand = ${brand}` : Prisma.empty}
        ${seller ? Prisma.sql`AND s."shopName" = ${seller}` : Prisma.empty}
        ${occasion ? Prisma.sql`AND ${occasion} = ANY(p.tags)` : Prisma.empty}
        ${ratingIds ? Prisma.sql`AND p.id::text IN (${Prisma.join(ratingIds.length ? ratingIds : ["00000000-0000-0000-0000-000000000000"])})` : Prisma.empty}
        ${discountIds ? Prisma.sql`AND p.id::text IN (${Prisma.join(discountIds.length ? discountIds : ["00000000-0000-0000-0000-000000000000"])})` : Prisma.empty}
        ${attributeIds ? Prisma.sql`AND p.id::text IN (${Prisma.join(attributeIds.length ? attributeIds : ["00000000-0000-0000-0000-000000000000"])})` : Prisma.empty}
        ${categorySlugs.length ? Prisma.sql`AND (c.slug IN (${Prisma.join(categorySlugs)}) OR c."parentId" IN (SELECT id FROM "Category" WHERE slug IN (${Prisma.join(categorySlugs)})))` : Prisma.empty}
        ${available ? Prisma.sql`AND v.stock > 0` : Prisma.empty}
        ${minPrice ? Prisma.sql`AND v.price >= ${minPrice}` : Prisma.empty}
        ${maxPrice ? Prisma.sql`AND v.price <= ${maxPrice}` : Prisma.empty}
        GROUP BY p.id ORDER BY ${orderExpression}, p.id ASC LIMIT 24 OFFSET ${(page - 1) * 24}
      `);
      const found = await this.db.product.findMany({ where: { id: { in: ids.map(row => row.id) } }, include });
      const positions = new Map(ids.map((row, index) => [row.id, index]));
      items = found.sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0));
    } else {
      items = await this.db.product.findMany({ where, include, skip: (page - 1) * 24, take: 24, orderBy: sort === "name" ? { name: "asc" } : { createdAt: "desc" } });
    }
    const total=await totalTask;
    return { items: items.map(({ reviews, ...product }) => ({ ...product, rating: reviews.length ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) : null, reviewCount: reviews.length })), page, pageSize: 24, total };
  }

  @Get("products/:slug")
  async product(@Param("slug") slug: string) {
    const item = await this.db.product.findFirst({ where: { slug, status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true } }, include: { variants: { where: { active: true } }, category: { include: { parent: true } }, seller: { select: { shopName: true } } } });
    if (!item) throw new BadRequestException("Product unavailable");
    return item;
  }

  @Get("products/:slug/reviews")
  async reviews(@Param("slug") slug: string) {
    return this.db.review.findMany({ where: { status: "APPROVED", product: { slug, status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED" } } }, select: { id: true, rating: true, title: true, body: true, createdAt: true, buyer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  @Get("delivery/:pincode")
  async delivery(@Param("pincode") pincode: string) {
    if (!/^\d{6}$/.test(pincode)) throw new BadRequestException("Enter a 6 digit pincode");
    const record = await this.db.servicePincode.findUnique({ where: { pincode } });
    return { pincode, available: Boolean(record?.active), cod: Boolean(record?.active && record.cod), shippingFee: record?.active ? record.shippingFee : null, codFee: record?.active && record.cod ? record.codFee : null };
  }

  @Get("coupons/:code")
  async coupon(@Param("code") code: string) {
    if (!/^[A-Z0-9_-]{3,40}$/i.test(code)) throw new BadRequestException("Invalid coupon code");
    const coupon = await this.db.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const now = new Date();
    if (!coupon?.active || coupon.startsAt > now || coupon.expiresAt < now || coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException("Coupon unavailable");
    return { sellerId: coupon.sellerId, code: coupon.code, discountAmount: coupon.discountAmount, minSubtotal: coupon.minSubtotal };
  }
}
