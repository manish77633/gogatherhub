type Panel = "admin" | "seller";
type Cached = { value: unknown; at: number };
const cache = new Map<string, Cached>();
const pending = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
const key = (userId: string, panel: Panel, resource: string) => `${userId}:${panel}:${resource}`;
export function cachedPanel(userId: string, panel: Panel, resource: string) { return cache.get(key(userId, panel, resource)); }
export async function fetchPanel(userId: string, panel: Panel, resource: string, fresh = false) {
  const id = key(userId, panel, resource);
  const current = cache.get(id);
  if (!fresh && current) return current.value;
  if (pending.has(id)) return pending.get(id);
  const generation = generations.get(userId) ?? 0;
  const task = fetch(`/api/dashboard/${panel}/${resource}`, { cache: "no-store" }).then(async response => {
    const result = await response.json();
    if (!response.ok) throw new Error(result?.message ?? result?.error?.message ?? "Could not load records");
    if ((generations.get(userId) ?? 0) === generation) cache.set(id, { value: result, at: Date.now() });
    return result;
  }).finally(() => { if (pending.get(id) === task) pending.delete(id); });
  pending.set(id, task);
  return task;
}
export async function warmDashboardCache(userId: string, panel: Panel, resources: string[]) {
  for (let index = 0; index < resources.length; index += 3) await Promise.allSettled(resources.slice(index, index + 3).map(resource => fetchPanel(userId, panel, resource)));
}
export function clearDashboardCache(userId: string) { generations.set(userId, (generations.get(userId) ?? 0) + 1); for (const item of cache.keys()) if (item.startsWith(`${userId}:`)) cache.delete(item); for (const item of pending.keys()) if (item.startsWith(`${userId}:`)) pending.delete(item); }
