import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { SellerController } from "./seller.controller";

@Module({ imports: [DatabaseModule, AuthModule], controllers: [SellerController] })
export class SellersModule {}
