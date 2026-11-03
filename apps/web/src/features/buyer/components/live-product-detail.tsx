"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Leaf, ShieldCheck, ShoppingBag } from "lucide-react";
import { useDemoCommerce } from "./storefront";
import type { LiveProduct } from "./live-catalog";
import { setCartVariant, cartLineKey } from "./variant-storage";

const money = (value: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));

export function LiveProductDetail({ product, related = [] }: { product: LiveProduct; related?: LiveProduct[] }) {
  const router = useRouter();
  const { cart, addToCart, wishlist, toggleWishlist } = useDemoCommerce();
  const [variantId, setVariantId] = useState(product.variants.find(item => item.stock > 0)?.id ?? product.variants[0]?.id ?? "");
  const images = [...new Set([product.imageUrl, ...(product.imageUrls ?? [])].filter((url): url is string => Boolean(url)))].slice(0, 5);
  const [selectedImage, setSelectedImage] = useState(images[0] ?? "");
  useEffect(() => { void fetch(`/api/buyer/recently-viewed/${encodeURIComponent(product.slug)}`, { method: "POST" }).catch(() => {}); }, [product.slug]);
  const variant = product.variants.find(item => item.id === variantId);
  const available = Boolean(variant?.stock);
  const inBag = Boolean(cart[cartLineKey(product.slug, variant?.id)]);
  const saved = wishlist.includes(product.slug);
  function add() {
    if (!variant || !available) return;
    setCartVariant(product.slug, variant.id);
    if (!inBag) addToCart(product.slug);
  }
  function buyNow() {
    if (!available) return;
    add();
    router.push("/shop/checkout");
  }
  return <>
    <div className="ggh-editorial-detail grid min-w-0 gap-8 py-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)] lg:gap-12">
      <div className="ggh-product-gallery"><div className="ggh-product-thumbs" aria-label="Product photos">{images.map((url, index) => <button type="button" key={url} className={selectedImage === url ? "selected" : ""} onClick={() => setSelectedImage(url)} aria-label={`View product photo ${index + 1}`} aria-pressed={selectedImage === url}><img src={url} alt="" /></button>)}</div><div className="ggh-product-main-image">{selectedImage ? <img src={selectedImage} alt={product.name} /> : <div aria-label="Image unavailable">✦</div>}</div></div>
      <div className="min-w-0 pt-2 lg:pt-5">
        <div className="flex items-start justify-between gap-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#29483b]">{product.category.name} · {product.seller.shopName}</p><button type="button" className="ggh-product-detail-wish" aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved} onClick={() => toggleWishlist(product.slug)}><Heart size={19} fill={saved ? "currentColor" : "none"} /></button></div>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#292924] sm:text-5xl">{product.name}</h1>
        <p className="mt-4 text-2xl font-bold text-[#272b27]">{variant ? money(variant.price) : "Price unavailable"}</p>
        {variant?.compareAt && <p className="mt-1 text-sm text-[#8c8179]"><s>{money(variant.compareAt)}</s></p>}
        <div className="ggh-product-about"><h2>About this product</h2><p>{!product.description?.trim() || /^An illustrative .+ item for a customizable celebration kit\.$/i.test(product.description.trim()) ? "The seller has not added a detailed description for this product yet." : product.description}</p></div>
        {product.variants.length > 1 && <label className="mt-7 block text-sm font-semibold text-[#302d2c]">Choose option<select className="mt-2 w-full rounded-lg border border-[#ded5cc] bg-white px-4 py-3" value={variantId} onChange={event => setVariantId(event.target.value)}>{product.variants.map(item => <option key={item.id} value={item.id} disabled={!item.stock}>{item.label}{item.stock ? "" : " · Out of stock"}</option>)}</select></label>}
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#29483b]"><span className="inline-flex items-center gap-2"><Leaf size={15} /> Thoughtfully selected</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} /> Carefully packed</span></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" disabled={!available} onClick={add} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#29483b] px-5 text-sm font-bold text-[#29483b] disabled:opacity-50"><ShoppingBag size={18} />{inBag ? "Added to bag" : "Add to bag"}</button><button type="button" disabled={!available} onClick={buyNow} className="min-h-12 rounded-lg bg-[#29483b] px-5 text-sm font-bold text-white disabled:opacity-50">Buy now</button></div>
        <div className="mt-8 border-t border-[#e7ded6] pt-5 text-sm text-[#554d47]"><strong>Product details</strong><dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-3"><dt>Seller</dt><dd>{product.seller.shopName}</dd><dt>Category</dt><dd>{product.category.name}</dd>{variant && <><dt>Option</dt><dd>{variant.label}</dd></>}<dt>Availability</dt><dd>{available ? "Available" : "Out of stock"}</dd></dl></div>
      </div>
    </div>
    {related.length > 0 && <section className="ggh-related-products"><h2>You may also like</h2><div>{related.map(item => {
      const relatedVariant = item.variants.find(option => option.stock > 0) ?? item.variants[0];
      const relatedInBag = Boolean(cart[cartLineKey(item.slug, relatedVariant?.id)]);
      const relatedSaved = wishlist.includes(item.slug);
      return <article key={item.slug}><Link href={`/shop/products/${item.slug}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>Image unavailable</span>}</Link><button type="button" className={`ggh-related-wish ${relatedSaved ? "saved" : ""}`} aria-label={relatedSaved ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`} aria-pressed={relatedSaved} onClick={() => toggleWishlist(item.slug)}><Heart size={18} fill={relatedSaved ? "currentColor" : "none"} /></button><small>{item.category.name}</small><Link href={`/shop/products/${item.slug}`}>{item.name}</Link><strong>{relatedVariant ? money(relatedVariant.price) : "Price unavailable"}</strong><button type="button" className="ggh-related-add" disabled={!relatedVariant?.stock || relatedInBag} onClick={() => { if (!relatedVariant) return; setCartVariant(item.slug, relatedVariant.id); addToCart(item.slug); }}><ShoppingBag size={16} />{relatedInBag ? "In bag" : relatedVariant?.stock ? "Add to bag" : "Out of stock"}</button></article>;
    })}</div></section>}
  </>;
}
