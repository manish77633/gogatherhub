import { notFound } from "next/navigation";
import { AccountSection } from "@/features/buyer/components/account-pages";
const valid = new Set(["orders", "wishlist", "addresses", "returns", "profile", "coupons", "payments", "notifications", "support"]);
export default async function SectionPage({ params }: PageProps<"/shop/account/[section]">) {
  const { section } = await params;
  if (!valid.has(section)) notFound();
  return <AccountSection section={section} />;
}
