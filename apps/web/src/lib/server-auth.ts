import { sessionCookie, tabUrl } from "./tab-session";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

type Role = "BUYER" | "SELLER" | "ADMIN" | "ADMIN_STAFF";

export async function requireRole(role: Role, returnTo = `/${role.toLowerCase()}`) {
  const tab = (await headers()).get("x-ggh-page-tab") ?? undefined;
  const go = (path: string): never => { const url = tabUrl(path, "http://internal", tab); redirect(url.pathname + url.search); };
  const cookie = sessionCookie((await cookies()).toString(), tab);
  if (!cookie.includes("ggh_session=")) go(`/shop/login?next=${encodeURIComponent(returnTo)}`);
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/me`, {
      headers: { cookie }, cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) go(`/shop/login?next=${encodeURIComponent(returnTo)}`);
    const user = await response.json() as { id: string; role: Role; sellerStatus?: string };
    if (user.role !== role && !(role === "ADMIN" && user.role === "ADMIN_STAFF")) {
      go(user.role === "SELLER" ? "/seller" : user.role === "ADMIN" || user.role === "ADMIN_STAFF" ? "/admin" : "/shop/account");
    }
    if (role === "SELLER" && user.sellerStatus !== "APPROVED") go("/shop/seller-status");
    return user;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return go(`/shop/login?error=service-unavailable&next=${encodeURIComponent(returnTo)}`);
  }
}
