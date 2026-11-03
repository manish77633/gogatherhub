import type { MetadataRoute } from "next";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
  const entries: MetadataRoute.Sitemap = [{ url: `${site}/shop` }, { url: `${site}/shop/products` }, { url: `${site}/shop/content` }];
  try {
    for (let page = 1; page <= 100; page++) {
      const response = await fetch(`${base}/v1/catalog/products?page=${page}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) break;
      const result = await response.json();
      for (const item of result.items) entries.push({ url: `${site}/shop/products/${item.slug}`, lastModified: item.updatedAt });
      if (page * result.pageSize >= result.total) break;
    }
    for (const kind of ["page", "policy", "blog", "faq"]) {
      const published = await fetch(`${base}/v1/cms/${kind}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (published.ok) for (const item of await published.json()) entries.push({ url: `${site}/shop/content/${kind}/${item.slug}`, lastModified: item.updatedAt });
    }
  } catch { /* Keep static public routes in the sitemap. */ }
  return entries;
}
