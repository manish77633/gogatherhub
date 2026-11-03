import { accountRequest } from "./account-data";

const values = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
const key = (userId: string, path: string) => `${userId}:${path}`;
export function cachedAccountData<T>(userId: string, path: string): T | undefined { return values.get(key(userId, path)) as T | undefined; }
export async function loadAccountData<T>(userId: string, path: string, fresh = false): Promise<T> {
  const id = key(userId, path);
  if (!fresh && values.has(id)) return values.get(id) as T;
  if (pending.has(id)) return pending.get(id) as Promise<T>;
  const generation = generations.get(userId) ?? 0;
  const task = accountRequest<T>(path).then(result => { if ((generations.get(userId) ?? 0) === generation) values.set(id, result); return result; }).finally(() => { if (pending.get(id) === task) pending.delete(id); });
  pending.set(id, task);
  return task;
}
export function invalidateAccountData(userId: string, path: string) { values.delete(key(userId, path)); }
export function invalidateAccountPath(path: string) { for (const item of values.keys()) if (item.endsWith(`:${path}`)) values.delete(item); }
export function clearAccountData(userId: string) { generations.set(userId, (generations.get(userId) ?? 0) + 1); for (const item of values.keys()) if (item.startsWith(`${userId}:`)) values.delete(item); for (const item of pending.keys()) if (item.startsWith(`${userId}:`)) pending.delete(item); }
