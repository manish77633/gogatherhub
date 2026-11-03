import { backendCookie, requestTab, tabUrl, tabSessionsEnabled } from "@/lib/tab-session";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export async function GET(request: NextRequest) {
  const tab = requestTab(request);
  if (tabSessionsEnabled() && !tab) return NextResponse.redirect(new URL("/shop/login", request.url));
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(tabUrl("/shop/login?error=google-unavailable", request.url, tab));
  const link = request.nextUrl.searchParams.get("link") === "1";
  if (link) {
    const session = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/me`, { headers: { cookie: backendCookie(request) }, cache: "no-store", signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!session?.ok) return NextResponse.redirect(tabUrl("/shop/login?next=%2Fshop%2Faccount%2Fprofile", request.url, tab));
  }
  const state = randomBytes(32).toString("base64url");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next && /^\/(shop|seller|admin)(\/|$)/.test(next) && !next.includes("\\") && !next.includes("//") ? next : "";
  const callback = new URL("/api/auth/google/callback", request.nextUrl.origin);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callback.toString());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(url);
  const context = Buffer.from(JSON.stringify({ state, tab, next: safeNext, link })).toString("base64url");
  response.cookies.set(`ggh_oauth_${state}`, context, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  return response;
}
