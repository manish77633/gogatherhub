import { CartView, ShopBreadcrumbs } from "@/features/buyer/components/buyer-pages";
export default function CartPage() {
  return (
    <main className="ggh-page">
      <div className="ggh-page-container">
        <ShopBreadcrumbs items={[{ label: "Shopping Bag" }]} />
        <CartView />
      </div>
    </main>
  );
}
