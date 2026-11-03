import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { SellersModule } from "./modules/sellers/sellers.module";
import { AdminModule } from "./modules/admin/admin.module";
import { CmsModule } from "./modules/cms/cms.module";

@Module({
  imports: [DatabaseModule, AuthModule, CatalogModule, OrdersModule, SellersModule, AdminModule, CmsModule],
})
export class AppModule {}
