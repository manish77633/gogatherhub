export const sellerNav = [
  "Overview",
  "My Shop",
  "Products",
  "Inventory",
  "Orders",
  "Coupons and Offers",
  "Customers",
  "Analytics",
  "Reviews",
  "Returns",
  "Payments",
  "Commission",
  "Payouts",
  "Support",
  "Settings",
] as const;

export const adminNav = [
  "Overview",
  "Sellers",
  "Buyers",
  "Products",
  "Categories",
  "Category Requests",
  "Brands and Attributes",
  "Orders",
  "Reviews",
  "Returns",
  "Payments",
  "Wallet",
  "Coupons and Offers",
  "Shipping",
  "CMS",
  "Pages",
  "Homepage",
  "Media Library",
  "SEO",
  "Reports",
  "Staff and Permissions",
  "Support",
  "Settings",
] as const;

export const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
