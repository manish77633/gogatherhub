import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Role = "BUYER" | "SELLER" | "ADMIN" | "ADMIN_STAFF";

export async function requireRole(role: Role, returnTo = `/${role.toLowerCase()}`) {
  const cookie = (await cookies()).toString();
  if (!cookie.includes("ggh_session=")) redirect(`/shop/login?next=${encodeURIComponent(returnTo)}`);
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/me`, {
      headers: { cookie }, cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) redirect(`/shop/login?next=${encodeURIComponent(returnTo)}`);
    const user = await response.json() as { id: string; role: Role; sellerStatus?: string };
    if (user.role !== role && !(role === "ADMIN" && user.role === "ADMIN_STAFF")) {
      redirect(user.role === "SELLER" ? "/seller" : user.role === "ADMIN" || user.role === "ADMIN_STAFF" ? "/admin" : "/shop/account");
    }
    if (role === "SELLER" && user.sellerStatus !== "APPROVED") redirect("/shop/seller-status");
    return user;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/shop/login?error=service-unavailable&next=${encodeURIComponent(returnTo)}`);
  }
}
