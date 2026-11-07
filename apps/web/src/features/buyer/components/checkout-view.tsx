"use client";

import Link from "next/link";
import { commerceStorage } from "./commerce-storage";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDemoCommerce } from "@/features/buyer/components/storefront";
import { formatMoney } from "@/features/buyer/data/demo-data";
import { getCartVariant, cartProductSlug } from "@/features/buyer/components/variant-storage";
import { invalidateAccountPath } from "@/features/buyer/components/account-cache";
import { validateAddress, type AddressErrors, type AddressField } from "@/features/buyer/components/address-validation";

type Address = { id: string; fullName: string; line1: string; city: string; state: string; pincode: string };
type CatalogProduct = { slug: string; name: string; imageUrl: string | null; seller: { shopName: string }; variants: { id: string; label: string; price: string; stock: number }[] };
type Quote = { subtotal: string; discount: string; shipping: string; codFee: string; total: string };
import { loadRazorpay, type RazorpayResult } from "@/lib/razorpay-client";

export function CheckoutView({ initialCoupon }: { initialCoupon: string }) {
  const { cart, kits, setCartQuantity, removeKit } = useDemoCommerce();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [confirmation, setConfirmation] = useState<{ id: string; orderNumber: string; total: string; paid?: boolean } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotedKey, setQuotedKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [catalog, setCatalog] = useState<Record<string, CatalogProduct>>({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const addressSubmitting = useRef(false);
  const lines: { slug: string; quantity: number; kitGroupKey?: string }[] = [...Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([slug, quantity]) => ({ slug, quantity })),
    ...kits.flatMap(kit => Object.entries(kit.items).filter(([, quantity]) => quantity > 0).map(([slug, quantity]) => ({ slug, quantity, kitGroupKey: kit.key })))];
  const estimate = lines.reduce((sum, line) => {
    const product = catalog[line.slug];
    const variant = product?.variants.find(item => item.id === getCartVariant(line.slug)) ?? product?.variants[0];
    return sum + (variant ? Number(variant.price) * line.quantity : 0);
  }, 0);
  const slugKey = [...new Set(lines.map(line => line.slug))].sort().join("|");
  const quoteKey = JSON.stringify({ addressId, couponCode, paymentMethod, items: lines.map(line => ({ slug: line.slug, quantity: line.quantity, kitGroupKey: line.kitGroupKey, variantId: getCartVariant(line.slug) })) });
  const currentQuote = quotedKey === quoteKey ? quote : null;
  useEffect(() => {
    let active = true;
    const slugs = slugKey.split("|").filter(Boolean);
    if (!slugs.length) { setCatalog({}); setCatalogLoading(false); return; }
    setCatalogLoading(true); setCatalogError("");
    void Promise.all(slugs.map(async slug => {
      const response = await fetch(`/api/catalog/products/${encodeURIComponent(cartProductSlug(slug))}`);
      if (!response.ok) throw new Error("Some items are no longer available. Please review your bag.");
      const product = await response.json() as CatalogProduct;
      if (!product.variants.length) throw new Error(`${product.name} has no available variant.`);
      return [slug, product] as const;
    })).then(entries => { if (active) setCatalog(Object.fromEntries(entries)); })
      .catch(cause => { if (active) { setCatalog({}); setCatalogError(cause instanceof Error ? cause.message : "Could not load current item details."); } })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [slugKey]);

  useEffect(() => {
    if (!addressId || catalogLoading || catalogError || !lines.length) { setQuote(null); setQuoteError(""); return; }
    let active = true;
    setQuoteLoading(true); setQuote(null); setQuoteError("");
    const timer = setTimeout(async () => {
      try {
        const input = JSON.parse(quoteKey) as { addressId: string; couponCode: string; paymentMethod: "COD" | "ONLINE"; items: { slug: string; quantity: number; kitGroupKey?: string; variantId?: string }[] };
        const items = input.items.map(line => {
          const variants = catalog[line.slug]?.variants ?? [];
          const variant = variants.find(item => item.id === line.variantId) ?? variants[0];
          if (!variant) throw new Error("An item is unavailable.");
          return { variantId: variant.id, quantity: line.quantity, ...(line.kitGroupKey ? { kitGroupKey: line.kitGroupKey } : {}) };
        });
        const response = await fetch("/api/buyer/orders/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addressId: input.addressId, couponCode: input.couponCode || undefined, paymentMethod: input.paymentMethod, items }) });
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : result.error?.message ?? "Could not calculate order total.");
        if (active) { setQuote(result as Quote); setQuotedKey(quoteKey); }
      } catch (cause) { if (active) setQuoteError(cause instanceof Error ? cause.message : "Could not calculate order total."); }
      finally { if (active) setQuoteLoading(false); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [addressId, catalog, catalogLoading, catalogError, quoteKey]);

  useEffect(() => {
    let active = true;
    fetch("/api/buyer/addresses").then(async response => {
      if (!response.ok) throw new Error("Could not load addresses.");
      return response.json() as Promise<Address[]>;
    }).then(items => { if (active) { setAddresses(items); setAddressId(items[0]?.id ?? ""); } })
      .catch(() => { if (active) setError("Address service is unavailable. Please try again later."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const errors = validateAddress(data);
    setAddressErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/buyer/addresses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Could not save address.");
      setAddresses(current => [...current, result]); setAddressId(result.id);
      event.currentTarget.reset(); setAddressErrors({});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save address."); }
    finally { setBusy(false); }
  }

  async function placeOrder() {
    if (submitting.current || !addressId || !lines.length || catalogLoading || catalogError || !currentQuote || quoteLoading || quoteError) return;
    submitting.current = true;
    setBusy(true); setError("");
    let modalOpened = false;
    try {
      const Razorpay = paymentMethod === "ONLINE" ? await loadRazorpay() : null;
      const items = lines.map(line => {
        const variants = catalog[line.slug]?.variants ?? [];
        const variant = variants.find(item => item.id === getCartVariant(line.slug)) ?? variants[0];
        if (!variant || variant.stock < line.quantity) throw new Error(`${catalog[line.slug]?.name ?? "An item"} is unavailable in the requested quantity.`);
        return { variantId: variant.id, quantity: line.quantity, ...(line.kitGroupKey ? { kitGroupKey: line.kitGroupKey } : {}) };
      });
      const attempt = sessionStorage.getItem("ggh_checkout_attempt");
      const saved = attempt ? JSON.parse(attempt) as { quoteKey: string; key: string } : null;
      idempotencyKey.current = saved?.quoteKey === quoteKey ? saved.key : crypto.randomUUID();
      sessionStorage.setItem("ggh_checkout_attempt", JSON.stringify({ quoteKey, key: idempotencyKey.current }));
      const response = await fetch("/api/buyer/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addressId, couponCode: couponCode || undefined, paymentMethod, idempotencyKey: idempotencyKey.current, items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : result.error?.message ?? "Order could not be placed.");
      const complete = (order: { id: string; orderNumber: string; total: string; paid?: boolean }) => {
        setConfirmation(order);
        sessionStorage.removeItem("ggh_checkout_attempt");
        invalidateAccountPath("orders");
        const latestCart=JSON.parse(commerceStorage().getItem("ggh-demo-cart")??"{}");
        for(const [slug,quantity] of Object.entries(cart))if(latestCart[slug]===quantity)setCartQuantity(slug,0);
        const latestKits=JSON.parse(commerceStorage().getItem("ggh-demo-kits")??"[]");
        for(const kit of kits){const current=latestKits.find((item:{key:string})=>item.key===kit.key);if(current&&JSON.stringify(current.items)===JSON.stringify(kit.items))removeKit(kit.key);}
        window.dispatchEvent(new Event("ggh-order-confirmed"));
      };
      if (paymentMethod === "COD" || result.paid) { complete(result); return; }
      if (!result.razorpayOrderId || !result.keyId) throw new Error("Payment order could not be prepared.");
      if (!Razorpay) throw new Error("Payment window could not load.");
      const checkout = new Razorpay({ key: result.keyId, order_id: result.razorpayOrderId, amount: result.amount, currency: "INR", name: "Go Gather Hub", description: `Order ${result.orderNumber}`, modal: { ondismiss: () => { submitting.current = false; setBusy(false); setError("Payment window closed. Your order is awaiting payment; you can retry securely."); } }, handler: async (payment: RazorpayResult) => {
        setBusy(true);
        try {
          const verified = await fetch(`/api/buyer/orders/${result.id}/payment/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payment) });
          const confirmed = await verified.json();
          if (!verified.ok) throw new Error(confirmed.message ?? "Payment could not be verified. Please contact support with your payment ID.");
          complete(confirmed);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Payment verification failed."); }
        finally { submitting.current = false; setBusy(false); }
      } });
      checkout.on("payment.failed", failure => setError(failure.error?.description ?? "Payment failed. Please try again."));
      checkout.open();
      modalOpened = true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Order could not be placed."); }
    finally { if (!modalOpened) { submitting.current = false; setBusy(false); } }
  }

  if (confirmation) { const address = addresses.find(item => item.id === addressId); return <div className="ggh-checkout-confirmation" role="status"><div className="ggh-confirm-check" aria-hidden="true">✓</div><p className="ggh-page-eyebrow">Go Gather Hub</p><h1>Order confirmed!</h1><p>{confirmation.paid ? "Your online payment was successful." : "Thank you for shopping with us. Your cash on delivery order has been placed."}</p><strong className="ggh-confirm-number">Order #{confirmation.orderNumber}</strong><div className="ggh-confirm-steps" aria-label="Order status"><span className="is-current">✓<small>Confirmed</small></span><span>◇<small>Processing</small></span><span>⇥<small>Shipped</small></span><span>◎<small>Delivered</small></span></div>{address && <div className="ggh-confirm-address"><strong>Delivering to</strong><p>{address.fullName}<br />{address.line1}<br />{address.city}, {address.state} – {address.pincode}</p></div>}<div className="ggh-confirm-amount"><span>{confirmation.paid ? "Amount paid" : "Amount due on delivery"}</span><strong>{formatMoney(Number(confirmation.total))}</strong></div><Link className="ggh-confirm-primary" href={`/shop/account/orders/${confirmation.id}`}>Track my order</Link><Link className="ggh-confirm-secondary" href="/shop">Continue shopping</Link></div>; }
  return <div className="ggh-checkout-page">
    <div><p className="ggh-page-eyebrow">Secure checkout</p><h1>Complete your order</h1><p>Choose cash on delivery or pay online. Final pricing and stock are checked by the server.</p></div>
    {error && <p className="ggh-auth-pending" role="alert">{error}</p>}
    <div className="ggh-cart-layout min-w-0"><section className="ggh-cart-items min-w-0">
      <h2>Delivery address</h2>
      {loading ? <p>Loading addresses…</p> : addresses.length ? <div className="ggh-checkout-addresses">{addresses.map(address => <label key={address.id}><input type="radio" name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)} /> <span><strong>{address.fullName}</strong><br />{address.line1}, {address.city}, {address.state} {address.pincode}</span></label>)}</div> : <p>Add a delivery address to continue.</p>}
      <details><summary>Add a new address</summary><form className="ggh-auth-form" onSubmit={addAddress} noValidate onInput={event => { const field = (event.target as HTMLInputElement).name as AddressField; if (field && addressErrors[field]) setAddressErrors(validateAddress(Object.fromEntries(new FormData(event.currentTarget)))); }}>
        {([ ["fullName", "Full name"], ["phone", "Phone"], ["line1", "Address line 1"], ["line2", "Address line 2"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"] ] as const).map(([name, label]) => <label key={name}>{label}<input name={name} required={name !== "line2"} maxLength={name === "fullName" ? 120 : name === "line1" || name === "line2" ? 200 : name === "phone" ? 10 : name === "pincode" ? 6 : 100} inputMode={name === "phone" || name === "pincode" ? "numeric" : undefined} aria-invalid={Boolean(addressErrors[name])} aria-describedby={addressErrors[name] ? `checkout-${name}-error` : undefined} />{addressErrors[name] && <small id={`checkout-${name}-error`} role="alert" className="ggh-account-error">{addressErrors[name]}</small>}</label>)}
        <button className="ggh-primary-action" disabled={busy}>Save address</button>
      </form></details>
      <h2>Your items</h2>{catalogLoading && lines.length > 0 && <p role="status">Loading current product details…</p>}{catalogError && <p role="alert" className="ggh-auth-pending">{catalogError} <Link href="/shop/cart">Review bag</Link></p>}{lines.length ? !catalogLoading && !catalogError && <div className="ggh-checkout-lines">{lines.map((line, index) => {
        const product = catalog[line.slug];
        const variant = product?.variants.find(item => item.id === getCartVariant(line.slug)) ?? product?.variants[0];
        if (!product || !variant) return null;
        return <article className="ggh-checkout-line" key={`${line.slug}-${line.kitGroupKey ?? "single"}-${index}`}><Link className="ggh-checkout-line-image" href={`/shop/products/${product.slug}`}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Image unavailable</span>}</Link><div className="ggh-checkout-line-copy"><span className="ggh-checkout-line-seller">{product.seller.shopName}</span><Link href={`/shop/products/${product.slug}`}>{product.name}</Link><small>{variant.label}{line.kitGroupKey ? " · Kit item" : ""}</small></div><strong>{formatMoney(Number(variant.price) * line.quantity)}</strong></article>;
      })}</div> : <p>Your bag is empty. <Link href="/shop/products">Browse products</Link></p>}
      <h2>Payment method</h2><div className="ggh-checkout-payment"><label><input type="radio" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} name="payment" /><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span></label><label><input type="radio" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} name="payment" /><span><strong>Pay online with Razorpay</strong><small>Cards, UPI and other supported methods.</small></span></label></div>
    </section><aside className="ggh-order-summary ggh-checkout-summary min-w-0"><h2>Order summary</h2><div className="ggh-summary-lines min-w-0">{!catalogLoading && !catalogError && lines.map((line, index) => { const product = catalog[line.slug]; const variant = product?.variants.find(item => item.id === getCartVariant(line.slug)) ?? product?.variants[0]; if (!product || !variant) return null; return <article className="ggh-summary-line min-w-0" key={`${line.slug}-${line.kitGroupKey ?? "single"}-${index}`}><div className="ggh-summary-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>No image</span>}</div><div className="ggh-summary-copy min-w-0"><strong>{product.name}</strong><small>{variant.label}</small></div><strong>{formatMoney(Number(variant.price) * line.quantity)}</strong></article>; })}</div><div className="ggh-summary-totals min-w-0"><div><span>Subtotal</span><strong>{catalogLoading || catalogError ? "Calculating…" : formatMoney(currentQuote ? Number(currentQuote.subtotal) : estimate)}</strong></div>{currentQuote && Number(currentQuote.discount) > 0 && <div><span>Coupon discount</span><strong>−{formatMoney(Number(currentQuote.discount))}</strong></div>}<div><span>Shipping</span><strong className={currentQuote && Number(currentQuote.shipping) === 0 ? "ggh-summary-free" : ""}>{currentQuote ? Number(currentQuote.shipping) === 0 ? "Free" : formatMoney(Number(currentQuote.shipping)) : addressId ? "Calculating…" : "Select address"}</strong></div>{currentQuote && Number(currentQuote.codFee) > 0 && <div><span>COD fee</span><strong>{formatMoney(Number(currentQuote.codFee))}</strong></div>}<div className="ggh-summary-total"><span>Total</span><strong>{currentQuote ? formatMoney(Number(currentQuote.total)) : addressId ? "Calculating…" : "Select address"}</strong></div></div><div className="ggh-summary-payment">Payment: <strong>{paymentMethod === "COD" ? "Cash on Delivery" : "Razorpay online"}</strong></div><label htmlFor="checkout-coupon">Coupon code</label><input id="checkout-coupon" value={couponCode} onChange={event => setCouponCode(event.target.value.toUpperCase())} maxLength={40} placeholder="Optional" />{quoteLoading && <p role="status">Calculating total…</p>}{quoteError && <p role="alert" className="ggh-account-error">{quoteError}</p>}<button className="ggh-primary-action" disabled={!addressId || !lines.length || busy || loading || catalogLoading || Boolean(catalogError) || quoteLoading || !currentQuote || Boolean(quoteError)} onClick={placeOrder}>{busy ? "Please wait…" : paymentMethod === "COD" ? "Place COD Order" : currentQuote ? `Pay ${formatMoney(Number(currentQuote.total))}` : "Calculating…"}</button><Link href="/shop/cart">← Back to bag</Link></aside></div>
  </div>;
}


