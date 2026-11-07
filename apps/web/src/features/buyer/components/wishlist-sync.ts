import { commerceStorage } from "./commerce-storage";
const KEY = "ggh-demo-wishlist";
let epoch=0;
let authenticated=false;
let pendingMerge:Promise<void>|undefined;
async function performMerge() {
  const generation=epoch;
  const response = await fetch("/api/buyer/wishlist", { cache: "no-store" });
  if (!response.ok) { authenticated=false; return; }
  if(generation!==epoch)return;
  authenticated=true;
  const existing = await response.json() as { product: { slug: string } }[];
  let local: string[] = [];
  try { const parsed = JSON.parse(commerceStorage().getItem(KEY) ?? "[]"); if (Array.isArray(parsed)) local = parsed.filter((value): value is string => typeof value === "string"); } catch { /* Use the server list. */ }
  const serverSlugs = existing.map(item => item.product.slug);
  const missing = local.filter(slug => !serverSlugs.includes(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
  await Promise.all(missing.map(slug => fetch(`/api/buyer/wishlist/${encodeURIComponent(slug)}`, { method: "POST" }).catch(() => null)));
  if(generation!==epoch)return;
  commerceStorage().setItem(KEY, JSON.stringify([...new Set([...serverSlugs, ...local])]));
  window.dispatchEvent(new Event("ggh-demo-change"));
}

export function mergeWishlist() { if (!pendingMerge) pendingMerge=performMerge().finally(()=>{pendingMerge=undefined;});return pendingMerge; }
const versions=new Map<string,number>();
const writes=new Map<string,Promise<void>>();
export function syncWishlistToggle(slug:string,removing:boolean) {
  if(!authenticated)return;
  const generation=epoch;
  const version=(versions.get(slug)??0)+1;versions.set(slug,version);
  const task=(writes.get(slug)??Promise.resolve()).then(async()=>{
    if(generation!==epoch)return;
    try {
      const response=await fetch(`/api/buyer/wishlist/${encodeURIComponent(slug)}`,{method:removing?"DELETE":"POST"});
      if(!response.ok)throw new Error("Wishlist could not be saved. Your last change was restored.");
      const {invalidateAccountPath}=await import("./account-cache");invalidateAccountPath("wishlist");
    }catch {
      if(generation===epoch&&versions.get(slug)===version){
        const raw=commerceStorage().getItem(KEY)??"[]";let current:string[]=[];try{current=JSON.parse(raw);}catch{}
        const restored=removing?[...new Set([...current,slug])]:current.filter(id=>id!==slug);
        commerceStorage().setItem(KEY,JSON.stringify(restored));window.dispatchEvent(new Event("ggh-demo-change"));
        window.dispatchEvent(new CustomEvent("ggh-commerce-error",{detail:"Wishlist could not be saved. Your last change was restored."}));
      }
    }
  }).finally(()=>{if(writes.get(slug)===task)writes.delete(slug);});writes.set(slug,task);
}
if(typeof window!=="undefined")window.addEventListener("ggh-session-ended",()=>{epoch++;authenticated=false;pendingMerge=undefined;versions.clear();writes.clear();});
