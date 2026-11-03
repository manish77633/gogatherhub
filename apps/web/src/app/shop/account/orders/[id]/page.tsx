import { AccountOrderDetail } from "@/features/buyer/components/account-pages";
export default async function OrderPage({ params }: PageProps<"/shop/account/orders/[id]">) {
  const { id } = await params;
  return <AccountOrderDetail id={id} />;
}
