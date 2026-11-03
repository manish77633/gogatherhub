"use client";
import { cartProductSlug, getCartVariant } from "./variant-storage";
import { GoogleMark } from "./google-mark";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sparkles, Star } from "lucide-react";
import { formatMoney, products, type DemoProduct } from "@/features/buyer/data/demo-data";
const staticProducts = products;
import { StoreIcon, useDemoCommerce } from "@/features/buyer/components/storefront";
import { ProductActions } from "@/features/buyer/components/product-actions";
import { mergeGuestCart } from "@/features/buyer/components/cart-sync";
import { mergeWishlist } from "@/features/buyer/components/wishlist-sync";
import { demoCombos } from "@/features/buyer/data/store-catalog";

const discountFor = (product: DemoProduct) =>
  Math.round((1 - product.price / product.compareAt) * 100);

export function ShopBreadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="ggh-breadcrumbs" aria-label="Breadcrumb">
      <Link href="/shop">Home</Link>
      {items.map((item) => (
        <span key={item.label}>
          <span aria-hidden="true">/</span>
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <strong aria-current="page">{item.label}</strong>
          )}
        </span>
      ))}
    </nav>
  );
}

export function CatalogCard({ product }: { product: DemoProduct }) {
  const { toggleWishlist, wishlist } = useDemoCommerce();
  const saved = wishlist.includes(product.id);
  return (
    <article className="ggh-catalog-card">
      <div className="ggh-catalog-photo">
        <Link
          href={`/shop/products/${cartProductSlug(product.id)}`}
          aria-label={`View ${product.name}`}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
          />
        </Link>
        {product.badge && (
          <span className="ggh-catalog-badge">{product.badge}</span>
        )}
        <button
          type="button"
          className={`ggh-catalog-wish ${saved ? "saved" : ""}`}
          aria-label={
            saved
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
          aria-pressed={saved}
          onClick={() => toggleWishlist(product.id)}
        >
          <StoreIcon name="heart" size={18} />
        </button>
      </div>
      <div className="ggh-catalog-info">
        <p>{product.brand}</p>
        <Link href={`/shop/products/${cartProductSlug(product.id)}`}>{product.name}</Link>
        <span className="ggh-catalog-rating">
          <Star
            size={13}
            fill="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          />{" "}
          {product.rating} <small>Demo rating</small>
        </span>
        <div className="ggh-catalog-price">
          <strong>{formatMoney(product.price)}</strong>
          <s>{formatMoney(product.compareAt)}</s>
          <em>-{discountFor(product)}%</em>
        </div>
        <ProductActions id={product.id} />
      </div>
    </article>
  );
}

export function CatalogGrid({ items }: { items: DemoProduct[] }) {
  return (
    <div className="ggh-catalog-grid">
      {items.map((product) => (
        <CatalogCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductDetailView({ product }: { product: DemoProduct }) {
  const [quantity, setQuantity] = useState(1);
  const { toggleWishlist, wishlist } = useDemoCommerce();
  const saved = wishlist.includes(product.id);
  const related = products
    .filter(
      (item) => item.id !== product.id && item.category === product.category,
    )
    .slice(0, 4);
  return (
    <>
      <div className="ggh-detail-grid">
        <div className="ggh-detail-gallery">
          <div className="ggh-detail-photo">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 767px) 100vw, 52vw"
            />
          </div>
          <p>Illustrative product photo · actual inventory not connected</p>
        </div>
        <div className="ggh-detail-content">
          <p className="ggh-page-eyebrow">
            {product.brand} / {product.category}
          </p>
          <h1>{product.name}</h1>
          <div className="ggh-detail-rating">
            <span>
              <Star
                size={15}
                fill="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              />{" "}
              {product.rating}
            </span>
            <small>Demo rating · Reviews coming later</small>
          </div>
          <div className="ggh-detail-price">
            <strong>{formatMoney(product.price)}</strong>
            <s>{formatMoney(product.compareAt)}</s>
            <span>{discountFor(product)}% off</span>
          </div>
          <p className="ggh-detail-tax">
            Pricing is illustrative. Final taxes and delivery charges will be
            shown when checkout is connected.
          </p>
          <div className="ggh-detail-divider" />
          <h2>A little something special</h2>
          <p className="ggh-detail-description">{product.description}</p>
          <div className="ggh-detail-controls">
            <div className="ggh-quantity" aria-label="Quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                −
              </button>
              <output>{quantity}</output>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= 10}
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <ProductActions id={product.id} quantity={quantity} />
            <button
              type="button"
              className={`ggh-detail-wish ${saved ? "saved" : ""}`}
              aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={saved}
              onClick={() => toggleWishlist(product.id)}
            >
              <StoreIcon name="heart" size={20} />
            </button>
          </div>
          <div className="ggh-detail-benefits">
            <div>
              <StoreIcon name="truck" size={20} />
              <span>Delivery options appear at checkout</span>
            </div>
            <div>
              <StoreIcon name="shield" size={20} />
              <span>Secure payment integration pending</span>
            </div>
            <div>
              <StoreIcon name="support" size={20} />
              <span>
                Need help? See our <a href="/shop#faqs">FAQ</a>
              </span>
            </div>
          </div>
          <div className="ggh-detail-accordions">
            <details open>
              <summary>Product details</summary>
              <p>{product.description}</p>
              <p>
                Brand: {product.brand} · Category: {product.category}
              </p>
            </details>
            <details>
              <summary>Delivery & returns</summary>
              <p>
                Delivery estimates and return policy will be published before
                live checkout.
              </p>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="ggh-related">
          <div className="ggh-page-section-head">
            <div>
              <p className="ggh-page-eyebrow">Discover more</p>
              <h2>You may also like</h2>
            </div>
            <Link href="/shop/products">
              View all <StoreIcon name="arrow" size={16} />
            </Link>
          </div>
          <CatalogGrid items={related} />
        </section>
      )}
    </>
  );
}

function SelectionHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="ggh-page-heading">
      <div>
        <p className="ggh-page-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function CartView() {
  const {
    cart,
    kits,
    setCartQuantity,
    removeFromCart,
    setKitQuantity,
    removeKit,
  } = useDemoCommerce();
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [remoteProducts, setRemoteProducts] = useState<DemoProduct[]>([]);
  const cartKey = Object.keys(cart).sort().join("|");
  useEffect(() => {
    let active = true;
    const slugs = Object.keys(cart);
    if (!slugs.length) return;
    void Promise.all(slugs.map(async slug => {
      const response = await fetch(`/api/catalog/products/${encodeURIComponent(cartProductSlug(slug))}`);
      if (!response.ok) return null;
      const item = await response.json();
      return { id: slug, name: `${item.name} · ${item.variants.find((v: { id: string }) => v.id === getCartVariant(slug))?.label ?? item.variants[0]?.label ?? ""}`, brand: item.seller.shopName, category: item.category.name, price: Number((item.variants.find((v: { id: string }) => v.id === getCartVariant(slug)) ?? item.variants[0])?.price ?? 0), compareAt: Number(item.variants[0]?.compareAt ?? item.variants[0]?.price ?? 0), rating: 0, image: item.imageUrl?.startsWith("/") || item.imageUrl?.startsWith("https://images.unsplash.com/") ? item.imageUrl : "/gogatherhub-logo.png", description: item.description } as DemoProduct;
    })).then(items => { if (active) setRemoteProducts(items.filter((item): item is DemoProduct => Boolean(item))); }).catch(() => { if (active) setRemoteProducts([]); });
    return () => { active = false; };
  }, [cartKey]);
  const products = [...staticProducts.filter(base => !remoteProducts.some(remote => remote.id === base.id)), ...remoteProducts];
  const items = products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({
      product,
      quantity: cart[product.id],
    }));
  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    kits.reduce(
      (sum, kit) =>
        sum + Object.values(kit.items).reduce((count, qty) => count + qty, 0),
      0,
    ),
  );
  const individualTotal = items.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  );
  const kitTotal = kits.reduce(
    (sum, kit) =>
      sum +
      Object.entries(kit.items).reduce(
        (amount, [id, qty]) =>
          amount +
          (products.find((product) => product.id === id)?.price ?? 0) * qty,
        0,
      ),
    0,
  );
  const subtotal = individualTotal + kitTotal;
  return (
    <>
      <SelectionHeader
        eyebrow="Your selection"
        title="Shopping Bag"
        description="A thoughtful collection starts here. Your demo bag is stored only in this browser."
      >
        <span className="ggh-item-count">
          {cartCount} {cartCount === 1 ? "item" : "items"}
        </span>
      </SelectionHeader>
      {items.length === 0 && kits.length === 0 ? (
        <EmptyBuyerState
          title="Your bag is waiting for something special."
          description="Explore our collection and add a piece you love."
          action="Continue Shopping"
        />
      ) : (
        <div className="ggh-cart-layout min-w-0">
          <section className="ggh-cart-items min-w-0" aria-label="Bag items">
            {kits.map((kit) => {
              const combo = demoCombos.find(
                (entry) => entry.id === kit.comboId,
              );
              const amount = Object.entries(kit.items).reduce(
                (sum, [id, qty]) =>
                  sum +
                  (products.find((product) => product.id === id)?.price ?? 0) *
                    qty,
                0,
              );
              return (
                <div className="ggh-cart-kit min-w-0" key={kit.key}>
                  <div className="ggh-cart-kit-head">
                    <div>
                      <small>YOUR CUSTOM KIT</small>
                      <h2>{combo?.name ?? "Custom celebration kit"}</h2>
                      <span>
                        {Object.keys(kit.items).length} products ·{" "}
                        {Object.values(kit.items).reduce(
                          (sum, qty) => sum + qty,
                          0,
                        )}{" "}
                        pieces
                      </span>
                    </div>
                    <div>
                      <strong>{formatMoney(amount)}</strong>
                      <button
                        type="button"
                        className="ggh-text-button"
                        onClick={() => removeKit(kit.key)}
                      >
                        Remove kit
                      </button>
                    </div>
                  </div>
                  <div className="ggh-cart-kit-lines">
                    {Object.entries(kit.items).map(([id, qty]) => {
                      const product = products.find((item) => item.id === id);
                      if (!product) return null;
                      return (
                        <article className="ggh-cart-item min-w-0" key={id}>
                          <Link
                            href={`/shop/products/${id}`}
                            className="ggh-cart-photo"
                          >
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="120px"
                            />
                          </Link>
                          <div className="ggh-cart-item-copy">
                            <p>{product.category}</p>
                            <Link href={`/shop/products/${id}`}>
                              {product.name}
                            </Link>
                            <small>
                              {formatMoney(product.price)} each · Inside kit
                            </small>
                            <button
                              type="button"
                              className="ggh-text-button"
                              onClick={() => setKitQuantity(kit.key, id, 0)}
                            >
                              Remove from kit
                            </button>
                          </div>
                          <div className="ggh-cart-item-end">
                            <strong>{formatMoney(product.price * qty)}</strong>
                            <div className="ggh-quantity">
                              <button
                                type="button"
                                aria-label={`Decrease ${product.name} in kit`}
                                onClick={() =>
                                  setKitQuantity(kit.key, id, qty - 1)
                                }
                              >
                                −
                              </button>
                              <input
                                key={`${kit.key}-${id}-${qty}`}
                                type="number"
                                min="1"
                                max="10000"
                                defaultValue={qty}
                                inputMode="numeric"
                                aria-label={`Quantity for ${product.name} in kit`}
                                onBlur={(event) => {
                                  const value = Number(event.target.value);
                                  if (
                                    Number.isInteger(value) &&
                                    value >= 1 &&
                                    value <= 10000
                                  )
                                    setKitQuantity(kit.key, id, value);
                                  else event.target.value = String(qty);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                disabled={qty >= 10000}
                                aria-label={`Increase ${product.name} in kit`}
                                onClick={() =>
                                  setKitQuantity(kit.key, id, qty + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <Link
                    className="ggh-cart-kit-edit"
                    href={`/shop/combos/${kit.comboId}`}
                  >
                    Browse kit inspiration →
                  </Link>
                </div>
              );
            })}
            {items.length > 0 && (
              <h2 className="ggh-cart-group-title">Individual products</h2>
            )}
            {items.map(({ product, quantity }) => (
              <article className="ggh-cart-item min-w-0" key={product.id}>
                <Link
                  href={`/shop/products/${cartProductSlug(product.id)}`}
                  className="ggh-cart-photo"
                >
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="120px"
                  />
                </Link>
                <div className="ggh-cart-item-copy">
                  <p>{product.brand}</p>
                  <Link href={`/shop/products/${cartProductSlug(product.id)}`}>
                    {product.name}
                  </Link>
                  <small>Demo product · availability to be confirmed</small>
                  <button
                    type="button"
                    className="ggh-text-button"
                    onClick={() => removeFromCart(product.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="ggh-cart-item-end">
                  <strong>{formatMoney(product.price * quantity)}</strong>
                  <div
                    className="ggh-quantity"
                    aria-label={`Quantity for ${product.name}`}
                  >
                    <button
                      type="button"
                      aria-label={`Decrease ${product.name} quantity`}
                      onClick={() => setCartQuantity(product.id, quantity - 1)}
                    >
                      −
                    </button>
                    <input
                      key={`${product.id}-${quantity}`}
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue={quantity}
                      inputMode="numeric"
                      aria-label={`Quantity for ${product.name}`}
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (
                          Number.isInteger(value) &&
                          value >= 1 &&
                          value <= 10000
                        )
                          setCartQuantity(product.id, value);
                        else event.target.value = String(quantity);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${product.name} quantity`}
                      disabled={quantity >= 10000}
                      onClick={() => setCartQuantity(product.id, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="ggh-order-summary min-w-0">
            <h2>Order Summary</h2>
            <div>
              <span>Custom kits ({kits.length})</span>
              <strong>{formatMoney(kitTotal)}</strong>
            </div>
            <div>
              <span>Individual products ({items.length})</span>
              <strong>{formatMoney(individualTotal)}</strong>
            </div>
            <div>
              <span>Items ({cartCount} pieces)</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <span>Calculated later</span>
            </div>
            <div>
              <span>Taxes</span>
              <span>Calculated later</span>
            </div>
            <form
              className="ggh-coupon-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!coupon.trim()) { setCouponMessage("Enter a coupon code first."); return; }
                try {
                  const response = await fetch(`/api/catalog/coupons/${encodeURIComponent(coupon.trim())}`);
                  if (!response.ok) { setCouponMessage("Coupon unavailable or expired."); return; }
                  const offer = await response.json() as { discountAmount: string; minSubtotal: string };
                  setCouponMessage(subtotal >= Number(offer.minSubtotal) ? `Eligible for ${formatMoney(Number(offer.discountAmount))} off. Final discount is checked at checkout.` : `Add ${formatMoney(Number(offer.minSubtotal) - subtotal)} more to use this coupon.`);
                } catch { setCouponMessage("Could not check coupon right now."); }
              }}
            >
              <label htmlFor="cart-coupon">Have a coupon?</label>
              <div>
                <input
                  id="cart-coupon"
                  value={coupon}
                  onChange={(event) => {
                    setCoupon(event.target.value.toUpperCase());
                    setCouponMessage("");
                  }}
                  maxLength={32}
                  placeholder="Enter code"
                />
                <button type="submit">Check</button>
              </div>
              {couponMessage && <small role="status">{couponMessage}</small>}
            </form>
            <hr />
            <div className="ggh-total">
              <span>Estimated subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <Link href={`/shop/checkout${coupon.trim() ? `?coupon=${encodeURIComponent(coupon.trim())}` : ""}`} className="ggh-primary-action">Continue to checkout</Link>
            <p>COD availability, stock and the final total are checked during checkout. Online payments are not connected yet.</p>
            <Link href="/shop/products">Continue shopping →</Link>
          </aside>
        </div>
      )}
    </>
  );
}

export function WishlistView() {
  const { wishlist } = useDemoCommerce();
  const items = products.filter((product) => wishlist.includes(product.id));
  return (
    <>
      <SelectionHeader
        eyebrow="Saved with love"
        title="Your Wishlist"
        description="Keep your favorite finds close. Saved items live in this browser until accounts are connected."
      >
        <span className="ggh-item-count">{items.length} saved</span>
      </SelectionHeader>
      {items.length ? (
        <CatalogGrid items={items} />
      ) : (
        <EmptyBuyerState
          title="A little inspiration belongs here."
          description="Tap the heart on any product to save it for later."
          action="Explore Products"
        />
      )}
    </>
  );
}

function EmptyBuyerState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="ggh-buyer-empty">
      <Sparkles size={28} strokeWidth={1.7} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href="/shop/products" className="ggh-primary-action">
        {action} <StoreIcon name="arrow" size={16} />
      </Link>
    </div>
  );
}

export function AuthPreview({ mode, nextPath, admin = false, authError }: { mode: "login" | "register"; nextPath?: string; admin?: boolean; authError?: string }) {
  const register = mode === "register";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (register && password !== data.get("confirmPassword")) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(register ? { name, email, password } : { email, password }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Please check your details and try again."); return; }
      if (admin && !["ADMIN", "ADMIN_STAFF"].includes(result.role)) { await fetch("/api/auth/logout", { method: "POST" }); setError("This account does not have admin access."); return; }
      if (result.role === "BUYER") { await mergeGuestCart().catch(() => false); await mergeWishlist().catch(() => {}); }
      router.push(nextPath ?? (["ADMIN", "ADMIN_STAFF"].includes(result.role) ? "/admin" : result.role === "SELLER" ? "/seller" : "/shop"));
      router.refresh();
    } catch { setError("Could not connect to the account service."); }
    finally { setBusy(false); }
  }
  return (
    <div className="ggh-auth-layout">
      <div className="ggh-auth-art">
        <Image
          src="/hero-gift-v1.png"
          alt="Elegant wrapped gift"
          fill
          sizes="(max-width: 767px) 100vw, 50vw"
        />
        <div>
          <p>GO GATHER HUB</p>
          <h2>Every celebration deserves something special.</h2>
        </div>
      </div>
      <div className="ggh-auth-panel">
        <div className="ggh-auth-inner">
          <p className="ggh-page-eyebrow">
            {admin ? "Admin workspace" : register ? "Join the celebration" : "Welcome back"}
          </p>
          <h1>
            {admin ? "Admin sign in" : register ? "Create your account" : "Sign in to your account"}
          </h1>
          <p className="ggh-auth-lead">
            {admin ? "Sign in with an administrator account to manage the marketplace." : register
              ? "Save your favorites and enjoy a more personal shopping experience."
              : "Sign in to see your orders and save your favorite finds."}
          </p>
          <form
            className="ggh-auth-form"
            onSubmit={submit}
          >
            {register && (
              <label>
                Full name
                <input
                  type="text"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Your name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                required
                minLength={10}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "Create a password" : "Enter your password"
                }
              />
            </label>
            {register && (
              <label>
                Confirm password
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                />
              </label>
            )}
            {(error || authError?.startsWith("google")) && <p className="ggh-auth-pending" role="alert">{error || (authError === "google-unavailable" ? "Account service is unavailable. Please try again after it starts." : "Google sign in failed. Please try again.")}</p>}
            <button type="submit" className="ggh-primary-action" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            </button>
          </form>
          {!admin && <a className="ggh-google-button" href={`/api/auth/google/start${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}><GoogleMark /> Continue with Google</a>}
          {!admin && <p className="ggh-auth-switch">
            {register ? "Already have an account?" : "New to Go Gather Hub?"}{" "}
            <Link href={register ? "/shop/login" : "/shop/register"}>
              {register ? "Sign in" : "Create account"}
            </Link>
          </p>}
          {!admin && <p className="ggh-auth-switch">Want to sell? <Link href="/shop/seller-register">Create a seller account</Link></p>}
          <Link className="ggh-auth-back" href="/shop">
            ← Back to shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
