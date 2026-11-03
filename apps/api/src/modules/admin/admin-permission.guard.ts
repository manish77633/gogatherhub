import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../database/prisma.service";

const modules: Record<string, string> = {
  overview: "analytics", activity: "audit", sellers: "seller", products: "catalog", categories: "catalog",
  buyers: "buyer", orders: "order", returns: "return", coupons: "promotion", pincodes: "shipping", support: "support", cms: "content", reviews: "review",
};
@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(PrismaService) private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.auth.userFromCookie(request.headers.cookie);
    if (user.role === Role.ADMIN) return true;
    if (user.role !== Role.ADMIN_STAFF) throw new ForbiddenException();
    const section = request.path.split("/").filter(Boolean)[2];
    if (!section || section === "staff" || section === "roles") throw new ForbiddenException();
    const module = modules[section];
    const action = request.method === "GET" ? "read" : "write";
    if (!module || !user.staffRoleId) throw new ForbiddenException();
    const role = await this.db.staffRole.findUnique({ where: { id: user.staffRoleId } });
    if (!role?.permissions.includes(`${module}.${action}`)) throw new ForbiddenException();
    return true;
  }
}
