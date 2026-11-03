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

  @Get(":kind")
  async list(@Param("kind") rawKind: string) {
    return this.db.contentEntry.findMany({ where: { kind: this.kind(rawKind), published: true }, select: { kind: true, slug: true, title: true, imageUrl: true, metaTitle: true, metaDescription: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 100 });
  }

  @Get(":kind/:slug")
  async one(@Param("kind") rawKind: string, @Param("slug") slug: string) {
    const item = await this.db.contentEntry.findUnique({ where: { kind_slug: { kind: this.kind(rawKind), slug } } });
    if (!item?.published) throw new NotFoundException("Content unavailable");
    return item;
  }
}
