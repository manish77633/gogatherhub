import { commerceStorage } from "./commerce-storage";
import { getCartVariant, setCartVariant, cartLineKey, cartProductSlug } from "./variant-storage";

const CART_KEY = "ggh-demo-cart";
type ServerCart = { revision: string; userId: string; items: { slug: string; variantId: string; quantity: number }[] };

function localCart(): Record<string, number> {
  try { const value = JSON.parse(commerceStorage().getItem(CART_KEY) ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
async function selectedItems() {
  const entries = Object.entries(localCart()).filter(([slug, quantity]) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && Number.isInteger(quantity) && quantity > 0 && quantity <= 10000);
  const items = await Promise.all(entries.map(async ([slug, quantity]) => {
    const knownVariant=getCartVariant(slug);
    if(knownVariant)return {variantId:knownVariant,quantity};
    try {
      const response = await fetch(`/api/catalog/products/${encodeURIComponent(cartProductSlug(slug))}`);
      if (!response.ok) throw new Error("Catalog lookup failed");
      const product = await response.json();
      const variant = product.variants.find((item: { id: string }) => item.id === getCartVariant(slug)) ?? product.variants[0];
      return variant ? { variantId: variant.id as string, quantity: Math.min(quantity, variant.stock as number) } : null;
    } catch { throw new Error("Catalog lookup failed"); }
  }));
  return items.filter((item): item is { variantId: string; quantity: number } => Boolean(item && item.quantity > 0));
}
let epoch=0;
let confirmedRaw:string|undefined;
let savedUser:string|undefined;
let confirmedRevision:string|undefined;
let suspended=false;
function applyCart(cart: ServerCart) {
  const values: Record<string, number> = {};
  for (const item of cart.items) { values[cartLineKey(item.slug, item.variantId)] = item.quantity; setCartVariant(item.slug, item.variantId); }
  confirmedRaw=JSON.stringify(values);savedUser=cart.userId;confirmedRevision=cart.revision;
  commerceStorage().setItem(CART_KEY, confirmedRaw);
  window.dispatchEvent(new Event("ggh-demo-change"));
}
async function performMerge(): Promise<boolean> {
  const generation=epoch;
  const response = await fetch("/api/buyer/cart", { cache: "no-store" });
  if (!response.ok) return false;
  const local = await selectedItems();
  const merged = await fetch("/api/buyer/cart/merge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: local }) });
  if (!merged.ok) return false;
  const result=await merged.json();if(generation!==epoch)return false;
  applyCart(result);
  window.dispatchEvent(new Event("ggh-cart-synced"));
  return true;
}
let mergeFlight:Promise<boolean>|undefined;
export function mergeGuestCart():Promise<boolean>{if(!mergeFlight)mergeFlight=performMerge().finally(()=>{mergeFlight=undefined;});return mergeFlight;}
let writes=Promise.resolve();
export function saveCart():Promise<void>{
  const generation=epoch;
  const task=writes.then(async()=>{
    if(generation!==epoch||suspended)return;
    const before=commerceStorage().getItem(CART_KEY)??"{}";
    if(before===confirmedRaw)return;
    try {
      if(!confirmedRevision)throw new Error("Reload the cart before saving changes");
      const items=await selectedItems();
      const response=await fetch("/api/buyer/cart",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({items,revision:confirmedRevision})});
      if(!response.ok)throw new Error("Cart could not be saved");
      const result=await response.json() as ServerCart;
      if(generation!==epoch || savedUser&&result.userId!==savedUser)return;
      if(commerceStorage().getItem(CART_KEY)===before)applyCart(result);
    }catch(error){
      if(generation!==epoch)return;
      if(confirmedRaw!==undefined&&commerceStorage().getItem(CART_KEY)===before){commerceStorage().setItem(CART_KEY,confirmedRaw);window.dispatchEvent(new Event("ggh-demo-change"));}
      window.dispatchEvent(new CustomEvent("ggh-commerce-error",{detail:"Cart could not be saved. Please retry your change."}));
      throw error;
    }
  });writes=task.catch(()=>{});return task;
}
if(typeof window!=="undefined")window.addEventListener("ggh-session-ended",()=>{epoch++;confirmedRaw=undefined;savedUser=undefined;confirmedRevision=undefined;mergeFlight=undefined;});

if(typeof window!=="undefined")window.addEventListener("ggh-order-confirmed",()=>{
  epoch++;suspended=true;mergeFlight=undefined;
  void performMerge().then(ok=>{if(!ok)throw new Error();}).catch(()=>window.dispatchEvent(new CustomEvent("ggh-commerce-error",{detail:"Your order is confirmed, but cart synchronization needs a retry. Reload your cart."}))).finally(()=>{suspended=false;});
});
