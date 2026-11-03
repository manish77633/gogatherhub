"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemoCommerce } from "./storefront";
import { LiveCatalog, type LiveProduct } from "./live-catalog";

export function LiveWishlist() {
  const { wishlist, toggleWishlist } = useDemoCommerce();
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const key = [...wishlist].sort().join("|");
  useEffect(() => {
    let active = true;
    setBusy(true);
    void Promise.all(key.split("|").filter(Boolean).map(async slug => {
      const response = await fetch(`/api/catalog/products/${encodeURIComponent(slug)}`);
      return response.ok ? await response.json() as LiveProduct : null;
    })).then(items => { if (active) setProducts(items.filter((item): item is LiveProduct => Boolean(item))); }).catch(() => { if (active) setProducts([]); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [key]);
  return <div className="ggh-live-catalog"><p className="ggh-page-eyebrow">Saved for later</p><h1>Your wishlist</h1>{busy ? <p role="status">Loading wishlist…</p> : products.length ? <><LiveCatalog products={products} /><div className="ggh-live-wishlist-actions">{products.map(product => <button key={product.slug} onClick={() => toggleWishlist(product.slug)}>Remove {product.name}</button>)}</div></> : <p>No available products saved. <Link href="/shop/products">Browse products →</Link></p>}</div>;
}
