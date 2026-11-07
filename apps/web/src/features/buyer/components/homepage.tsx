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
  Heart,
} from "lucide-react";
import { Fragment, useState, type FormEvent, type ReactNode } from "react";
import { formatMoney, products, type DemoProduct } from "@/features/buyer/data/demo-data";
import { CmsSiteSection } from "./cms-site-section";
import { HomeCategoryShowcase } from "./home-category-showcase";
import { CelebrationStory, BudgetDiscovery } from "./home-discovery";
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
    offer: "Thoughtful gifts for the big day",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1100&q=85",
    href: "/shop/products?q=wedding",
  },
  {
    title: "Birthday Specials",
    offer: "Make their day memorable",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1100&q=85",
    href: "/shop/products?q=birthday",
  },
  {
    title: "Festival Essentials",
    offer: "Celebrate every tradition",
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

function Hero({section}:{section?:PublishedSection}) {
  const data=section?.published;
  const managedSlides=data?[{eyebrow:"Gifts for every occasion",first:"",large:String(data.heading??"Make Every Moment More Special"),description:String(data.description??""),image:String(data.imageUrl??"/hero-gift-v1.png"),href:String(data.buttonUrl??"/shop/products"),buttonLabel:String(data.buttonLabel??"Explore Collection")},...(Array.isArray(data.items)?data.items as Record<string,unknown>[]:[]).map(item=>({eyebrow:"Featured collection",first:"",large:String(item.heading??""),description:String(item.description??""),image:String(item.imageUrl??"/hero-gift-v1.png"),href:String(item.buttonUrl??"/shop/products"),buttonLabel:String(item.buttonLabel??"Explore Collection")}))]:heroSlides;
  const [index, setIndex] = useState(0);
  const slide = managedSlides[index%managedSlides.length];
  const go = (delta: number) =>
    setIndex(
      (current) => (current + delta + managedSlides.length) % managedSlides.length,
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
          {"buttonLabel" in slide?slide.buttonLabel:"Explore Collection"} <StoreIcon name="arrow" size={17} />
        </Link>
      </div>
      {managedSlides.length > 1 && <button
        className="ggh-hero-arrow prev"
        type="button"
        aria-label="Previous promotion"
        onClick={() => go(-1)}
      >
        <ChevronLeft size={22} strokeWidth={1.8} />
      </button>}
      {managedSlides.length > 1 && <button
        className="ggh-hero-arrow next"
        type="button"
        aria-label="Next promotion"
        onClick={() => go(1)}
      >
        <ChevronRight size={22} strokeWidth={1.8} />
      </button>}
      {managedSlides.length > 1 && <div className="ggh-dots" aria-label="Choose promotion">
        {managedSlides.map((item, i) => (
          <button
            type="button"
            key={item.large}
            className={i === index ? "active" : ""}
            aria-label={`Show promotion ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>}
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
        {discount > 0 && <span className="ggh-product-tag">{discount}% OFF</span>}
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
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="ggh-product-info">
        <small className="ggh-product-type">{product.category}</small>
        <Link href={`/shop/products/${product.id}`}>{product.name}</Link>
        <div className="ggh-price">
          <strong>{formatMoney(product.price)}</strong>
          <s>{formatMoney(product.compareAt)}</s>
        </div>
        <ProductActions id={product.id} compact cartIcon />
      </div>
    </article>
  );
}
function PopularPicks({section}:{section?:PublishedSection}) {
  const data=section?.published; const chosen=Array.isArray(data?.items)?(data.items as Record<string,unknown>[]).map(item=>products.find(product=>String(item.buttonUrl??"").endsWith(`/${product.id}`))).filter((item):item is DemoProduct=>Boolean(item)):[];
  return (
    <section className="ggh-section ggh-editorial-products">
      <div className="ggh-section-head">
        <div>
          <p className="ggh-kicker">{String(data?.description??"Handpicked for your special moments")}</p>
          <h2>{String(data?.heading??"Featured Collection")}</h2>
        </div>
        <Link href="/shop/products">
          View All <StoreIcon name="arrow" size={16} />
        </Link>
      </div>
      <div className="ggh-products">
        {(chosen.length?chosen:products.filter(product=>["birthday-cake","red-rose-bouquet","wedding-gift-hamper","decor-lantern"].includes(product.id)))
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
function CollectionsAndNewsletter({section}:{section?:PublishedSection}) {
  const data=section?.published;
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
          <h2>{String(data?.heading??"Subscribe to Our Newsletter")}</h2>
          <p>{String(data?.description??"Get collection updates and ideas for your next celebration.")}</p>
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
function FAQ({section}:{section?:PublishedSection}) {
  const data=section?.published; const questions=Array.isArray(data?.items)?(data.items as Record<string,unknown>[]).map(item=>({q:String(item.heading??""),a:String(item.description??"")})):faqs;
  return (
    <section className="ggh-faq" id="faqs">
      <div>
        <p className="ggh-kicker">Here to help</p>
        <h2>{String(data?.heading??"Frequently Asked Questions")}</h2>
        <p>{String(data?.description??"Quick answers to common queries.")}</p>
        <Link href="/shop/products" className="ggh-light-link">
          Browse Products <StoreIcon name="arrow" size={15} />
        </Link>
      </div>
      <div className="ggh-faq-list">
        {questions.map((item) => (
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
type PublishedSection={key:string;published:Record<string,unknown>;position:number};
export function Homepage({sections=[]}:{sections?:PublishedSection[]}) {
  const managed=new Map(sections.map(section=>[section.key,section]));
  const defaults:{key:string;content:ReactNode}[]=[
    {key:"hero",content:<Hero/>},{key:"categories",content:<HomeCategoryShowcase/>},{key:"bestsellers",content:<PopularPicks/>},
    {key:"gathering-edit",content:<CelebrationStory/>},
    {key:"celebration-kits",content:<ComboSpotlight/>},
    {key:"shop-by-budget",content:<BudgetDiscovery/>},
    {key:"gifts-under-budget",content:<Benefits/>},{key:"newsletter",content:<CollectionsAndNewsletter/>},
    {key:"testimonials",content:<Testimonials/>},{key:"faq",content:<FAQ/>},
  ];
  const extras=sections.filter(section=>!defaults.some(item=>item.key===section.key)&&!["header","announcement","footer","navigation","social-links","promotions","curated-collections","personalized-gifts","gifting-guide"].includes(section.key));
  const ordered=defaults.map((item,index)=>({ ...item, position:Number(managed.get(item.key)?.published?.position??index) })).concat(extras.map(section=>({key:section.key,content:<CmsSiteSection section={section}/>,position:Number(section.published.position??section.position)}))).sort((a,b)=>a.position-b.position);
  return <main className="ggh-home"><div className="ggh-container">{ordered.map(item=><Fragment key={item.key}>{managed.has(item.key)?item.key==="hero"?<Hero section={managed.get(item.key)!}/>:item.key==="categories"?<HomeCategoryShowcase heading={String(managed.get(item.key)!.published.heading??"")} description={String(managed.get(item.key)!.published.description??"")}/>:item.key==="bestsellers"?<PopularPicks section={managed.get(item.key)!}/>:item.key==="faq"?<FAQ section={managed.get(item.key)!}/>:item.key==="newsletter"?<CollectionsAndNewsletter section={managed.get(item.key)!}/>:<CmsSiteSection section={managed.get(item.key)!}/>:item.content}</Fragment>)}</div></main>;
}
