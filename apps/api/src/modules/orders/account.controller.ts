import { createHash } from "node:crypto";
import { Body, Controller, Get, Headers, Inject, Param, Post, BadRequestException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";

@Controller("buyer")
export class AccountController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(AuthService) private readonly auth: AuthService) {}

  private async ticket(cookie: string | undefined, id: string) {
    const user = await this.auth.requireRole(cookie, [Role.BUYER, Role.ADMIN]);
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid ticket");
    const ticket = await this.db.supportTicket.findFirst({ where: { id, ...(user.role === Role.BUYER ? { userId: user.id } : {}) } });
    if (!ticket) throw new BadRequestException("Ticket unavailable");
    return { user, ticket };
  }
  @Get("support/:id/replies")
  async replies(@Headers("cookie") cookie: string | undefined, @Param("id") id: string) {
    await this.ticket(cookie, id);
    return this.db.supportReply.findMany({ where: { ticketId: id }, orderBy: { createdAt: "asc" }, take: 200 });
  }
  @Post("support/:id/replies")
  async reply(@Headers("cookie") cookie: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    const { user } = await this.ticket(cookie, id);
    const input = z.object({ message: z.string().trim().min(1).max(5000) }).safeParse(body);
    if (!input.success) throw new BadRequestException("Enter a reply of 1–5000 characters");
    return this.db.$transaction(async tx => {
      const reply = await tx.supportReply.create({ data: { ticketId: id, authorId: user.id, authorRole: user.role, message: input.data.message } });
      await tx.supportTicket.update({ where: { id }, data: { updatedAt: new Date(), ...(user.role === Role.BUYER ? { status: "OPEN" } : {}) } });
      return reply;
    });
  }
  @Get("notifications")
  async notifications(@Headers("cookie") cookie?: string) {
    const user = await this.auth.requireRole(cookie, [Role.BUYER]);
    const [orders, tickets, reads] = await Promise.all([
      this.db.order.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { sellerOrders: { select: { status: true } } } }),
      this.db.supportTicket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 100 }),
      this.db.notificationRead.findMany({ where: { userId: user.id } }),
    ]);
    const read = new Set(reads.map(row => row.notificationId));
    return [...orders.map(order => ({ id: `order:${order.id}:${createHash("sha256").update([order.status, order.paymentStatus, ...order.sellerOrders.map(s => s.status).sort()].join(":" )).digest("hex")}`, title: `Order ${order.orderNumber}`, detail: `${order.status} · ${order.paymentStatus}`, date: order.createdAt, href: `/shop/account/orders/${order.id}` })), ...tickets.map(ticket => ({ id: `support:${ticket.id}:${ticket.updatedAt.toISOString()}`, title: ticket.subject, detail: `Support: ${ticket.status}`, date: ticket.updatedAt, href: "/shop/account/support" }))].map(row => ({ ...row, read: read.has(row.id) })).sort((a,b) => +b.date - +a.date);
  }
  @Post("notifications/read")
  async read(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    const user = await this.auth.requireRole(cookie, [Role.BUYER]);
    const input = z.object({ ids: z.array(z.string().max(160)).max(200) }).safeParse(body);
    if (!input.success) throw new BadRequestException("Invalid notifications");
    const available = new Set((await this.notifications(cookie)).map(row => row.id));
    const ids = input.data.ids.filter(id => available.has(id));
    await this.db.notificationRead.createMany({ data: ids.map(notificationId => ({ userId: user.id, notificationId })), skipDuplicates: true });
    return { ok: true };
  }
}
