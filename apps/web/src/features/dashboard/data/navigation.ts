export const sellerNav = [
  "Overview",
  "My Shop",
  "Products",
  "Inventory",
  "Orders",
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
  "Brands and Attributes",
  "Orders",
  "Reviews",
  "Returns",
  "Payments",
  "Wallet",
  "Coupons and Offers",
  "Shipping",
  "CMS",
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
