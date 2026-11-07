import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Flower2, Gift, Sparkles, Wallet } from "lucide-react";
import "../styles/home-discovery.css";

export function CelebrationStory() {
  return <section className="home-story" aria-labelledby="home-story-title">
    <div className="home-story-photo"><Image src="/product-festival-lantern-v1.png" alt="Warm brass lanterns styled for a celebration" fill sizes="(max-width: 760px) 100vw, 42vw"/><span>Little details. Lasting memories.</span></div>
    <div className="home-story-copy"><span className="home-story-label"><Sparkles size={18} aria-hidden="true"/> The gathering edit</span><h2 id="home-story-title">Make a gathering<br/>feel like you.</h2><p>A warm glow, a thoughtful gift, a few fresh flowers. Start with the details you love and bring your next celebration together.</p>
      <div className="home-story-links"><Link href="/shop/products?category=decor"><Sparkles size={20}/><span><strong>Set the scene</strong><small>Decor for your kind of celebration</small></span><ArrowUpRight size={19}/></Link><Link href="/shop/products?category=flowers"><Flower2 size={20}/><span><strong>Add a little colour</strong><small>Explore flowers and bouquets</small></span><ArrowUpRight size={19}/></Link><Link href="/shop/products?category=gifts"><Gift size={20}/><span><strong>Give something thoughtful</strong><small>Find a gift that feels personal</small></span><ArrowUpRight size={19}/></Link></div>
    </div>
  </section>;
}

export function BudgetDiscovery() {
  const budgets = [{amount:500,copy:"Little gestures",icon:Flower2},{amount:1000,copy:"Everyday surprises",icon:Gift},{amount:2000,copy:"Something special",icon:Sparkles}];
  return <section className="home-budget" aria-labelledby="home-budget-title"><div className="home-budget-heading"><div className="home-budget-photo"><Image src="/hero-gift-v1.png" alt="Gift box with a satin ribbon and flowers" fill sizes="(max-width: 760px) 100vw, 36vw"/></div><span><Wallet size={19} aria-hidden="true"/> A little thought goes a long way</span><h2 id="home-budget-title">A lovely find.<br/>At your kind of price.</h2><p>Choose a budget and explore what fits.</p></div><div className="home-budget-options">{budgets.map(({amount,copy,icon:Icon})=><Link href={`/shop/products?maxPrice=${amount}`} key={amount}><Icon size={24} strokeWidth={1.5} aria-hidden="true"/><small>{copy}</small><strong>Up to ₹{amount.toLocaleString("en-IN")}</strong><span>Explore products <ArrowUpRight size={18}/></span></Link>)}</div></section>;
}
