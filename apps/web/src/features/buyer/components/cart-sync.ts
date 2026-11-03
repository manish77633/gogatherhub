import { getCartVariant, setCartVariant } from "./variant-storage";

const CART_KEY = "ggh-demo-cart";
type ServerCart = { userId: string; items: { slug: string; variantId: string; quantity: number }[] };

function localCart(): Record<string, number> {
  try { const value = JSON.parse(localStorage.getItem(CART_KEY) ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
async function selectedItems() {
  const entries = Object.entries(localCart()).filter(([slug, quantity]) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && Number.isInteger(quantity) && quantity > 0 && quantity <= 10000);
  const items = await Promise.all(entries.map(async ([slug, quantity]) => {
    try {
      const response = await fetch(`/api/catalog/products/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("Catalog lookup failed");
      const product = await response.json();
      const variant = product.variants.find((item: { id: string }) => item.id === getCartVariant(slug)) ?? product.variants[0];
      return variant ? { variantId: variant.id as string, quantity: Math.min(quantity, variant.stock as number) } : null;
    } catch { throw new Error("Catalog lookup failed"); }
  }));
  return items.filter((item): item is { variantId: string; quantity: number } => Boolean(item && item.quantity > 0));
}
function applyCart(cart: ServerCart) {
  const values: Record<string, number> = {};
  for (const item of cart.items) { values[item.slug] = item.quantity; setCartVariant(item.slug, item.variantId); }
  localStorage.setItem(CART_KEY, JSON.stringify(values));
  window.dispatchEvent(new Event("ggh-demo-change"));
}
export async function mergeGuestCart(): Promise<boolean> {
  const response = await fetch("/api/buyer/cart", { cache: "no-store" });
  if (!response.ok) return false;
  const local = await selectedItems();
  const merged = await fetch("/api/buyer/cart/merge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: local }) });
  if (!merged.ok) return false;
  applyCart(await merged.json());
  window.dispatchEvent(new Event("ggh-cart-synced"));
  return true;
}
export async function saveCart(): Promise<void> {
  const items = await selectedItems();
  await fetch("/api/buyer/cart", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) });
}
