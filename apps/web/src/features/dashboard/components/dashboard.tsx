"use client";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Store,
  Package,
  Boxes,
  ShoppingBag,
  RotateCcw,
  CreditCard,
  Percent,
  Wallet,
  Headset,
  Settings,
  Users,
  UserRound,
  Tags,
  SlidersHorizontal,
  Truck,
  FileText,
  Search,
  ChartNoAxesCombined,
  ShieldCheck,
  Menu,
  ArrowUpRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { adminNav, sellerNav, slug } from "@/features/dashboard/data/navigation";
import { LogoutButton } from "@/features/buyer/components/logout-button";
import { DashboardUserContext } from "./dashboard-context";
import { clearDashboardCache, warmDashboardCache } from "./dashboard-cache";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  MiniChart,
  StatCard,
} from "@/components/ui";

type Panel = "seller" | "admin";
const navIcons: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  "My Shop": Store,
  Products: Package,
  Inventory: Boxes,
  Orders: ShoppingBag,
  Reviews: ShieldCheck,
  Returns: RotateCcw,
  Payments: CreditCard,
  Commission: Percent,
  Payouts: Wallet,
  Support: Headset,
  Settings: Settings,
  Sellers: Store,
  Buyers: Users,
  Categories: Tags,
  "Brands and Attributes": SlidersHorizontal,
  Wallet: Wallet,
  "Coupons and Offers": Percent,
  Shipping: Truck,
  CMS: FileText,
  SEO: Search,
  Reports: ChartNoAxesCombined,
  "Staff and Permissions": ShieldCheck,
};
export function DashboardShell({
  panel,
  userId,
  children,
}: {
  panel: Panel;
  userId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const nav = panel === "seller" ? sellerNav : adminNav;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const resources = panel === "admin" ? ["overview", "orders", "products", "sellers", "buyers", "categories", "coupons", "pincodes", "support", "returns", "reviews", "cms", "roles"] : ["overview", "orders", "products", "inventory", "returns", "support", "shop"];
    void warmDashboardCache(userId, panel, resources);
  }, [panel, userId]);
  useEffect(() => { const clear = () => clearDashboardCache(userId); window.addEventListener("ggh-session-ended", clear); return () => window.removeEventListener("ggh-session-ended", clear); }, [userId]);
  return (
    <DashboardUserContext.Provider value={userId}><div className="dash">
      <button
        className={`dash-backdrop ${open ? "open" : ""}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <aside
        className={`dash-sidebar ${open ? "open" : ""}`}
        aria-label={`${panel} navigation`}
      >
        <Link href={`/${panel}`} className="dash-brand">
          <Image
            src="/gogatherhub-logo.png"
            alt="Go Gather Hub"
            width={798}
            height={148}
          />
          <span className="dash-logo-tagline">YOUR DREAM, OUR PLANNING</span>
          <span className="sr-only">{panel} workspace</span>
        </Link>
        <div className="dash-nav-heading">WORKSPACE</div>
        <nav className="dash-nav">
          {nav.map((label) => (
            <Link
              key={label}
              href={`/${panel}/${slug(label)}`}
              prefetch
              onClick={() => setOpen(false)}
            >
              <span className="dash-nav-icon" aria-hidden="true">
                {(() => {
                  const Icon = navIcons[label] ?? UserRound;
                  return <Icon size={18} strokeWidth={1.8} />;
                })()}
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="dash-sidebar-bottom">
          <Badge tone="success">Authenticated</Badge>
          <p>Marketplace workspace</p>
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-topbar">
          <div className="row">
            <button
              className="dash-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} strokeWidth={1.8} />
            </button>
            <div>
              <strong>
                {panel === "seller" ? "Seller Dashboard" : "Admin Dashboard"}
              </strong>
              <div className="small muted">
                Marketplace operations
              </div>
            </div>
          </div>
          <div className="dash-top-actions">
            <LogoutButton className="dash-logout" />
            <Link href="/shop">
              View storefront <ArrowUpRight size={15} strokeWidth={1.8} />
            </Link>
            <span className="dash-avatar" aria-label="Demo profile">
              D
            </span>
          </div>
        </header>
        <main className="dash-content">{children}</main>
      </div>
    </div></DashboardUserContext.Provider>
  );
}
const sellerStats = [
  { label: "Sales summary", value: "₹2,48,500", change: "Demo data" },
  { label: "Total orders", value: "128" },
  { label: "Pending orders", value: "12" },
  { label: "Total products", value: "46" },
  { label: "Low-stock products", value: "5" },
];
const adminStats = [
  { label: "Total sales", value: "₹18,42,900", change: "Demo data" },
  { label: "Total orders", value: "964" },
  { label: "Active sellers", value: "38" },
  { label: "Active buyers", value: "2,410" },
  { label: "Seller approvals", value: "6" },
  { label: "Product approvals", value: "14" },
  { label: "Returns", value: "9" },
  { label: "Pending payouts", value: "₹1,62,000" },
];
const sellerOrders = [
  {
    id: "#MV-10482",
    buyer: "Aarav Mehta",
    amount: "₹3,890",
    status: <Badge tone="warning">Pending</Badge>,
  },
  {
    id: "#MV-10481",
    buyer: "Nisha Kapoor",
    amount: "₹2,490",
    status: <Badge tone="success">Shipped</Badge>,
  },
  {
    id: "#MV-10480",
    buyer: "Rohan Shah",
    amount: "₹5,990",
    status: <Badge>Processing</Badge>,
  },
];
const adminActivity = [
  {
    event: "Seller application submitted",
    time: "12 minutes ago",
    status: <Badge tone="warning">Review</Badge>,
  },
  {
    event: "Product change requested",
    time: "39 minutes ago",
    status: <Badge>Catalog</Badge>,
  },
  {
    event: "Return opened",
    time: "1 hour ago",
    status: <Badge tone="danger">Action</Badge>,
  },
];
export function DashboardOverview({ panel }: { panel: Panel }) {
  const stats = panel === "seller" ? sellerStats : adminStats;
  return (
    <>
      <div className="dash-page-head">
        <div>
          <p className="dash-eyebrow">
            {panel === "seller" ? "YOUR WORKSPACE" : "PLATFORM WORKSPACE"}
          </p>
          <h1>Good morning, {panel === "seller" ? "seller" : "admin"}.</h1>
          <p className="muted">
            A clear view of what needs attention. All figures below are
            illustrative UI data.
          </p>
        </div>
        <Badge tone="warning">Demo preview</Badge>
      </div>
      <div className="dash-stats">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <div className="dash-panels">
        <Card>
          <div className="dash-card-head">
            <div>
              <h2>Sales overview</h2>
              <p className="small muted">
                Illustrative weekly trend · no analytics service connected
              </p>
            </div>
            <Badge>7 days</Badge>
          </div>
          <MiniChart
            values={
              panel === "seller"
                ? [22, 35, 30, 42, 51, 47, 68]
                : [25, 39, 35, 55, 49, 66, 78]
            }
            label="Illustrative sales trend"
          />
          <div className="dash-chart-labels">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </Card>
        <Card>
          <div className="dash-card-head">
            <div>
              <h2>Recent activity</h2>
              <p className="small muted">Sample events for layout review</p>
            </div>
          </div>
          <div className="dash-activity">
            {adminActivity.map((a) => (
              <div key={a.event}>
                <div>
                  <strong>{a.event}</strong>
                  <p className="small muted">{a.time}</p>
                </div>
                {a.status}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <section className="dash-section">
        <div className="dash-card-head">
          <div>
            <h2>
              {panel === "seller" ? "Recent orders" : "Operations snapshot"}
            </h2>
            <p className="small muted">
              UI examples; these are not real records.
            </p>
          </div>
        </div>
        <Card>
          {panel === "seller" ? (
            <DataTable
              columns={[
                { key: "id", label: "Order" },
                { key: "buyer", label: "Buyer" },
                { key: "amount", label: "Amount" },
                { key: "status", label: "Status" },
              ]}
              rows={sellerOrders}
            />
          ) : (
            <DataTable
              columns={[
                { key: "event", label: "Event" },
                { key: "time", label: "When" },
                { key: "status", label: "Area" },
              ]}
              rows={adminActivity}
            />
          )}
        </Card>
      </section>
    </>
  );
}
const descriptions: Record<string, string> = {
  "My Shop":
    "Manage your storefront identity, business information and shop presentation.",
  Products: "Create, review and maintain your catalog.",
  Inventory: "Track stock levels and low-stock alerts.",
  Orders: "Process orders and keep buyers informed.",
  Returns: "Review return requests and item status.",
  Payments: "Review incoming payments and payment history.",
  Commission: "Understand fees and order-level commission.",
  Payouts: "Track pending and completed seller settlements.",
  Support: "Manage questions and support tickets.",
  Settings: "Configure preferences and account security.",
  Sellers: "Review applications, verification and seller status.",
  Buyers: "Understand buyer accounts and activity.",
  Categories: "Organize the marketplace taxonomy.",
  "Brands and Attributes": "Maintain brands and product attributes.",
  Wallet: "Review wallet activity and adjustments.",
  "Coupons and Offers": "Create promotions and manage offer rules.",
  Shipping: "Configure zones, partners and shipping charges.",
  CMS: "Curate pages, banners, blogs and FAQs.",
  SEO: "Manage metadata, sitemap and redirects.",
  Reports: "Explore platform performance and exports.",
  "Staff and Permissions": "Control staff roles and module access.",
};
export function DashboardSection({
  panel,
  title,
}: {
  panel: Panel;
  title: string;
}) {
  return (
    <>
      <div className="dash-page-head">
        <div>
          <p className="dash-eyebrow">{panel.toUpperCase()} WORKSPACE</p>
          <h1>{title}</h1>
          <p className="muted">
            {descriptions[title] ??
              `Review ${title.toLowerCase()} across the marketplace.`}
          </p>
        </div>
        <Badge tone="warning">UI preview</Badge>
      </div>
      <div className="dash-section-grid">
        <Card>
          <h2>Section overview</h2>
          <p className="muted">
            This screen establishes navigation, spacing and empty-state
            behavior. Live records and management actions will be connected in
            later phases.
          </p>
          <div className="dash-placeholder-bars">
            <span />
            <span />
            <span />
          </div>
        </Card>
        <Card>
          <EmptyState
            title={`No live ${title.toLowerCase()} data`}
            description="The backend and authorization layer are not connected yet. This is an intentionally empty preview state."
          />
        </Card>
      </div>
      <div className="dash-return">
        <Button variant="secondary" onClick={() => history.back()}>
          <ArrowLeft size={16} strokeWidth={1.8} /> Go back
        </Button>
      </div>
    </>
  );
}
