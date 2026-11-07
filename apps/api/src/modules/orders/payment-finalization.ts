import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

/** Consume only purchased units from lines that were not edited after checkout. */
export async function consumeOrderCart(tx: Prisma.TransactionClient, order: { id: string; buyerId: string; createdAt: Date }) {
  const items = await tx.orderItem.groupBy({ by: ["variantId"], where: { sellerOrder: { orderId: order.id } }, _sum: { quantity: true } });
  for (const item of items) {
    const line = await tx.cartItem.findUnique({ where: { userId_variantId: { userId: order.buyerId, variantId: item.variantId } } });
    if (!line || line.updatedAt > order.createdAt) continue;
    const quantity = item._sum.quantity ?? 0;
    const where = { id: line.id, quantity: line.quantity, updatedAt: line.updatedAt };
    if (line.quantity <= quantity) await tx.cartItem.deleteMany({ where });
    else await tx.cartItem.updateMany({ where, data: { quantity: { decrement: quantity } } });
  }
}

/** The caller must first verify the provider signature, captured amount, currency and order ID. */
export async function finalizeCapturedPayment(db: PrismaService, orderId: string, buyerId: string, paymentId: string, source: string) {
  return db.$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id: orderId, buyerId, paymentMethod: "ONLINE" } });
    if (!order) throw new ConflictException("Payment order unavailable");
    if (order.paymentStatus === "PAID") {
      if (order.razorpayPaymentId !== paymentId) throw new ConflictException("A different payment is already recorded; contact support");
      return order;
    }
    const changed = await tx.order.updateMany({ where: { id: orderId, buyerId, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, data: { status: "PLACED", paymentStatus: "PAID", razorpayPaymentId: paymentId, paymentExpiresAt: null } });
    if (!changed.count) throw new ConflictException("Payment state changed; contact support for payment reconciliation");
    await consumeOrderCart(tx, order);
    await tx.auditLog.create({ data: { actorId: buyerId, action: source, entity: "order", entityId: orderId } });
    return { ...order, status: "PLACED", paymentStatus: "PAID", razorpayPaymentId: paymentId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
