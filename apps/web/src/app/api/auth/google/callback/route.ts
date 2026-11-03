import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export async function GET(request: NextRequest) {
  const login = new URL("/shop/login", request.nextUrl.origin);
  const fail = (reason: string) => { login.searchParams.set("error", reason); return NextResponse.redirect(login); };
  const expected = request.cookies.get("ggh_google_state")?.value;
  const received = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!expected || !received || expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received)) || !code) return fail("google-state");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google-unavailable");
  const callback = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: "authorization_code" }), cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!tokenResponse.ok) return fail("google-token");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return fail("google-token");
    const linking = request.cookies.get("ggh_google_link")?.value === "1";
    const auth = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/google${linking ? "/link" : ""}`, { method: "POST", headers: { "content-type": "application/json", ...(linking ? { cookie: request.headers.get("cookie") ?? "" } : {}) }, body: JSON.stringify({ idToken: tokens.id_token }), cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!auth.ok) return fail(linking ? "google-link" : "google-auth");
    const result = await auth.json() as { role: string };
    const next = request.cookies.get("ggh_google_next")?.value;
    const destination = linking ? "/shop/account/profile?google=linked" : next && /^\/(shop|seller|admin)(\/|$)/.test(next) && !next.includes("\\") && !next.includes("//") ? next : result.role === "SELLER" ? "/seller" : ["ADMIN", "ADMIN_STAFF"].includes(result.role) ? "/admin" : "/shop/account";
    const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));
    const cookie = auth.headers.get("set-cookie");
    response.cookies.set("ggh_google_state", "", { path: "/api/auth/google", maxAge: 0 });
    response.cookies.set("ggh_google_next", "", { path: "/api/auth/google", maxAge: 0 });
    response.cookies.set("ggh_google_link", "", { path: "/api/auth/google", maxAge: 0 });
    if (cookie && !linking) response.headers.append("set-cookie", cookie);
    return response;
  } catch { return fail("google-unavailable"); }
}
