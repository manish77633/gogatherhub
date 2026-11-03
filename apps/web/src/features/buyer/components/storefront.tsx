"use client";
import { cartLineKey, getCartVariant } from "./variant-storage";
import { commerceStorage } from "./commerce-storage";

import Image from "next/image";
import Link from "next/link";
import {
  Search,
  UserRound,
  Heart,
  ShoppingBag,
  Menu,
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headset,
  ChevronDown,
  MapPin,
  Mail,
  Sparkles,
  Star,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { formatMoney, products, type DemoProduct } from "@/features/buyer/data/demo-data";
import { mergeGuestCart, saveCart } from "./cart-sync";
import { mergeWishlist } from "./wishlist-sync";
import {
  categoryHref,
  demoCombos,
  superCategories,
} from "@/features/buyer/data/store-catalog";

export type BagKit = {
  key: string;
  comboId: string;
  items: Record<string, number>;
};
type CommerceState = {
  cart: Record<string, number>;
  kits: BagKit[];
  wishlist: string[];
  addToCart: (id: string, quantity?: number) => void;
  addKit: (comboId: string, items: Record<string, number>) => boolean;
  setKitQuantity: (kitKey: string, id: string, quantity: number) => void;
  removeKit: (kitKey: string) => void;
  setCartQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  toggleWishlist: (id: string) => void;
};
const CommerceContext = createContext<CommerceState | null>(null);
const CART_KEY = "ggh-demo-cart";
const KITS_KEY = "ggh-demo-kits";
const WISHLIST_KEY = "ggh-demo-wishlist";

function readIds(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
function subscribeCommerce(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("ggh-demo-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ggh-demo-change", callback);
  };
}
function useStoredIds(key: string) {
  const raw = useSyncExternalStore(
    subscribeCommerce,
    () => commerceStorage().getItem(key) ?? "[]",
    () => "[]",
  );
  return readIds(raw);
}
function readCart(raw: string): Record<string, number> {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) {
      return value.reduce<Record<string, number>>((items, id) => {
        if (
          typeof id === "string" &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
        )
          items[id] = Math.min(10000, (items[id] ?? 0) + 1);
        return items;
      }, {});
    }
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, quantity]) =>
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) &&
          typeof quantity === "number" &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= 10000,
      ),
    );
  } catch {
    return {};
  }
}
function useStoredCart() {
  const raw = useSyncExternalStore(
    subscribeCommerce,
    () => commerceStorage().getItem(CART_KEY) ?? "{}",
    () => "{}",
  );
  return readCart(raw);
}
function readKits(raw: string): BagKit[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((kit): kit is BagKit =>
        Boolean(
          kit &&
          typeof kit === "object" &&
          typeof kit.key === "string" &&
          typeof kit.comboId === "string" &&
          kit.items &&
          typeof kit.items === "object" &&
          !Array.isArray(kit.items),
        ),
      )
      .map((kit) => ({
        ...kit,
        items: Object.fromEntries(
          Object.entries(kit.items).filter(
            ([id, qty]) =>
              products.some((product) => product.id === id) &&
              Number.isInteger(qty) &&
              qty > 0 &&
              qty <= 10000,
          ),
        ),
      }))
      .filter((kit) => Object.keys(kit.items).length > 0);
  } catch {
    return [];
  }
}
function useStoredKits() {
  const raw = useSyncExternalStore(
    subscribeCommerce,
    () => commerceStorage().getItem(KITS_KEY) ?? "[]",
    () => "[]",
  );
  return readKits(raw);
}
function publishCommerce() {
  window.dispatchEvent(new Event("ggh-demo-change"));
}
export function useDemoCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("Commerce provider missing");
  return context;
}
function DemoCommerceProvider({ children }: { children: ReactNode }) {
  const synced = useRef(false);
  useEffect(() => {
    let active = true;
    void mergeGuestCart().then(ok => { if (active) synced.current = ok; }).catch(() => {});
    void mergeWishlist().catch(() => {});
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => { if (!synced.current) return; clearTimeout(timer); timer = setTimeout(() => { void saveCart().catch(() => {}); }, 400); };
    const onSynced = () => { synced.current = true; };
    window.addEventListener("ggh-demo-change", onChange);
    window.addEventListener("ggh-cart-synced", onSynced);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("ggh-demo-change", onChange); window.removeEventListener("ggh-cart-synced", onSynced); };
  }, []);
  const cart = useStoredCart(),
    kits = useStoredKits(),
    wishlist = useStoredIds(WISHLIST_KEY);
  const addToCart = useCallback((id: string, quantity = 1) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return;
    if (
      readKits(commerceStorage().getItem(KITS_KEY) ?? "[]").some(
        (kit) => kit.items[id],
      )
    )
      return;
    const current = readCart(commerceStorage().getItem(CART_KEY) ?? "{}");
    const original = id;
    id = cartLineKey(id, getCartVariant(id));
    if (id !== original && current[original]) { current[id] = current[original]; delete current[original]; }
    if (current[id]) { commerceStorage().setItem(CART_KEY, JSON.stringify(current)); publishCommerce(); return; }
    commerceStorage().setItem(
      CART_KEY,
      JSON.stringify({
        ...current,
        [id]: Math.min(10000, (current[id] ?? 0) + quantity),
      }),
    );
    publishCommerce();
  }, []);
  const addKit = useCallback(
    (comboId: string, items: Record<string, number>) => {
      if (!demoCombos.some((combo) => combo.id === comboId)) return false;
      const current = readKits(commerceStorage().getItem(KITS_KEY) ?? "[]");
      const valid = Object.fromEntries(
        Object.entries(items).filter(
          ([id, qty]) =>
            products.some((product) => product.id === id) &&
            Number.isInteger(qty) &&
            qty > 0 &&
            qty <= 10000,
        ),
      );
      if (
        !Object.keys(valid).length ||
        current.some((kit) => Object.keys(valid).some((id) => kit.items[id]))
      )
        return false;
      const standalones = readCart(commerceStorage().getItem(CART_KEY) ?? "{}");
      for (const id of Object.keys(valid)) {
        if (standalones[id]) {
          valid[id] = Math.min(10000, valid[id] + standalones[id]);
          delete standalones[id];
        }
      }
      commerceStorage().setItem(CART_KEY, JSON.stringify(standalones));
      commerceStorage().setItem(
        KITS_KEY,
        JSON.stringify([
          ...current,
          { key: crypto.randomUUID(), comboId, items: valid },
        ]),
      );
      publishCommerce();
      return true;
    },
    [],
  );
  const setKitQuantity = useCallback(
    (kitKey: string, id: string, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000)
        return;
      const current = readKits(commerceStorage().getItem(KITS_KEY) ?? "[]");
      const target = current.find((kit) => kit.key === kitKey);
      if (!target || !target.items[id]) return;
      if (quantity === 0) delete target.items[id];
      else target.items[id] = quantity;
      commerceStorage().setItem(
        KITS_KEY,
        JSON.stringify(current.filter((kit) => Object.keys(kit.items).length)),
      );
      publishCommerce();
    },
    [],
  );
  const removeKit = useCallback((kitKey: string) => {
    commerceStorage().setItem(
      KITS_KEY,
      JSON.stringify(
        readKits(commerceStorage().getItem(KITS_KEY) ?? "[]").filter(
          (kit) => kit.key !== kitKey,
        ),
      ),
    );
    publishCommerce();
  }, []);
  const setCartQuantity = useCallback((id: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000) return;
    const next = readCart(commerceStorage().getItem(CART_KEY) ?? "{}");
    if (quantity === 0) delete next[id];
    else next[id] = quantity;
    commerceStorage().setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("ggh-demo-change"));
  }, []);
  const removeFromCart = useCallback((id: string) => {
    const current = readCart(commerceStorage().getItem(CART_KEY) ?? "{}");
    delete current[id];
    commerceStorage().setItem(CART_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event("ggh-demo-change"));
  }, []);
  const toggleWishlist = useCallback((id: string) => {
    const current = readIds(commerceStorage().getItem(WISHLIST_KEY) ?? "[]");
    const removing = current.includes(id);
    commerceStorage().setItem(
      WISHLIST_KEY,
      JSON.stringify(
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      ),
    );
    window.dispatchEvent(new Event("ggh-demo-change"));
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) void fetch(`/api/buyer/wishlist/${encodeURIComponent(id)}`, { method: removing ? "DELETE" : "POST" }).catch(() => {});
  }, []);
  return (
    <CommerceContext
      value={{
        cart,
        kits,
        wishlist,
        addToCart,
        addKit,
        setKitQuantity,
        removeKit,
        setCartQuantity,
        removeFromCart,
        toggleWishlist,
      }}
    >
      {children}
    </CommerceContext>
  );
}

