import { BadRequestException, Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Get("categories")
  async categories() {
    return this.db.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" }, take: 500 });
  }

  @Get("price-range")
  async priceRange() {
    const prices = await this.db.variant.aggregate({ where: { active: true, product: { status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true } } }, _max: { price: true } });
    return { max: prices._max.price ?? 0 };
  }

  @Get("products")
  async products(@Query("q") query?: string, @Query("category") category?: string | string[], @Query("page") rawPage?: string, @Query("sort") sort?: string, @Query("available") available?: string, @Query("minPrice") rawMinPrice?: string, @Query("maxPrice") rawMaxPrice?: string) {
    const page = Number(rawPage ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new BadRequestException("Invalid page");
    const q = query?.trim().slice(0, 100);
    if (sort && !["newest", "name", "price-asc", "price-desc"].includes(sort)) throw new BadRequestException("Invalid sort");
    if (available && available !== "1") throw new BadRequestException("Invalid availability filter");
    const categories = [...new Set((Array.isArray(category) ? category : category ? [category] : []).filter(Boolean))];
    if (categories.length > 30 || categories.some(value => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) throw new BadRequestException("Invalid categories");
    if (rawMinPrice && !/^\d{1,8}(\.\d{1,2})?$/.test(rawMinPrice) || rawMaxPrice && !/^\d{1,8}(\.\d{1,2})?$/.test(rawMaxPrice)) throw new BadRequestException("Invalid price range");
    const minPrice = rawMinPrice ? new Prisma.Decimal(rawMinPrice) : undefined;
    const maxPrice = rawMaxPrice ? new Prisma.Decimal(rawMaxPrice) : undefined;
    if (minPrice && maxPrice && minPrice.gt(maxPrice)) throw new BadRequestException("Minimum price exceeds maximum price");
    const where = {
      status: "ACTIVE" as const,
      deletedAt: null,
      seller: { status: "APPROVED" as const, isOpen: true },
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(categories.length ? { category: { slug: { in: categories } } } : {}),
      variants: { some: { active: true, ...(available ? { stock: { gt: 0 } } : {}), ...(minPrice || maxPrice ? { price: { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) } } : {}) } },
    };
    const include = { variants: { where: { active: true } }, category: { select: { name: true, slug: true } }, seller: { select: { shopName: true } } } as const;
    const total = await this.db.product.count({ where });
    let items;
    if (sort === "price-asc" || sort === "price-desc") {
      const direction = sort === "price-asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      const ids = await this.db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT p.id FROM "Product" p
        JOIN "Seller" s ON s.id = p."sellerId" AND s.status = 'APPROVED' AND s."isOpen" = true
        JOIN "Category" c ON c.id = p."categoryId"
        JOIN "Variant" v ON v."productId" = p.id AND v.active = true
        WHERE p.status = 'ACTIVE' AND p."deletedAt" IS NULL
        ${q ? Prisma.sql`AND p.name ILIKE ${`%${q}%`}` : Prisma.empty}
        ${categories.length ? Prisma.sql`AND c.slug IN (${Prisma.join(categories)})` : Prisma.empty}
        ${available ? Prisma.sql`AND v.stock > 0` : Prisma.empty}
        ${minPrice ? Prisma.sql`AND v.price >= ${minPrice}` : Prisma.empty}
        ${maxPrice ? Prisma.sql`AND v.price <= ${maxPrice}` : Prisma.empty}
        GROUP BY p.id ORDER BY MIN(v.price) ${direction}, p.id ASC LIMIT 24 OFFSET ${(page - 1) * 24}
      `);
      const found = await this.db.product.findMany({ where: { id: { in: ids.map(row => row.id) } }, include });
      const positions = new Map(ids.map((row, index) => [row.id, index]));
      items = found.sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0));
    } else {
      items = await this.db.product.findMany({ where, include, skip: (page - 1) * 24, take: 24, orderBy: sort === "name" ? { name: "asc" } : { createdAt: "desc" } });
    }
    return { items, page, pageSize: 24, total };
  }

  @Get("products/:slug")
  async product(@Param("slug") slug: string) {
    const item = await this.db.product.findFirst({ where: { slug, status: "ACTIVE", deletedAt: null, seller: { status: "APPROVED", isOpen: true } }, include: { variants: { where: { active: true } }, category: true, seller: { select: { shopName: true } } } });
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
    return { code: coupon.code, discountAmount: coupon.discountAmount, minSubtotal: coupon.minSubtotal };
  }
}
