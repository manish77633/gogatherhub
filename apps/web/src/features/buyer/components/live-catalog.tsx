"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useDemoCommerce } from "./storefront";
import { setCartVariant } from "./variant-storage";

export type LiveProduct = { slug: string; name: string; description: string; imageUrl: string | null; imageUrls?: string[]; seller: { shopName: string }; category: { name: string; slug?: string }; variants: { id: string; label: string; price: string; compareAt: string | null; stock: number }[] };

export function LiveCatalog({ products }: { products: LiveProduct[] }) {
  const { cart, addToCart, wishlist, toggleWishlist } = useDemoCommerce();
  return <div className="ggh-live-grid">{products.map(product => {
    const variant = product.variants.find(item => item.stock > 0) ?? product.variants[0];
    return <article className="ggh-live-product" key={product.slug}>
      <Link href={`/shop/products/${product.slug}`} className="ggh-live-photo">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span aria-hidden="true">✦</span>}</Link>
      <button type="button" className={`ggh-live-wish ${wishlist.includes(product.slug) ? "saved" : ""}`} aria-label={wishlist.includes(product.slug) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={wishlist.includes(product.slug)} onClick={() => toggleWishlist(product.slug)}><Heart size={19} fill={wishlist.includes(product.slug) ? "currentColor" : "none"} /></button>
      <div className="ggh-live-copy"><small>{product.category.name} · {product.seller.shopName}</small><h2><Link href={`/shop/products/${product.slug}`}>{product.name}</Link></h2><p>₹{variant?.price ?? "—"}{variant?.compareAt && <s>₹{variant.compareAt}</s>}</p>{!variant?.stock && <span>Out of stock</span>}<button disabled={!variant?.stock || Boolean(cart[product.slug])} onClick={() => { if (variant) { setCartVariant(product.slug, variant.id); addToCart(product.slug); } }}>{cart[product.slug] ? "In bag" : "Add to bag"}</button></div>
    </article>;
  })}</div>;
}
