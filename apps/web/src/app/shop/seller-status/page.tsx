import { sessionCookie } from "@/lib/tab-session";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { tabRedirect as redirect } from "@/lib/tab-redirect";
import { LogoutButton } from "@/features/buyer/components/logout-button";

export default async function SellerStatusPage() {
  const cookie = sessionCookie((await cookies()).toString(), (await headers()).get("x-ggh-page-tab") ?? undefined);
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/me`, { headers: { cookie }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) return await redirect("/shop/login?next=%2Fseller");
  const user = await response.json() as { role: string; sellerStatus: string | null };
  if (user.role !== "SELLER") await redirect("/shop/account");
  if (user.sellerStatus === "APPROVED") await redirect("/seller");
  return <main className="ggh-page"><div className="ggh-page-container"><section className="ggh-seller-registration"><p className="ggh-page-eyebrow">Seller account</p><h1>Shop review status</h1><p>{user.sellerStatus === "PENDING" ? "Your seller account is awaiting admin review. Once approved, sign in to access your seller dashboard." : user.sellerStatus === "REJECTED" ? "Your seller application was not approved. Please contact the marketplace administrator for more information." : "Your seller account is currently unavailable. Please contact the marketplace administrator."}</p><Link href="/shop">Back to shop</Link><div style={{ marginTop: 20 }}><LogoutButton /></div></section></div></main>;
}
