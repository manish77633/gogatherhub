import { notFound } from "next/navigation";
import { ComboBuilder } from "@/features/buyer/components/combo-builder";
import { ShopBreadcrumbs } from "@/features/buyer/components/buyer-pages";
import { demoCombos } from "@/features/buyer/data/store-catalog";

export function generateStaticParams() {
  return demoCombos.map((combo) => ({ id: combo.id }));
}
export default async function ComboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const combo = demoCombos.find((item) => item.id === id);
  if (!combo) notFound();
  return (
    <main className="ggh-page">
      <div className="ggh-page-container">
        <ShopBreadcrumbs
          items={[
            { label: "Shop All", href: "/shop/products" },
            { label: "Combos", href: "/shop/products?collection=combos" },
            { label: combo.name },
          ]}
        />
        <ComboBuilder combo={combo} />
      </div>
    </main>
  );
}
