import { BadRequestException, Controller, Headers, HttpCode, Inject, Post, Req, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "../../database/prisma.service";
import { finalizeCapturedPayment } from "./payment-finalization";
import { fetchRazorpayPayment } from "./razorpay";

@Controller("payments/razorpay")
export class RazorpayWebhookController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Post("webhook")
  @HttpCode(200)
  async webhook(@Req() request: Request & { rawBody?: Buffer }, @Headers("x-razorpay-signature") signature?: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !request.rawBody || !signature || !/^[a-f0-9]{64}$/.test(signature)) throw new UnauthorizedException();
    const expected = createHmac("sha256", secret).update(request.rawBody).digest("hex");
    if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) throw new UnauthorizedException();
    const event = request.body as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    if (event.event !== "payment.captured") return { ok: true };
    const id = event.payload?.payment?.entity?.id;
    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    if (!id || !razorpayOrderId) throw new BadRequestException("Missing payment details");
    const order = await this.db.order.findUnique({ where: { razorpayOrderId } });
    if (!order || order.paymentMethod !== "ONLINE") return { ok: true };
    const payment = await fetchRazorpayPayment(id);
    if (payment.id !== id || payment.order_id !== razorpayOrderId || payment.status !== "captured" || payment.currency !== "INR" || payment.amount !== order.total.mul(100).toNumber()) throw new BadRequestException("Payment mismatch");
    await finalizeCapturedPayment(this.db, order.id, order.buyerId, id, "payment.captured.webhook");
    return { ok: true };
  }
}
