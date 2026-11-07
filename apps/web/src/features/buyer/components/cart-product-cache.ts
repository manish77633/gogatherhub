import type { LiveProduct } from "./live-catalog";

const prefix = "ggh-cart-product:";
export function rememberCartProduct(product: LiveProduct) {
  try { localStorage.setItem(prefix + product.slug, JSON.stringify(product)); } catch { /* Storage may be disabled. */ }
}
export function recalledCartProduct(slug: string): LiveProduct | null {
  try {
    const value = localStorage.getItem(prefix + slug);
    return value ? JSON.parse(value) as LiveProduct : null;
  } catch { return null; }
}
