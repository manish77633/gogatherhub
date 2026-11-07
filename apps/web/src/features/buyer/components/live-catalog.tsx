"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useDemoCommerce } from "./storefront";
import { setCartVariant, cartLineKey } from "./variant-storage";
import { rememberCartProduct } from "./cart-product-cache";

export type LiveProduct = { slug: string; name: string; description: string; seoTitle?: string | null; seoDescription?: string | null; imageUrl: string | null; imageUrls?: string[]; brand?: string | null; tags?: string[]; attributes?: Record<string, string>; rating?: number | null; reviewCount?: number; seller: { shopName: string }; category: { name: string; slug?: string; parent?: { name: string; slug: string } | null }; variants: { id: string; label: string; price: string; compareAt: string | null; stock: number; imageUrl?: string | null }[] };

export function LiveCatalog({ products }: { products: LiveProduct[] }) {
  const { cart, addToCart, wishlist, toggleWishlist } = useDemoCommerce();
  const showRatingRow = products.some(product => product.rating != null && Boolean(product.reviewCount));
  return <div className="ggh-live-grid">{products.map(product => {
    const variant = product.variants.find(item => item.stock > 0) ?? product.variants[0];
    const price = Number(variant?.price);
    const mrp = Number(variant?.compareAt);
    const discount = Number.isFinite(price) && Number.isFinite(mrp) && mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
    return <article className="ggh-live-product" key={product.slug}>
      <Link href={`/shop/products/${product.slug}`} className="ggh-live-photo"><img src={product.imageUrl || "/product-placeholder.svg"} alt={product.imageUrl ? product.name : "Product image unavailable"} loading="lazy" decoding="async" width={400} height={400} /></Link>
      {discount > 0 && <span className="ggh-live-discount">{discount}% OFF</span>}
      <button type="button" className={`ggh-live-wish ${wishlist.includes(product.slug) ? "saved" : ""}`} aria-label={wishlist.includes(product.slug) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={wishlist.includes(product.slug)} onClick={() => { rememberCartProduct(product); toggleWishlist(product.slug); }}><Heart size={19} fill={wishlist.includes(product.slug) ? "currentColor" : "none"} /></button>
      <div className="ggh-live-copy"><small>{product.category.name} · {product.seller.shopName}</small><h2><Link href={`/shop/products/${product.slug}`}>{product.name}</Link></h2>{product.rating != null && Boolean(product.reviewCount) ? <span className="ggh-live-rating" aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}>★ {product.rating} <small>({product.reviewCount})</small></span> : showRatingRow ? <span className="ggh-live-rating-placeholder" aria-hidden="true" /> : null}<p>₹{variant?.price ?? "—"}{variant?.compareAt && <s>₹{variant.compareAt}</s>}</p><button disabled={!variant?.stock || Boolean(cart[cartLineKey(product.slug, variant?.id)])} onClick={() => { if (variant) { rememberCartProduct(product); setCartVariant(product.slug, variant.id); addToCart(product.slug); } }}><ShoppingCart size={16} aria-hidden="true" />{!variant?.stock ? "Out of stock" : cart[cartLineKey(product.slug, variant?.id)] ? "In bag" : "Add to bag"}</button></div>
    </article>;
  })}</div>;
}
