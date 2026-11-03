import Link from "next/link";
import { LiveCatalog, type LiveProduct } from "@/features/buyer/components/live-catalog";
import { PriceRangeFilter } from "@/features/buyer/components/price-range-filter";
import { AutoApplyFilters } from "@/features/buyer/components/auto-apply-filters";

type Search = { q?: string; category?: string | string[]; sort?: string; available?: string; minPrice?: string; maxPrice?: string; page?: string };
type Result = { items: LiveProduct[]; total: number; page: number; pageSize: number };

function paginationItems(current: number, total: number): (number | string)[] {
  const pages = [...new Set([1, total, current - 1, current, current + 1].filter(page => page >= 1 && page <= total))].sort((a, b) => a - b);
  return pages.flatMap((page, index) => index > 0 && page - pages[index - 1] > 1 ? [`gap-${page}`, page] : [page]);
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  const selectedCategories = Array.isArray(params.category) ? params.category : params.category ? [params.category] : [];
  for (const key of ["q", "sort", "available", "minPrice", "maxPrice", "page"] as const) if (params[key]) query.set(key, params[key]);
  selectedCategories.forEach(category => query.append("category", category));
  const pageHref = (page: number) => { const next = new URLSearchParams(query); next.set("page", String(page)); return `/shop/products?${next}`; };
  let result: Result | null = null;
  let categories: { id: string; name: string; slug: string }[] = [];
  let maximumPrice = 10000;
  try {
    const base = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    const [productsResponse, categoriesResponse, priceResponse] = await Promise.all([
      fetch(`${base}/v1/catalog/products?${query}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }),
      fetch(`${base}/v1/catalog/categories`, { cache: "no-store", signal: AbortSignal.timeout(10000) }),
      fetch(`${base}/v1/catalog/price-range`, { cache: "no-store", signal: AbortSignal.timeout(10000) }),
    ]);
    if (productsResponse.ok) result = await productsResponse.json();
    if (categoriesResponse.ok) categories = await categoriesResponse.json();
    if (priceResponse.ok) maximumPrice = Number((await priceResponse.json() as { max: string }).max) || 10000;
  } catch { /* The error state is shown below. */ }
  return <main className="ggh-page ggh-live-catalog"><div className="ggh-page-container">
    <nav aria-label="Breadcrumb"><Link href="/shop">Home</Link> / Products</nav>
    <div className="ggh-page-heading"><div><p className="ggh-page-eyebrow">Marketplace catalog</p><h1>Shop all products</h1><p>Products from approved sellers, priced against live stock.</p></div><span className="ggh-item-count">{result?.total ?? 0} products</span></div>
    <div className="ggh-shop-layout">
      <aside className="ggh-shop-sidebar" aria-label="Product filters">
        <AutoApplyFilters>
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <h2>Filters</h2>
          <fieldset><legend>Categories</legend>{categories.map(category => <label key={category.id}><input type="checkbox" name="category" value={category.slug} defaultChecked={selectedCategories.includes(category.slug)} /> {category.name}</label>)}</fieldset>
          <fieldset><legend>Price range</legend><PriceRangeFilter maximum={maximumPrice} initialMin={params.minPrice} initialMax={params.maxPrice} /></fieldset>
          <fieldset><legend>Availability</legend><label><input type="checkbox" name="available" value="1" defaultChecked={params.available === "1"} /> In stock only</label></fieldset>
          <label className="ggh-shop-sort">Sort by<select name="sort" defaultValue={params.sort ?? "newest"}><option value="newest">Newest</option><option value="name">Name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
          <Link href="/shop/products">Clear filters</Link>
        </AutoApplyFilters>
      </aside>
      <div className="ggh-shop-results">
        {!result ? <p role="alert">The catalog is unavailable right now. Please try again.</p> : result.items.length === 0 ? <p>No approved products match these filters.</p> : <LiveCatalog products={result.items} />}
        {result && result.total > result.pageSize && (() => {
          const totalPages = Math.ceil(result.total / result.pageSize);
          return <nav className="ggh-live-pages" aria-label="Product pages">
            <p className="ggh-pages-caption">Showing {(result.page - 1) * result.pageSize + 1}–{Math.min(result.page * result.pageSize, result.total)} of {result.total} products</p>
            <div className="ggh-pages-controls">
              {result.page > 1 ? <Link className="ggh-pages-direction" href={pageHref(result.page - 1)} aria-label="Previous page"><span aria-hidden="true">←</span><span className="ggh-pages-label">Previous</span></Link> : <span className="ggh-pages-direction is-disabled" aria-disabled="true"><span aria-hidden="true">←</span><span className="ggh-pages-label">Previous</span></span>}
              <div className="ggh-pages-numbers">{paginationItems(result.page, totalPages).map(item => typeof item === "number" ? <Link key={item} href={pageHref(item)} className="ggh-pages-number" aria-label={`Page ${item}`} aria-current={item === result.page ? "page" : undefined}>{String(item).padStart(2, "0")}</Link> : <span className="ggh-pages-gap" key={item} aria-hidden="true">…</span>)}</div>
              {result.page < totalPages ? <Link className="ggh-pages-direction" href={pageHref(result.page + 1)} aria-label="Next page"><span className="ggh-pages-label">Next</span><span aria-hidden="true">→</span></Link> : <span className="ggh-pages-direction is-disabled" aria-disabled="true"><span className="ggh-pages-label">Next</span><span aria-hidden="true">→</span></span>}
            </div>
          </nav>;
        })()}
      </div>
    </div>
  </div></main>;
}
