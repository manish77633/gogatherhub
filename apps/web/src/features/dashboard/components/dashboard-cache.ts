import { ResourceCache } from "../../../lib/resource-cache";
type Panel = "admin" | "seller";
const cache = new ResourceCache();
const key = (userId: string, panel: Panel, resource: string) => `${userId}:${panel}:${resource}`;
export function cachedPanel(userId: string, panel: Panel, resource: string) { return cache.peek(key(userId, panel, resource)); }
export function panelIsStale(userId: string, panel: Panel, resource: string) { return cache.stale(key(userId, panel, resource)); }
export function fetchPanel(userId: string, panel: Panel, resource: string, fresh = false) {
  return cache.read(key(userId, panel, resource), async () => {
    const response = await fetch(`/api/dashboard/${panel}/${resource}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { if (response.status === 401 || response.status === 403) clearDashboardCache(userId); throw new Error(result?.message ?? result?.error?.message ?? "Could not load records"); }
    return result;
  }, fresh);
}
export async function warmDashboardCache(userId: string, panel: Panel, resources: string[]) {
  for (const resource of resources) await fetchPanel(userId, panel, resource).catch(() => {});
}
export function invalidateDashboardMutation(userId: string, panel: Panel, path: string) {
  const resource = path.split("/")[0];
  if (["categories", "category-requests"].includes(resource)) taxonomy.invalidate(() => true, true);
  const dependencies: Record<string, string[]> = { products: ["products", "inventory", "overview", "analytics", "reviews"], inventory: ["inventory", "overview", "products"], orders: ["orders", "overview", "analytics", "customers", "payments"], returns: ["returns", "overview"], sellers: ["sellers", "overview", "products"], "category-requests": ["category-requests", "categories"], shop: ["shop", "overview"], staff: ["staff", "roles"], support: ["support"], categories: ["categories", "products"] };
  const affected = dependencies[resource] ?? [resource];
  cache.invalidate(id => affected.some(item => id === key(userId, panel, item) || id.startsWith(`${key(userId, panel, item)}/`)));
}
const views = new Map<string, { query: string; filter: string; scroll: number }>();
export function panelView(userId: string, panel: Panel, resource: string) { return views.get(key(userId, panel, resource)); }
export function savePanelView(userId: string, panel: Panel, resource: string, value: { query: string; filter: string; scroll: number }) { views.set(key(userId, panel, resource), value); }
export function clearDashboardCache(userId: string) { cache.invalidate(id => id.startsWith(`${userId}:`), true); for (const id of views.keys()) if (id.startsWith(`${userId}:`)) views.delete(id); }

const taxonomy = new ResourceCache(60_000, 1);
export function fetchCategories() { return taxonomy.read("categories", async () => { const response = await fetch("/api/catalog/categories"); if (!response.ok) throw new Error("Could not load categories"); return response.json(); }); }

if(typeof window!=="undefined")window.addEventListener("ggh-session-ended",()=>{cache.invalidate(()=>true,true);views.clear();});
