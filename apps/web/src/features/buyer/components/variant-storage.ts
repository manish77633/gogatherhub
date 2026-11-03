import { commerceStorage } from "./commerce-storage";
const KEY = "ggh-cart-variants";
export function setCartVariant(slug: string, variantId: string) {
  try { const current = JSON.parse(commerceStorage().getItem(KEY) ?? "{}"); commerceStorage().setItem(KEY, JSON.stringify({ ...current, [slug]: variantId })); } catch { commerceStorage().setItem(KEY, JSON.stringify({ [slug]: variantId })); }
}
export function getCartVariant(slug: string): string | undefined {
  try { const value = JSON.parse(commerceStorage().getItem(KEY) ?? "{}")[slug]; return typeof value === "string" ? value : undefined; } catch { return undefined; }
}
