import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Role } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";

export const SESSION_COOKIE = "ggh_session";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async sellerStatus(userId: string) {
    return (await this.db.seller.findUnique({ where: { userId }, select: { status: true } }))?.status ?? null;
  }

  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new BadRequestException("Email already registered");
    const user = await this.db.user.create({ data: { name: input.name.trim(), email, passwordHash: await argon2.hash(input.password) } });
    return { ...await this.createSession(user.id), role: Role.BUYER };
  }

  async registerSeller(input: { name: string; email: string; password: string; shopName: string }) {
    const email = input.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new BadRequestException("Email already registered");
    const passwordHash = await argon2.hash(input.password);
    const user = await this.db.user.create({ data: { name: input.name.trim(), email, passwordHash, role: Role.SELLER, seller: { create: { shopName: input.shopName.trim(), status: "PENDING" } } } });
    return { ...await this.createSession(user.id), role: Role.SELLER };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.db.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (!user || user.deletedAt || !await argon2.verify(user.passwordHash, input.password)) throw new UnauthorizedException("Invalid credentials");
    return { ...await this.createSession(user.id), role: user.role };
  }

  async googleLogin(input: { sub: string; email: string; name: string; picture?: string }) {
    const email = input.email.trim().toLowerCase();
    let user = await this.db.user.findUnique({ where: { googleSub: input.sub } });
    if (user?.deletedAt) throw new UnauthorizedException("Account unavailable");
    if (!user) {
      const existing = await this.db.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.deletedAt) throw new UnauthorizedException("Account unavailable");
        if (existing.googleSub && existing.googleSub !== input.sub) throw new UnauthorizedException("A different Google account is linked to this email");
        if (!existing.googleSub) {
          const linked = await this.db.user.updateMany({ where: { id: existing.id, googleSub: null, deletedAt: null }, data: { googleSub: input.sub } });
          if (!linked.count) throw new UnauthorizedException("Account changed. Please try again");
        }
        user = existing;
      } else {
        user = await this.db.user.create({ data: { email, name: input.name.slice(0, 120), googleSub: input.sub, passwordHash: await argon2.hash(randomBytes(32).toString("hex")) } });
      }
    }
    if (!user.avatarUrl && input.picture) await this.db.user.updateMany({ where: { id: user.id, avatarUrl: null }, data: { avatarUrl: input.picture } });
    return { ...await this.createSession(user.id), role: user.role };
  }

  async linkGoogle(cookieHeader: string | undefined, input: { sub: string; email: string; picture?: string }) {
    const user = await this.userFromCookie(cookieHeader);
    if (user.email !== input.email.trim().toLowerCase()) throw new ForbiddenException("Google email must match your account email");
    if (user.googleSub && user.googleSub !== input.sub) throw new BadRequestException("A different Google account is already linked");
    const linked = await this.db.user.findUnique({ where: { googleSub: input.sub }, select: { id: true } });
    if (linked && linked.id !== user.id) throw new BadRequestException("Google account is already linked elsewhere");
    await this.db.user.update({ where: { id: user.id }, data: { googleSub: input.sub } });
    if (input.picture) await this.db.user.updateMany({ where: { id: user.id, avatarUrl: null }, data: { avatarUrl: input.picture } });
    return { ok: true, role: user.role };
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.db.session.create({ data: { userId, tokenHash: hash(token), expiresAt } });
    return { token, expiresAt };
  }

  async userFromCookie(cookieHeader?: string) {
    const token = cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    if (!token) throw new UnauthorizedException();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException();
    const session = await this.db.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.deletedAt) throw new UnauthorizedException();
    return session.user;
  }

  async requireRole(cookieHeader: string | undefined, roles: Role[]) {
    const user = await this.userFromCookie(cookieHeader);
    if (!roles.includes(user.role)) throw new ForbiddenException();
    return user;
  }

  async logout(cookieHeader?: string) {
    const token = cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await this.db.session.updateMany({ where: { tokenHash: hash(token) }, data: { revokedAt: new Date() } });
  }
}
