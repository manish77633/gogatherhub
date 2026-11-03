import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CheckoutController } from "./checkout.controller";
import { RazorpayWebhookController } from "./razorpay-webhook.controller";

@Module({ imports: [DatabaseModule, AuthModule], controllers: [CheckoutController, RazorpayWebhookController] })
export class OrdersModule {}
