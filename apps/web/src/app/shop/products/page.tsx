import Link from "next/link";
import { LiveCatalog, type LiveProduct } from "@/features/buyer/components/live-catalog";
import { PriceRangeFilter } from "@/features/buyer/components/price-range-filter";
import { AutoApplyFilters } from "@/features/buyer/components/auto-apply-filters";
import { CatalogControls } from "@/features/buyer/components/catalog-controls";
import { collectionCategorySlugs, collectionLabel } from "@/features/buyer/data/store-catalog";

type Search = { q?: string; collection?: string; category?: string | string[]; sort?: string; available?: string; minPrice?: string; maxPrice?: string; page?: string; brand?: string; seller?: string; occasion?: string; rating?: string; discount?: string; attribute?: string };
type Result = { items: LiveProduct[]; total: number; page: number; pageSize: number };

function paginationItems(current: number, total: number): (number | string)[] {
  const pages = [...new Set([1, total, current - 1, current, current + 1].filter(page => page >= 1 && page <= total))].sort((a, b) => a - b);
  return pages.flatMap((page, index) => index > 0 && page - pages[index - 1] > 1 ? [`gap-${page}`, page] : [page]);
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.collection) query.set("collection", params.collection);
  const selectedCategories = Array.isArray(params.category) ? params.category : params.category ? [params.category] : [];
  for (const key of ["q", "sort", "available", "minPrice", "maxPrice", "page", "brand", "seller", "occasion", "rating", "discount", "attribute"] as const) if (params[key]) query.set(key, params[key]);
  selectedCategories.forEach(category => query.append("category", category));
  const pageHref = (page: number) => { const next = new URLSearchParams(query); next.set("page", String(page)); return `/shop/products?${next}`; };
  let result: Result | null = null;
  let categories: { id: string; name: string; slug: string; parentId: string | null; productCount?: number; parent?: { name: string; slug: string } | null }[] = [];
  let maximumPrice = 10000;
  let facets: { brands: string[]; sellers: string[]; occasions: string[]; attributes: { name: string; values: string[] }[] } = { brands: [], sellers: [], occasions: [], attributes: [] };
  const collectionLabelText = params.collection ? collectionLabel(params.collection) : "";
  const recognizedCollection = !params.collection || Boolean(collectionCategorySlugs[params.collection]);
  try {
    const base = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    const [productsResponse, categoriesResponse, priceResponse, facetsResponse] = await Promise.all([
      fetch(`${base}/v1/catalog/products?${query}`, { next: { revalidate: 10 }, signal: AbortSignal.timeout(10000) }),
      fetch(`${base}/v1/catalog/categories`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(10000) }),
      fetch(`${base}/v1/catalog/price-range`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(10000) }),
      fetch(`${base}/v1/catalog/facets${selectedCategories[0] ? `?category=${encodeURIComponent(selectedCategories[0])}` : ""}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(10000) }).catch(() => null),
    ]);
    if (productsResponse.ok) result = await productsResponse.json();
    if (categoriesResponse.ok) categories = await categoriesResponse.json();
    if (priceResponse.ok) maximumPrice = Number((await priceResponse.json() as { max: string }).max) || 10000;
    if (facetsResponse?.ok) facets = await facetsResponse.json();
  } catch { /* The error state is shown below. */ }
  const chips = [
    ...selectedCategories.map(slug => ({ key: "category", value: slug, label: categories.find(category => category.slug === slug)?.name ?? slug })),
    ...(params.minPrice ? [{ key: "minPrice", value: params.minPrice, label: `From ₹${Number(params.minPrice).toLocaleString("en-IN")}` }] : []),
    ...(params.maxPrice ? [{ key: "maxPrice", value: params.maxPrice, label: `Up to ₹${Number(params.maxPrice).toLocaleString("en-IN")}` }] : []),
    ...(params.available === "1" ? [{ key: "available", value: "1", label: "In stock" }] : []),
    ...(["brand", "seller", "occasion", "rating", "discount"] as const).flatMap(key => params[key] ? [{ key, value: params[key]!, label: key === "rating" ? `${params[key]}★ & above` : key === "discount" ? `${params[key]}% off & above` : params[key]! }] : []),
    ...(params.attribute ? [{ key: "attribute", value: params.attribute, label: params.attribute.replace("|", ": ") }] : []),
  ];
  return <main className="ggh-page ggh-live-catalog"><div className="ggh-page-container">
    <section className="ggh-catalog-hero"><div className="ggh-catalog-hero-inner"><nav aria-label="Breadcrumb"><Link href="/shop">Home</Link><span aria-hidden="true">›</span> Products</nav><p className="ggh-page-eyebrow">Discover something special</p><h1>{collectionLabelText || "Shop All Products"}</h1><p>{collectionLabelText ? `Explore ${collectionLabelText.toLowerCase()} from approved sellers.` : "Products from approved sellers, priced against live stock."}</p><span className="ggh-catalog-hero-count">{result?.total ?? 0} products to explore</span></div></section>
    <CatalogControls query={query.toString()} sort={params.sort ?? "newest"} chips={chips} sidebar={
      <aside className="ggh-shop-sidebar" aria-label="Product filters">
        <AutoApplyFilters>
          <div className="ggh-filter-heading"><h2>Filters</h2><Link href="/shop/products">Clear all</Link></div>
          {selectedCategories.filter(slug => categories.some(category => category.parentId && category.slug === slug)).map(slug => <input key={slug} type="hidden" name="category" value={slug} />)}
          <fieldset><legend>Price range</legend><PriceRangeFilter maximum={maximumPrice} initialMin={params.minPrice} initialMax={params.maxPrice} /></fieldset>
          <fieldset><legend>Availability</legend><label><input type="checkbox" name="available" value="1" defaultChecked={params.available === "1"} /> In stock only</label></fieldset>
          <details className="ggh-filter-category-section" open><summary>Categories</summary>{categories.filter(category => !category.parentId).map(parent => <div className="ggh-filter-category" key={parent.id}><label><input type="checkbox" name="category" value={parent.slug} defaultChecked={selectedCategories.includes(parent.slug)} /> <span>{parent.name}</span><small>{parent.productCount ?? 0}</small></label></div>)}</details>
          <fieldset><legend>Customer rating</legend><select name="rating" defaultValue={params.rating ?? ""}><option value="">All ratings</option><option value="3">3★ & above</option><option value="4">4★ & above</option><option value="5">5★ only</option></select></fieldset>
          <fieldset><legend>Discount</legend><select name="discount" defaultValue={params.discount ?? ""}><option value="">Any discount</option>{[10,20,30,40,50].map(value => <option value={value} key={value}>{value}% off & above</option>)}</select></fieldset>
          {facets.occasions.length > 0 && <fieldset><legend>Occasion</legend><select name="occasion" defaultValue={params.occasion ?? ""}><option value="">All occasions</option>{facets.occasions.map(value => <option value={value} key={value}>{value}</option>)}</select></fieldset>}
          {facets.brands.length > 0 && <fieldset><legend>Brand</legend><select name="brand" defaultValue={params.brand ?? ""}><option value="">All brands</option>{facets.brands.map(value => <option value={value} key={value}>{value}</option>)}</select></fieldset>}
          {facets.sellers.length > 0 && <fieldset><legend>Seller</legend><select name="seller" defaultValue={params.seller ?? ""}><option value="">All sellers</option>{facets.sellers.map(value => <option value={value} key={value}>{value}</option>)}</select></fieldset>}
          {facets.attributes.length > 0 && <fieldset><legend>Product details</legend><select name="attribute" defaultValue={params.attribute ?? ""}><option value="">All options</option>{facets.attributes.flatMap(attribute => attribute.values.map(value => <option key={`${attribute.name}|${value}`} value={`${attribute.name}|${value}`}>{attribute.name}: {value}</option>))}</select></fieldset>}
        </AutoApplyFilters>
      </aside>}>
        {!recognizedCollection ? <p>No marketplace collection is mapped to this link yet.</p> : !result ? <p role="alert">The catalog is unavailable right now. Please try again.</p> : result.items.length === 0 ? <p>No approved products match these filters.</p> : <LiveCatalog products={result.items} />}
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
    </CatalogControls>
  </div></main>;
}
