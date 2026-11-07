import { BadRequestException, Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import { ContentKind } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

@Controller("cms")
export class CmsController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private kind(value: string): ContentKind {
    const kind = value.toUpperCase() as ContentKind;
    if (!Object.values(ContentKind).includes(kind)) throw new BadRequestException("Invalid content type");
    return kind;
  }

  @Get("site-sections")
  async allSiteSections() { const rows = await this.db.homepageSection.findMany({ where: { publishedAt: { not: null } }, select: { pageKey: true, key: true, published: true, position: true } }); return rows.filter(row => (row.published as Record<string, unknown>).enabled !== false); }

  @Get("homepage/sections")
  async homepageSections() { return this.db.homepageSection.findMany({ where: { pageKey: "home", publishedAt: { not: null } }, select: { key: true, published: true, position: true }, orderBy: { position: "asc" } }).then(rows => rows.filter(row => (row.published as Record<string, unknown>).enabled !== false).sort((a, b) => Number((a.published as Record<string, unknown>).position ?? a.position) - Number((b.published as Record<string, unknown>).position ?? b.position))); }

  @Get(":kind")
  async list(@Param("kind") rawKind: string) {
    const entries = await this.db.contentEntry.findMany({ where: { kind: this.kind(rawKind), published: true }, orderBy: { updatedAt: "desc" }, take: 100 });
    return entries.map(item => item.publishedSnapshot ?? { kind: item.kind, slug: item.slug, title: item.title, imageUrl: item.imageUrl, metaTitle: item.metaTitle, metaDescription: item.metaDescription, updatedAt: item.updatedAt });
  }

  @Get(":kind/:slug")
  async one(@Param("kind") rawKind: string, @Param("slug") slug: string) {
    const item = await this.db.contentEntry.findFirst({ where: { kind: this.kind(rawKind), publishedSlug: slug, published: true } });
    if (!item?.published) throw new NotFoundException("Content unavailable");
    return item.publishedSnapshot ?? item;
  }
}
