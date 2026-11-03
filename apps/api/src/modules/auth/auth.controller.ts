import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Res, UnauthorizedException } from "@nestjs/common";
import { z } from "zod";
import type { Response } from "express";
import { AuthService, SESSION_COOKIE } from "./auth.service";

const email = z.email().max(320);
const password = z.string().min(10).max(128);
const registerSchema = z.object({ name: z.string().trim().min(2).max(120), email, password });
const loginSchema = z.object({ email, password });

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  private setCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: expiresAt, path: "/", domain: process.env.COOKIE_DOMAIN || undefined });
  }

  @Post("register")
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid registration details" } });
    const session = await this.auth.register(parsed.data);
    this.setCookie(response, session.token, session.expiresAt);
    return { ok: true, role: session.role };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid sign in details" } });
    const session = await this.auth.login(parsed.data);
    this.setCookie(response, session.token, session.expiresAt);
    return { ok: true, role: session.role };
  }

  @Post("register-seller")
  async registerSeller(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const parsed = registerSchema.extend({ shopName: z.string().trim().min(2).max(160) }).safeParse(body);
    if (!parsed.success) return response.status(400).json({ error: { message: "Enter valid seller registration details" } });
    const session = await this.auth.registerSeller(parsed.data);
    this.setCookie(response, session.token, session.expiresAt);
    return { ok: true, role: session.role };
  }

  private async googleIdentity(body: unknown) {
    const parsed = z.object({ idToken: z.string().min(100).max(10000) }).safeParse(body);
    if (!parsed.success || !process.env.GOOGLE_CLIENT_ID) throw new UnauthorizedException("Google sign in unavailable");
    const verification = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.idToken)}`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!verification?.ok) throw new UnauthorizedException("Invalid Google token");
    const claims = await verification.json() as { aud?: string; iss?: string; sub?: string; email?: string; email_verified?: string; name?: string; picture?: string };
    if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss ?? "") || claims.email_verified !== "true" || !claims.sub || !claims.email) throw new UnauthorizedException("Invalid Google identity");
    const picture = claims.picture && /^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com\//i.test(claims.picture) ? claims.picture : undefined;
    return { sub: claims.sub!, email: claims.email!, name: claims.name || claims.email!.split("@")[0] || "Google user", picture };
  }

  @Post("google")
  @HttpCode(200)
  async google(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.googleLogin(await this.googleIdentity(body));
    this.setCookie(response, session.token, session.expiresAt);
    return { ok: true, role: session.role };
  }

  @Post("google/link")
  @HttpCode(200)
  async linkGoogle(@Headers("cookie") cookie: string | undefined, @Body() body: unknown) {
    return this.auth.linkGoogle(cookie, await this.googleIdentity(body));
  }

  @Get("me")
  async me(@Headers("cookie") cookie?: string) {
    const user = await this.auth.userFromCookie(cookie);
    const seller = user.role === "SELLER" ? await this.auth.sellerStatus(user.id) : null;
    return { id: user.id, email: user.email, name: user.name, role: user.role, sellerStatus: seller };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Headers("cookie") cookie: string | undefined, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(cookie);
    response.clearCookie(SESSION_COOKIE, { path: "/", domain: process.env.COOKIE_DOMAIN || undefined });
    return { ok: true };
  }
}
