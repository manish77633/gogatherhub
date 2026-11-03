"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Cake,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Gift,
  PartyPopper,
  Plus,
  Sparkles,
  Flame,
  Star,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatMoney, products, type DemoProduct } from "@/features/buyer/data/demo-data";
import { StoreIcon, useDemoCommerce } from "@/features/buyer/components/storefront";
import { ProductActions } from "@/features/buyer/components/product-actions";
import { categoryHref, demoCombos, superCategories } from "@/features/buyer/data/store-catalog";

const heroSlides = [
  {
    eyebrow: "Gifts for every occasion",
    first: "Make Every Moment",
    large: "More Special",
    description: "Wedding gifts · Birthday surprises · Festival joy & more",
    image: "/hero-gift-v1.png",
    href: "/shop/products?q=gift",
  },
  {
    eyebrow: "The wedding edit",
    first: "Celebrate Every",
    large: "Love Story",
    description: "Thoughtful details for the moments that last forever",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=90",
    href: "/shop/products?q=wedding",
  },
  {
    eyebrow: "Made to remember",
    first: "Little Joys,",
    large: "Big Memories",
    description: "Beautiful finds for birthdays, gatherings and beyond",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1600&q=90",
    href: "/shop/products?q=birthday",
  },
];
const occasions = [
  {
    name: "Birthday Party",
    icon: Cake,
    href: "/shop/products?collection=birthday-party",
  },
  {
    name: "Wedding",
    icon: Sparkles,
    href: "/shop/products?collection=wedding",
  },
  {
    name: "Cakes & Flowers",
    icon: Flower2,
    href: "/shop/products?collection=cakes-flowers",
  },
  {
    name: "Custom Combos",
    icon: Gift,
    href: "/shop/products?collection=combos",
  },
  {
    name: "Puja & Festivals",
    icon: Flame,
    href: "/shop/products?collection=puja-festivals",
  },
  {
    name: "Gifts & Decor",
    icon: PartyPopper,
    href: "/shop/products?collection=gifts-decor",
  },
];
const promos = [
  {
    title: "Wedding Collection",
    offer: "Up to 40% OFF",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1100&q=85",
    href: "/shop/products?q=wedding",
  },
  {
    title: "Birthday Specials",
    offer: "Up to 50% OFF",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1100&q=85",
    href: "/shop/products?q=birthday",
  },
  {
    title: "Festival Essentials",
    offer: "Up to 60% OFF",
    image: "/product-festival-lantern-v1.png",
    href: "/shop/products?q=festival",
  },
];
const collections = [
  {
    name: "Wedding",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=85",
    href: "/shop/products?q=wedding",
  },
  {
    name: "Birthday",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=85",
    href: "/shop/products?q=birthday",
  },
  {
    name: "Festivals",
    image: "/product-festival-lantern-v1.png",
    href: "/shop/products?q=festival",
  },
  {
    name: "Home Decor",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=85",
    href: "/shop/products?category=Home",
  },
];
const faqs = [
  {
    q: "How long does delivery take?",
    a: "Delivery estimates will be shown at checkout once shipping partners are connected.",
  },
  {
    q: "Can I return a product?",
    a: "Return eligibility and timelines will be published before live orders are enabled.",
  },
  {
    q: "Do you offer gift wrapping?",
    a: "Gift-wrapping options are planned; availability will be shown on eligible products.",
  },
  {
    q: "How can I track my order?",
    a: "Order tracking will appear in your account after shipping integration is enabled.",
  },
];

