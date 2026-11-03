import { commerceStorage } from "./commerce-storage";
const KEY = "ggh-cart-variants";
export function setCartVariant(slug: string, variantId: string) {
  try { const current = JSON.parse(commerceStorage().getItem(KEY) ?? "{}"); commerceStorage().setItem(KEY, JSON.stringify({ ...current, [slug]: variantId })); } catch { commerceStorage().setItem(KEY, JSON.stringify({ [slug]: variantId })); }
}
export function getCartVariant(slug: string): string | undefined {
  const embedded = VARIANT_SUFFIX.exec(slug)?.[1];
  if (embedded) return embedded;
  try { const value = JSON.parse(commerceStorage().getItem(KEY) ?? "{}")[slug]; return typeof value === "string" ? value : undefined; } catch { return undefined; }
}

const VARIANT_SUFFIX = /-v-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
export function cartProductSlug(key: string): string { return key.replace(VARIANT_SUFFIX, ""); }
export function cartLineKey(slug: string, variantId?: string): string { return variantId ? `${cartProductSlug(slug)}-v-${variantId}` : slug; }
