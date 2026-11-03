const KEY = "ggh-demo-wishlist";
export async function mergeWishlist() {
  const response = await fetch("/api/buyer/wishlist", { cache: "no-store" });
  if (!response.ok) return;
  const existing = await response.json() as { product: { slug: string } }[];
  let local: string[] = [];
  try { const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]"); if (Array.isArray(parsed)) local = parsed.filter((value): value is string => typeof value === "string"); } catch { /* Use the server list. */ }
  const serverSlugs = existing.map(item => item.product.slug);
  const missing = local.filter(slug => !serverSlugs.includes(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
  await Promise.all(missing.map(slug => fetch(`/api/buyer/wishlist/${encodeURIComponent(slug)}`, { method: "POST" }).catch(() => null)));
  localStorage.setItem(KEY, JSON.stringify([...new Set([...serverSlugs, ...local])]));
  window.dispatchEvent(new Event("ggh-demo-change"));
}
