import { requireRole } from "@/lib/server-auth";
import { CheckoutView } from "@/features/buyer/components/checkout-view";

export default async function CheckoutPage({ searchParams }: PageProps<"/shop/checkout">) {
  await requireRole("BUYER", "/shop/checkout");
  const { coupon } = await searchParams;
  return <main className="ggh-page"><div className="ggh-page-container"><CheckoutView initialCoupon={typeof coupon === "string" ? coupon : ""} /></div></main>;
}
