import { sessionCookie, scopeSessionCookie, tabUrl, validTab, tabSessionsEnabled } from "@/lib/tab-session";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export async function GET(request: NextRequest) {
  const received = request.nextUrl.searchParams.get("state");
  const cookieName = received && /^[A-Za-z0-9_-]{43}$/.test(received) ? `ggh_oauth_${received}` : "";
  let context: { state?: string; tab?: string; next?: string; link?: boolean } = {};
  try { context = JSON.parse(Buffer.from(request.cookies.get(cookieName)?.value ?? "", "base64url").toString()); } catch { /* Invalid/expired OAuth context. */ }
  const tab = validTab(context.tab) ? context.tab : undefined;
  const login = tabUrl("/shop/login", request.nextUrl.origin, tab);
  const fail = (reason: string) => { login.searchParams.set("error", reason); return NextResponse.redirect(login); };
  const expected = context.state;
  const code = request.nextUrl.searchParams.get("code");
  if (!expected || !received || expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received)) || !code || (tabSessionsEnabled() && !tab)) return fail("google-state");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google-unavailable");
  const callback = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: "authorization_code" }), cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!tokenResponse.ok) return fail("google-token");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return fail("google-token");
    const linking = context.link === true;
    const auth = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/google${linking ? "/link" : ""}`, { method: "POST", headers: { "content-type": "application/json", ...(linking ? { cookie: sessionCookie(request.headers.get("cookie") ?? "", tab) } : {}) }, body: JSON.stringify({ idToken: tokens.id_token }), cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!auth.ok) return fail(linking ? "google-link" : "google-auth");
    const result = await auth.json() as { role: string };
    const next = context.next;
    const destination = linking ? "/shop/account/profile?google=linked" : next && /^\/(shop|seller|admin)(\/|$)/.test(next) && !next.includes("\\") && !next.includes("//") ? next : result.role === "SELLER" ? "/seller" : ["ADMIN", "ADMIN_STAFF"].includes(result.role) ? "/admin" : "/shop/account";
    const target = tabUrl(destination, request.nextUrl.origin, tab);
    if (!linking && sessionCookie(request.headers.get("cookie") ?? "", tab)) target.searchParams.set("ggh_reset_commerce", "1");
    const response = NextResponse.redirect(target);
    const cookie = auth.headers.get("set-cookie");
    response.cookies.set(cookieName, "", { path: "/api/auth/google", maxAge: 0 });
    if (cookie && !linking) response.headers.append("set-cookie", scopeSessionCookie(cookie, tab));
    return response;
  } catch { return fail("google-unavailable"); }
}