const storeIcons = {
  search: Search,
  user: UserRound,
  heart: Heart,
  cart: ShoppingBag,
  menu: Menu,
  arrow: ArrowRight,
  truck: Truck,
  shield: ShieldCheck,
  return: RotateCcw,
  support: Headset,
  chevron: ChevronDown,
} as const;

export function StoreIcon({
  name,
  size = 20,
}: {
  name: keyof typeof storeIcons;
  size?: number;
}) {
  const Icon = storeIcons[name];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/shop"
      className={`store-logo-image ${footer ? "store-logo-footer" : ""}`}
      aria-label="Go Gather Hub home"
    >
      <Image
        src="/gogatherhub-logo.png"
        alt="Go Gather Hub"
        width={798}
        height={148}
        priority={!footer}
      />
      <span className="store-logo-tagline">YOUR DREAM, OUR PLANNING</span>
    </Link>
  );
}
function StoreHeader() {
  const [menu, setMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [pincode, setPincode] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [showPin, setShowPin] = useState(false);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".ggh-nav-item")) setOpenCategory(null);
      if (!target.closest(".ggh-location-panel, .ggh-location-trigger")) setShowPin(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpenCategory(null); setShowPin(false); setMenu(false); }
    }
    function closeOnNavigation(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest("a[href]")) { setOpenCategory(null); setShowPin(false); setMenu(false); }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("click", closeOnNavigation);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); document.removeEventListener("click", closeOnNavigation); };
  }, []);
  const { cart, kits, wishlist } = useDemoCommerce();
  const search = searchTerm.trim().toLowerCase();
  const matches = search
    ? products
        .filter((product) =>
          `${product.name} ${product.category} ${product.description}`
            .toLowerCase()
            .includes(search),
        )
        .slice(0, 5)
    : [];
  const categoryMatches = search
    ? superCategories
        .filter(
          (category) =>
            category.label.toLowerCase().includes(search) ||
            category.groups.some((group) =>
              group.links.some((link) =>
                link.label.toLowerCase().includes(search),
              ),
            ),
        )
        .slice(0, 2)
    : [];
  const comboMatches = search
    ? demoCombos
        .filter((combo) =>
          `${combo.name} ${combo.occasion}`.toLowerCase().includes(search),
        )
        .slice(0, 2)
    : [];
  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    kits.reduce(
      (sum, kit) =>
        sum + Object.values(kit.items).reduce((count, qty) => count + qty, 0),
      0,
    ),
  );
  const checkPin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pincode)) { setPinMessage("Enter a valid 6-digit Indian PIN code."); return; }
    setPinMessage("Checking availability…");
    try {
      const response = await fetch(`/api/catalog/delivery/${pincode}`);
      if (!response.ok) throw new Error();
      const result = await response.json() as { available: boolean; cod: boolean };
      setPinMessage(result.available ? `Delivery is available for ${pincode}. ${result.cod ? "Cash on delivery is available." : "Cash on delivery is not available; choose online payment."}` : `Delivery is not available for ${pincode}. Please try another PIN code.`);
    } catch { setPinMessage("Availability service is unavailable right now."); }
  };
  return (
    <>
      <div className="store-announcement">
        <div className="store-header-width">
          <span>
            <Sparkles size={13} strokeWidth={1.8} aria-hidden="true" /> Free
            Gifts for every celebration
          </span>
          <span className="announcement-right">
            Go Gather Hub · India &nbsp; | &nbsp; INR &nbsp; | &nbsp; English
          </span>
        </div>
      </div>
      <header className="store-header">
        <div className="store-header-inner">
          <Brand />
          <form className="store-search" action="/shop/products">
            <label className="sr-only" htmlFor="store-search">
              Search products
            </label>
            <input
              id="store-search"
              name="q"
              placeholder="Search for gifts, decor, or celebrations..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() =>
                window.setTimeout(() => setSearchFocused(false), 150)
              }
              autoComplete="off"
            />
            <button type="submit" aria-label="Search products">
              <StoreIcon name="search" />
            </button>
            {searchFocused && search && (
              <div
                className="ggh-search-suggestions"
                aria-label="Search suggestions"
              >
                <p>Matching ideas</p>
                {categoryMatches.map((category) => (
                  <Link
                    href={categoryHref(category.slug)}
                    key={category.slug}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setSearchFocused(false)}
                  >
                    <span>Collection</span>
                    <strong>{category.label}</strong>
                  </Link>
                ))}
                {comboMatches.map((combo) => (
                  <Link
                    href={`/shop/combos/${combo.id}`}
                    key={combo.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setSearchFocused(false)}
                  >
                    <span>Build a kit</span>
                    <strong>{combo.name}</strong>
                  </Link>
                ))}
                {matches.map((product) => (
                  <Link
                    href={`/shop/products/${product.id}`}
                    key={product.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setSearchFocused(false)}
                  >
                    <span>Product</span>
                    <strong>{product.name}</strong>
                    <small>{formatMoney(product.price)}</small>
                  </Link>
                ))}
                {!categoryMatches.length &&
                  !comboMatches.length &&
                  !matches.length && (
                    <div className="ggh-search-empty">
                      No quick matches. Press Enter to see search results.
                    </div>
                  )}
                <Link
                  href={`/shop/products?q=${encodeURIComponent(searchTerm)}`}
                  className="ggh-search-all"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  See all results for “{searchTerm}” →
                </Link>
              </div>
            )}
          </form>
          <nav className="store-actions" aria-label="Account and shopping">
            <button
              type="button"
              className="ggh-location-trigger"
              onClick={() => { setOpenCategory(null); setShowPin(!showPin); }}
              aria-expanded={showPin}
              aria-controls="ggh-location-panel"
            >
              <MapPin size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{pincode || "Pincode"}</span>
            </button>
            <Link href="/shop/account" aria-label="Account">
              <StoreIcon name="user" />
              <span>Account</span>
            </Link>
            <Link
              href="/shop/wishlist"
              aria-label={`Wishlist, ${wishlist.length} saved products`}
            >
              <StoreIcon name="heart" />
              <span>Wishlist</span>
              {wishlist.length > 0 && <b>{wishlist.length}</b>}
            </Link>
            <Link
              href="/shop/cart"
              aria-label={`Cart, ${cartCount} demo items`}
            >
              <StoreIcon name="cart" />
              <span>Cart</span>
              {cartCount > 0 && <b>{cartCount > 99 ? "99+" : cartCount}</b>}
            </Link>
          </nav>
          <button
            className="store-menu-toggle"
            type="button"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <StoreIcon name="menu" />
          </button>
        </div>
        {showPin && (
          <div id="ggh-location-panel" className="ggh-location-panel">
            <form onSubmit={checkPin}>
              <label htmlFor="ggh-header-pin">Check delivery area</label>
              <div>
                <input
                  id="ggh-header-pin"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(event) => {
                    setPincode(event.target.value.replace(/\D/g, ""));
                    setPinMessage("");
                  }}
                  placeholder="6-digit pincode"
                />
                <button type="submit">Check</button>
              </div>
            </form>
            <p role="status">
              {pinMessage ||
                "Enter your pincode to check delivery and COD availability."}
            </p>
          </div>
        )}
        <nav
          className={`store-categories ${menu ? "is-open" : ""}`}
          aria-label="Shop categories"
        >
          <Link href="/shop/products" onClick={() => setMenu(false)}>
            <StoreIcon name="menu" size={15} />
            <span>Shop All</span>
          </Link>
          {superCategories.map((item) => (
            <div
              className="ggh-nav-item"
              key={item.slug}
              onMouseEnter={() => { setShowPin(false); setOpenCategory(item.slug); }}
              onMouseLeave={() => setOpenCategory(null)}
            >
              <div className="ggh-nav-item-top">
                <Link
                  href={categoryHref(item.slug)}
                  onClick={() => {
                    setMenu(false);
                    setOpenCategory(null);
                  }}
                >
                  {item.label}
                </Link>
                <button
                  type="button"
                  aria-label={`Show ${item.label} subcategories`}
                  aria-expanded={openCategory === item.slug}
                  onClick={() =>
                    setOpenCategory(
                      openCategory === item.slug ? null : item.slug,
                    )
                  }
                >
                  <StoreIcon name="chevron" size={13} />
                </button>
              </div>
              <div
                className={`ggh-mega-menu ${openCategory === item.slug ? "is-visible" : ""}`}
              >
                <div className="ggh-mega-intro">
                  <span>Explore the occasion</span>
                  <h2>{item.label}</h2>
                  <Link
                    href={categoryHref(item.slug)}
                    onClick={() => {
                      setMenu(false);
                      setOpenCategory(null);
                    }}
                  >
                    Shop all →
                  </Link>
                </div>
                {item.groups.map((group) => (
                  <div className="ggh-mega-group" key={group.title}>
                    <h3>{group.title}</h3>
                    {group.links.map((link) => (
                      <Link
                        key={link.slug}
                        href={categoryHref(link.slug)}
                        onClick={() => {
                          setMenu(false);
                          setOpenCategory(null);
                        }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Link href="/shop/products?deals=1" onClick={() => setMenu(false)}>
            <span>Offers</span>
            <em>Hot</em>
          </Link>
        </nav>
      </header>
    </>
  );
}
function StoreFooter() {
  const [mail, setMail] = useState("");
  const [message, setMessage] = useState("");
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(
      mail.trim()
        ? "Thanks for your interest. Subscription is not connected yet."
        : "Enter a valid email address.",
    );
  };
  return (
    <footer className="store-footer">
      <div className="store-footer-grid">
        <div className="store-footer-about">
          <Brand footer />
          <p>
            Making every celebration more special with thoughtful gifts and
            elegant decor.
          </p>
        </div>
        <div>
          <h3>Quick Links</h3>
          <Link href="/shop">Home</Link>
          <Link href="/shop/products">Shop All</Link>
          <Link href="/shop/account">My Account</Link>
          <Link href="/shop/login">Sign in</Link>
          <Link href="/shop/seller-register">Sell with us</Link>
          <Link href="/shop/admin-login">Admin sign in</Link>
          <a href="/shop#faqs">FAQ</a>
        </div>
        <div>
          <h3>Categories</h3>
          <Link href="/shop/products?q=wedding">Wedding Essentials</Link>
          <Link href="/shop/products?q=birthday">Birthday Collection</Link>
          <Link href="/shop/products?q=festival">Festival Specials</Link>
          <Link href="/shop/products?category=Home">Home Decor</Link>
        </div>
        <div>
          <h3>Customer Support</h3>
          <a href="/shop#faqs">Help Center</a>
          <a href="/shop#faqs">Shipping Info</a>
          <a href="/shop#faqs">Returns & Refunds</a>
          <Link href="/shop/cart">Your Cart</Link>
        </div>
        <div className="store-footer-news">
          <h3>
            <Mail size={15} strokeWidth={1.8} aria-hidden="true" /> Stay
            Connected
          </h3>
          <p>Subscribe for collection news. Demo form only.</p>
          <form onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="footer-email">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              required
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              placeholder="Enter your email address"
            />
            <button type="submit" aria-label="Submit newsletter interest">
              <StoreIcon name="arrow" size={17} />
            </button>
          </form>
          {message && (
            <p role="status" className="store-form-message">
              {message}
            </p>
          )}
        </div>
      </div>
      <div className="store-footer-bottom">
        <span>© 2026 Go Gather Hub. All rights reserved. · UI preview</span>
        <span className="store-legal-pending">
          Terms & Conditions · Privacy Policy · Sitemap{" "}
          <small>(pages pending)</small>
        </span>
      </div>
    </footer>
  );
}
export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <DemoCommerceProvider>
      <div className="store">
        <StoreHeader />
        {children}
        <StoreFooter />
      </div>
    </DemoCommerceProvider>
  );
}

export function ProductCard({ product }: { product: DemoProduct }) {
  const { wishlist, toggleWishlist, cart, addToCart } = useDemoCommerce();
  const saved = wishlist.includes(product.id);
  return (
    <article className="product-card">
      <div className="product-media">
      <Link
        href={`/shop/products/${product.id}`}
        className="product-image-wrap"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
          style={{ objectFit: "cover" }}
        />
        {product.badge && (
          <span className="product-badge">{product.badge}</span>
        )}
      </Link>
      <button type="button" className={`product-wish ${saved ? "saved" : ""}`} aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={saved} onClick={() => toggleWishlist(product.id)}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <Link href={`/shop/products/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-rating">
          <span aria-label={`${product.rating} out of 5 stars`}>
            <Star
              size={13}
              fill="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            />{" "}
            {product.rating}
          </span>
          <span className="demo-note">Demo rating</span>
        </div>
        <div className="product-price">
          <strong>{formatMoney(product.price)}</strong>
          <s>{formatMoney(product.compareAt)}</s>
        </div>
        <button type="button" className="product-add-bag" disabled={Boolean(cart[product.id])} onClick={() => addToCart(product.id)}><ShoppingBag size={15} />{cart[product.id] ? "In bag" : "Add to bag"}</button>
      </div>
    </article>
  );
}
export function ProductGrid({ items }: { items: DemoProduct[] }) {
  return (
    <div className="product-grid">
      {items.map((p) => (
        <ProductCard product={p} key={p.id} />
      ))}
    </div>
  );
}
export function StoreSection({
  eyebrow,
  title,
  href,
  children,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="store-section">
      <div className="store-section-head">
        <div>
          {eyebrow && <p className="store-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {href && (
          <Link href={href} className="store-text-link">
            View all <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export function DemoCollection({ kind }: { kind: "cart" | "wishlist" }) {
  const state = useDemoCommerce();
  const ids = kind === "cart" ? Object.keys(state.cart) : state.wishlist;
  const entries = ids
    .map((id) => products.find((product) => product.id === id))
    .filter((item): item is DemoProduct => !!item);
  if (!entries.length)
    return (
      <div className="store-blank">
        <p className="store-eyebrow">
          {kind === "cart" ? "Your shopping bag" : "Saved for later"}
        </p>
        <h1>
          {kind === "cart"
            ? "Nothing in your bag yet."
            : "Your wishlist starts here."}
        </h1>
        <p>
          Explore the demo collection and{" "}
          {kind === "cart"
            ? "add a product to your bag"
            : "save a product you love"}
          .
        </p>
        <Link className="store-cta" href="/shop/products">
          Explore products →
        </Link>
      </div>
    );
  return (
    <div className="store-blank">
      <p className="store-eyebrow">Browser-only demo</p>
      <h1>{kind === "cart" ? "Your bag" : "Your wishlist"}</h1>
      <p>
        These selections are saved only in this browser. Ordering and account
        sync are not connected.
      </p>
      <div className="demo-collection-list">
        {entries.map((product, index) => (
          <Link
            href={`/shop/products/${product.id}`}
            key={`${product.id}-${index}`}
          >
            <Image src={product.image} alt="" width={72} height={72} />
            <span>
              {product.name}
              <small>{formatMoney(product.price)}</small>
            </span>
            <StoreIcon name="arrow" size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}
