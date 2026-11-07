"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Grid2X2, List, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Chip = { key: string; value: string; label: string };

export function CatalogControls({ sidebar, children, chips, query, sort }: { sidebar: ReactNode; children: ReactNode; chips: Chip[]; query: string; sort: string }) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  useEffect(() => { setFiltersOpen(false); }, [query]);
  useEffect(() => { if (!filtersOpen) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); }; document.addEventListener("keydown", close); return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", close); }; }, [filtersOpen]);
  const remove = (chip: Chip) => {
    const next = new URLSearchParams(query);
    const values = next.getAll(chip.key).filter(value => value !== chip.value);
    next.delete(chip.key);
    values.forEach(value => next.append(chip.key, value));
    next.delete("page");
    router.push(`/shop/products?${next}`);
  };
  return <div className="ggh-shop-layout ggh-shop-redesign">
    {filtersOpen && <button className="ggh-filter-scrim" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
    <div className={`ggh-filter-panel ${filtersOpen ? "is-open" : ""}`}>
      <div className="ggh-filter-mobile-head"><strong>Filters</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20}/></button></div>
      {sidebar}
    </div>
    <div className="ggh-shop-results">
      <div className="ggh-catalog-toolbar">
        <div className="ggh-active-filters">
          <button className="ggh-mobile-filter-button" type="button" onClick={() => setFiltersOpen(true)}><Filter size={17}/> Filters{chips.length ? ` (${chips.length})` : ""}</button>
          {chips.map(chip => <button type="button" className="ggh-filter-chip" key={`${chip.key}-${chip.value}`} onClick={() => remove(chip)}>{chip.label}<X size={14}/></button>)}
          {chips.length > 0 && <Link className="ggh-filter-clear" href="/shop/products">Clear all</Link>}
        </div>
        <div className="ggh-catalog-controls">
          <label><span className="sr-only">Sort products</span><select value={sort} onChange={event => { const next = new URLSearchParams(query); next.set("sort", event.target.value); next.delete("page"); router.push(`/shop/products?${next}`); }}><option value="popular">Most Popular</option><option value="newest">Newest</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="top-rated">Top Rated</option><option value="discount-desc">Biggest Discount</option></select></label>
          <div className="ggh-view-switch" aria-label="Product view"><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid2X2 size={18}/></button><button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18}/></button></div>
        </div>
      </div>
      <div className={`ggh-catalog-view ${view === "list" ? "is-list" : ""}`}>{children}</div>
    </div>
  </div>;
}
