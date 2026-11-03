import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { CmsController } from "./cms.controller";
@Module({ imports: [DatabaseModule], controllers: [CmsController] })
export class CmsModule {}