function Hero() {
  const [index, setIndex] = useState(0);
  const slide = heroSlides[index];
  const go = (delta: number) =>
    setIndex(
      (current) => (current + delta + heroSlides.length) % heroSlides.length,
    );
  return (
    <section className="ggh-hero" aria-label="Featured collections">
      <Image
        key={slide.image}
        className="ggh-hero-image"
        src={slide.image}
        alt="Celebration collection"
        fill
        priority
        sizes="100vw"
      />
      <div className="ggh-hero-wash" />
      <div className="ggh-hero-copy">
        <p className="ggh-kicker">{slide.eyebrow}</p>
        <h1>
          <span>{slide.first}</span>
          {slide.large}
        </h1>
        <p>{slide.description}</p>
        <Link className="ggh-dark-button" href={slide.href}>
          Explore Collection <StoreIcon name="arrow" size={17} />
        </Link>
      </div>
      <button
        className="ggh-hero-arrow prev"
        type="button"
        aria-label="Previous promotion"
        onClick={() => go(-1)}
      >
        <ChevronLeft size={22} strokeWidth={1.8} />
      </button>
      <button
        className="ggh-hero-arrow next"
        type="button"
        aria-label="Next promotion"
        onClick={() => go(1)}
      >
        <ChevronRight size={22} strokeWidth={1.8} />
      </button>
      <div className="ggh-dots" aria-label="Choose promotion">
        {heroSlides.map((item, i) => (
          <button
            type="button"
            key={item.large}
            className={i === index ? "active" : ""}
            aria-label={`Show promotion ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
function Occasions() {
  return (
    <nav className="ggh-occasions" aria-label="Shop by occasion">
      {occasions.map((item) => (
        <Link href={item.href} key={item.name}>
          <span className="ggh-occasion-symbol">
            <item.icon size={24} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span>{item.name}</span>
        </Link>
      ))}
    </nav>
  );
}
function PromoBanners() {
  return (
    <section className="ggh-promos" aria-label="Promotional collections">
      {promos.map((item) => (
        <article className="ggh-promo" key={item.title}>
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(max-width: 767px) 100vw, 33vw"
          />
          <div className="ggh-promo-wash" />
          <div className="ggh-promo-copy">
            <h2>{item.title}</h2>
            <p>{item.offer}</p>
            <Link href={item.href}>
              Shop Now <StoreIcon name="arrow" size={15} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
function HomeProductCard({ product }: { product: DemoProduct }) {
  const { wishlist, toggleWishlist } = useDemoCommerce();
  const saved = wishlist.includes(product.id);
  const discount = Math.round((1 - product.price / product.compareAt) * 100);
  return (
    <article className="ggh-product">
      <div className="ggh-product-image">
        <Link href={`/shop/products/${product.id}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 1023px) 33vw, 17vw"
          />
        </Link>
        {product.badge && (
          <span className="ggh-product-tag">{product.badge}</span>
        )}
        <button
          className={`ggh-wish ${saved ? "saved" : ""}`}
          type="button"
          aria-label={
            saved
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
          aria-pressed={saved}
          onClick={() => toggleWishlist(product.id)}
        >
          <StoreIcon name="heart" size={17} />
        </button>
      </div>
      <div className="ggh-product-info">
        <small className="ggh-product-type">{product.category}</small>
        <Link href={`/shop/products/${product.id}`}>{product.name}</Link>
        <div className="ggh-price">
          <strong>{formatMoney(product.price)}</strong>
          <s>{formatMoney(product.compareAt)}</s>
        </div>
        <div className="ggh-product-bottom">
          <span>{discount}% off</span>
        </div>
        <ProductActions id={product.id} compact />
      </div>
    </article>
  );
}
function PopularPicks() {
  return (
    <section className="ggh-section ggh-editorial-products">
      <div className="ggh-section-head">
        <div>
          <p className="ggh-kicker">Handpicked for your special moments</p>
          <h2>Featured Collection</h2>
        </div>
        <Link href="/shop/products">
          View All <StoreIcon name="arrow" size={16} />
        </Link>
      </div>
      <div className="ggh-products">
        {products
          .filter((product) =>
            [
              "birthday-cake",
              "red-rose-bouquet",
              "wedding-gift-hamper",
              "decor-lantern",
            ].includes(product.id),
          )
          .map((p) => (
            <HomeProductCard key={p.id} product={p} />
          ))}
      </div>
      <p className="ggh-demo-caption">
        Product images, prices and discounts are demo content. Cart and wishlist
        are stored only in this browser.
      </p>
    </section>
  );
}
function ExploreByOccasion() {
  const tiles = [
    {
      slug: "birthday-party",
      copy: "Cakes, decor, treats & thoughtful surprises",
      image:
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1000&q=85",
    },
    {
      slug: "wedding",
      copy: "Gifts and details for every love story",
      image:
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1000&q=85",
    },
    {
      slug: "puja-festivals",
      copy: "Ritual essentials and festive warmth",
      image: "/product-festival-lantern-v1.png",
    },
  ];
  return (
    <section className="ggh-section">
      <div className="ggh-section-head">
        <div>
          <p className="ggh-kicker">Shop around the moment</p>
          <h2>Every Occasion, Beautifully Covered</h2>
        </div>
      </div>
      <div className="ggh-occasion-editorial">
        {tiles.map((tile) => (
          <Link href={categoryHref(tile.slug)} key={tile.slug}>
            <div>
              <Image
                src={tile.image}
                alt=""
                fill
                sizes="(max-width: 767px) 100vw, 33vw"
              />
            </div>
            <span>
              THE{" "}
              {superCategories
                .find((item) => item.slug === tile.slug)
                ?.label.toUpperCase()}{" "}
              EDIT
            </span>
            <h3>
              {superCategories.find((item) => item.slug === tile.slug)?.label}
            </h3>
            <p>{tile.copy}</p>
            <b>Explore collection →</b>
          </Link>
        ))}
      </div>
    </section>
  );
}
function ComboSpotlight() {
  return (
    <section className="ggh-section ggh-combo-spotlight">
      <div className="ggh-section-head">
        <div>
          <p className="ggh-kicker">Made by you</p>
          <h2>Celebration Kits, Your Way</h2>
        </div>
        <Link href={categoryHref("combos")}>
          Explore all combos <StoreIcon name="arrow" size={16} />
        </Link>
      </div>
      <div className="ggh-home-combos">
        {demoCombos.map((combo) => (
          <Link key={combo.id} href={`/shop/combos/${combo.id}`}>
            <div className="ggh-home-combo-photo">
              <Image
                src={combo.image}
                alt=""
                fill
                sizes="(max-width: 767px) 90vw, 33vw"
              />
            </div>
            <div className="ggh-home-combo-copy">
              <small>{combo.occasion}</small>
              <h3>{combo.name}</h3>
              <p>{combo.description}</p>
              <span>Customize kit →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
function CategoryExplorer() {
  const images: Record<string, string> = {
    "birthday-party":
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=85",
    wedding:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=85",
    "puja-festivals": "/product-festival-lantern-v1.png",
    "cakes-flowers": "/product-rose-bouquet-v1.png",
    combos: "/hero-gift-v1.png",
    "gifts-decor":
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=85",
  };
  const captions: Record<string, string> = {
    "birthday-party": "The little details that make their day",
    wedding: "Thoughtful touches for every love story",
    "puja-festivals": "Traditions, gathered beautifully",
    "cakes-flowers": "Fresh blooms and sweet celebrations",
    combos: "Create a celebration that's yours",
    "gifts-decor": "Finishing touches and meaningful finds",
  };
  return (
    <section className="ggh-section ggh-category-explorer">
      <div className="ggh-section-head">
        <div>
          <p className="ggh-kicker">Find exactly what you need</p>
          <h2>Find Your Next Celebration</h2>
        </div>
      </div>
      <div className="ggh-category-columns">
        {superCategories.map((category) => (
          <Link
            href={categoryHref(category.slug)}
            className="ggh-category-card"
            key={category.slug}
          >
            <span className="ggh-category-photo">
              <Image
                src={images[category.slug]}
                alt=""
                fill
                sizes="(max-width: 767px) 90vw, 33vw"
              />
            </span>
            <span className="ggh-category-card-body">
              <strong>{category.label}</strong>
              <small>{captions[category.slug]}</small>
              <ArrowUpRight size={18} strokeWidth={1.7} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
function Benefits() {
  const items = [
    {
      icon: "truck" as const,
      title: "Shipping Options",
      copy: "Delivery details at checkout",
    },
    {
      icon: "shield" as const,
      title: "Secure Payments",
      copy: "Coming with live checkout",
    },
    {
      icon: "return" as const,
      title: "Returns Support",
      copy: "Policy before launch",
    },
    {
      icon: "support" as const,
      title: "Dedicated Support",
      copy: "Help when you need it",
    },
  ];
  return (
    <section className="ggh-benefits" aria-label="Why choose us">
      {items.map((item) => (
        <div key={item.title}>
          <span className="ggh-benefit-icon">
            <StoreIcon name={item.icon} size={22} />
          </span>
          <span>
            <strong>{item.title}</strong>
            <small>{item.copy}</small>
          </span>
        </div>
      ))}
    </section>
  );
}
function CollectionsAndNewsletter() {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState("");
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(
      "Email looks good. Subscription will be available when the service is connected.",
    );
  };
  return (
    <div className="ggh-feature-grid">
      <section className="ggh-collections">
        <div className="ggh-feature-heading">
          <h2>Our Special Collections</h2>
          <p>Discover curated collections for every occasion</p>
        </div>
        <div className="ggh-collection-grid">
          {collections.map((c) => (
            <Link href={c.href} key={c.name}>
              <div className="ggh-collection-image">
                <Image
                  src={c.image}
                  alt={`${c.name} collection`}
                  fill
                  sizes="(max-width: 600px) 45vw, 15vw"
                />
              </div>
              <strong>{c.name}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section className="ggh-newsletter">
        <Flower2
          className="ggh-newsletter-flower"
          size={180}
          strokeWidth={0.8}
          aria-hidden="true"
        />
        <div>
          <p className="ggh-kicker">The good things, first</p>
          <h2>Subscribe to Our Newsletter</h2>
          <p>Get collection updates and ideas for your next celebration.</p>
          <form onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="home-email">
              Email address
            </label>
            <input
              id="home-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
            <button type="submit">
              Subscribe <StoreIcon name="arrow" size={16} />
            </button>
          </form>
          {message && (
            <p role="status" className="ggh-form-message">
              {message}
            </p>
          )}
          <small>UI preview · no email is sent or stored.</small>
        </div>
      </section>
    </div>
  );
}
function Testimonials() {
  const testimonials = [
    {
      name: "Priya Sharma",
      initial: "P",
      quote:
        "Amazing quality and beautiful packaging. Perfect for our wedding!",
    },
    {
      name: "Rohit Mehta",
      initial: "R",
      quote: "Loved the collection. Great service and super fast delivery.",
    },
    {
      name: "Sneha Kapoor",
      initial: "S",
      quote: "Best place for gifts and decor. Highly recommended!",
    },
  ];
  return (
    <section className="ggh-testimonials">
      <p className="ggh-kicker">Kind words</p>
      <h2>What Our Customers Say</h2>
      <p className="ggh-subtitle">
        Illustrative testimonial cards for the UI preview
      </p>
      <div className="ggh-testimonial-grid">
        {testimonials.map((t) => (
          <blockquote key={t.name}>
            <div className="ggh-avatar">{t.initial}</div>
            <div>
              <span className="ggh-stars" aria-label="Five stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={13}
                    fill="currentColor"
                    strokeWidth={1.2}
                    aria-hidden="true"
                  />
                ))}
              </span>
              <p>“{t.quote}”</p>
              <cite>
                {t.name}
                <small>Demo testimonial</small>
              </cite>
            </div>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
function FAQ() {
  return (
    <section className="ggh-faq" id="faqs">
      <div>
        <p className="ggh-kicker">Here to help</p>
        <h2>Frequently Asked Questions</h2>
        <p>Quick answers to common queries.</p>
        <Link href="/shop/products" className="ggh-light-link">
          Browse Products <StoreIcon name="arrow" size={15} />
        </Link>
      </div>
      <div className="ggh-faq-list">
        {faqs.map((item) => (
          <details key={item.q} name="homepage-faq">
            <summary>
              {item.q}
              <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
export function Homepage() {
  return (
    <main className="ggh-home">
      <div className="ggh-container">
        <Hero />
        <Occasions />
        <PromoBanners />
        <ExploreByOccasion />
        <PopularPicks />
        <ComboSpotlight />
        <CategoryExplorer />
        <Benefits />
        <CollectionsAndNewsletter />
        <Testimonials />
        <FAQ />
      </div>
    </main>
  );
}
