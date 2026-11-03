import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminPermissionGuard } from "./admin-permission.guard";

@Module({ imports: [DatabaseModule, AuthModule], controllers: [AdminController], providers: [AdminPermissionGuard] })
export class AdminModule {}
