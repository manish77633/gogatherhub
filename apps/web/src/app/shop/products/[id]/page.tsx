import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveProductDetail } from "@/features/buyer/components/live-product-detail";
import type { LiveProduct } from "@/features/buyer/components/live-catalog";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) notFound();
  let product: LiveProduct | null = null;
  let related: LiveProduct[] = [];
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/products/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.status === 400 || response.status === 404) notFound();
    if (response.ok) product = await response.json();
    if (product?.category.slug) {
      const relatedResponse = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/products?category=${encodeURIComponent(product.category.slug)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (relatedResponse.ok) related = ((await relatedResponse.json()) as { items: LiveProduct[] }).items.filter(item => item.slug !== id).slice(0, 4);
    }
  } catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; }
  return <main className="ggh-page"><div className="ggh-page-container"><nav aria-label="Breadcrumb"><Link href="/shop">Home</Link> / <Link href="/shop/products">Products</Link> / {product?.name ?? id}</nav>{product ? <LiveProductDetail product={product} related={related} /> : <p role="alert">Product service is unavailable. Please retry shortly.</p>}</div></main>;
}
