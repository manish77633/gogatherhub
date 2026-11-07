"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; parentId: string | null };
type Product = { id: string; slug: string; name: string; imageUrl?: string | null; imageUrls?: string[]; category: { id?: string; slug: string; parent?: { slug: string } | null }; variants: Array<{ price: string | number }> };

export function HomeCategoryShowcase({ heading, description }: { heading?: string; description?: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/catalog/categories"), fetch("/api/catalog/products")]).then(async ([cats, catalog]) => {
      if (!cats.ok || !catalog.ok) return;
      const [rows, result] = await Promise.all([cats.json(), catalog.json()]);
      if (active) { setCategories(rows); setProducts(result.items ?? []); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const roots = categories.filter(item => !item.parentId);
  const current = roots.find(item => item.slug === selected) ?? roots.find(root => products.some(product => product.category.slug === root.slug || product.category.parent?.slug === root.slug)) ?? roots[0];
  const children = categories.filter(item => item.parentId === current?.id);
  const featured = products.filter(product => product.category.slug === current?.slug || product.category.parent?.slug === current?.slug).slice(0, 4);
  const cover = featured.find(product => product.imageUrl || product.imageUrls?.length);
  if (!current) return null;
  return <section className="ggh-category-showcase" aria-labelledby="ggh-category-showcase-title">
    <div className="ggh-category-showcase-head"><div><p className="ggh-kicker">Explore the collection</p><h2 id="ggh-category-showcase-title">{heading || "Shop by category"}</h2><p>{description || "Choose a category to see its subcategories and products."}</p></div><Link href="/shop/products">View all products <span aria-hidden="true">→</span></Link></div>
    <div className="ggh-category-tabs" role="group" aria-label="Choose a category">{roots.map(root => <button type="button" key={root.id} className={root.id === current.id ? "active" : ""} aria-pressed={root.id === current.id} onClick={() => setSelected(root.slug)}>{root.name}</button>)}</div>
    <div className="ggh-category-feature"><div className="ggh-category-feature-intro">{cover && <img src={cover.imageUrl || cover.imageUrls?.[0]} alt={cover.name} loading="lazy"/>}<div><small>EXPLORE {current.name.toUpperCase()}</small><h3>{current.name}</h3><Link href={`/shop/products?category=${encodeURIComponent(current.slug)}`}>Shop all {current.name} <span aria-hidden="true">→</span></Link></div></div><div className="ggh-category-feature-body"><div className="ggh-category-subhead"><h3>Subcategories</h3><span>{children.length} to explore</span></div><div className="ggh-subcategory-chips">{children.map(child => <Link key={child.id} href={`/shop/products?category=${encodeURIComponent(child.slug)}`}>{child.name}<span aria-hidden="true">↗</span></Link>)}</div>{featured.length > 0 && <><div className="ggh-category-subhead"><h3>Products in {current.name}</h3><span>{featured.length} shown</span></div><div className="ggh-category-products">{featured.map(product => <Link href={`/shop/products/${product.slug}`} key={product.id}>{product.imageUrl || product.imageUrls?.[0] ? <img src={product.imageUrl || product.imageUrls?.[0]} alt={product.name} loading="lazy"/> : <span className="ggh-category-product-empty">✦</span>}<strong>{product.name}</strong><small>₹{Number(product.variants?.[0]?.price ?? 0).toLocaleString("en-IN")}</small></Link>)}</div></>}</div></div>
  </section>;
}
