const KEY = "ggh-cart-variants";
export function setCartVariant(slug: string, variantId: string) {
  try { const current = JSON.parse(localStorage.getItem(KEY) ?? "{}"); localStorage.setItem(KEY, JSON.stringify({ ...current, [slug]: variantId })); } catch { localStorage.setItem(KEY, JSON.stringify({ [slug]: variantId })); }
}
export function getCartVariant(slug: string): string | undefined {
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? "{}")[slug]; return typeof value === "string" ? value : undefined; } catch { return undefined; }
}
