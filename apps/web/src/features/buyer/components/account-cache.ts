import { accountRequest } from "./account-data";
import { ResourceCache } from "../../../lib/resource-cache";
const cache = new ResourceCache();
const active = new Set<string>();
const signal = () => { if(typeof window!=="undefined") window.dispatchEvent(new CustomEvent("ggh-account-refresh",{detail:active.size})); };
const key = (userId: string, path: string) => `${userId}:${path}`;
export function cachedAccountData<T>(userId: string, path: string): T | undefined { return cache.peek(key(userId, path))?.value as T | undefined; }
export function accountDataIsStale(userId: string, path: string) { return cache.stale(key(userId, path)); }
export function loadAccountData<T>(userId: string, path: string, fresh = false): Promise<T> {
  const id=key(userId,path);const updating=fresh||cache.stale(id);if(updating){active.add(id);signal();}
  return cache.read(id, () => accountRequest<T>(path), fresh).finally(()=>{if(updating){active.delete(id);signal();}});
}
export function invalidateAccountData(userId: string, path: string) { cache.invalidate(id => id === key(userId, path) || id.startsWith(`${key(userId, path)}/`)); }
export function invalidateAccountPath(path: string) { cache.invalidate(id => id.endsWith(`:${path}`) || id.includes(`:${path}/`)); }
export function clearAccountData(userId: string) { cache.invalidate(id => id.startsWith(`${userId}:`), true); }

if(typeof window!=="undefined")window.addEventListener("ggh-session-ended",()=>{cache.invalidate(()=>true,true);active.clear();signal();});
