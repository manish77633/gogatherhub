"use client";

import Link from "next/link";
import { Check, ShoppingBag, ShoppingCart } from "lucide-react";
import { useDemoCommerce } from "@/features/buyer/components/storefront";

export function ProductActions({
  id,
  quantity = 1,
  compact = false,
  cartIcon = false,
}: {
  id: string;
  quantity?: number;
  compact?: boolean;
  cartIcon?: boolean;
}) {
  const { kits, cart, addToCart } = useDemoCommerce();
  const inKit = kits.some((kit) => Boolean(kit.items[id]));
  const inBag = Boolean(cart[id]) || inKit;
  return (
    <div className={`ggh-product-actions ${compact ? "compact" : ""}`}>
      {inBag ? (
        <Link href="/shop/cart" className="ggh-in-bag">
          <Check size={15} strokeWidth={2} aria-hidden="true" />
          <span>{inKit ? "In kit · View bag" : "Added · View bag"}</span>
        </Link>
      ) : (
        <button
          type="button"
          className="ggh-add-bag"
          onClick={() => addToCart(id, quantity)}
        >
          {cartIcon ? <ShoppingCart size={16} strokeWidth={1.9} aria-hidden="true" /> : <ShoppingBag size={15} strokeWidth={1.9} aria-hidden="true" />}
          <span>Add to bag</span>
        </button>
      )}
    </div>
  );
}
