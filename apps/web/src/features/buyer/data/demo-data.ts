import { comboParts } from "./store-catalog";

export type DemoProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compareAt: number;
  rating: number;
  image: string;
  badge?: string;
  description: string;
};
export const categories = [
  "All",
  "Fashion",
  "Home",
  "Electronics",
  "Beauty",
  "Lifestyle",
] as const;
export const products: DemoProduct[] = [
  {
    id: "wedding-gift-hamper",
    name: "Premium Wedding Gift Hamper",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 2499,
    compareAt: 3099,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=900&q=85",
    badge: "POPULAR",
    description: "A thoughtful gift arrangement for meaningful celebrations.",
  },
  {
    id: "red-rose-bouquet",
    name: "Red Rose Bouquet",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 1699,
    compareAt: 1999,
    rating: 4.8,
    image: "/product-rose-bouquet-v1.png",
    badge: "GIFT PICK",
    description:
      "Fresh floral inspiration for birthdays, anniversaries and just-because moments.",
  },
  {
    id: "decor-lantern",
    name: "Festival Decor Lantern",
    brand: "Go Gather Hub",
    category: "Home",
    price: 1299,
    compareAt: 1699,
    rating: 4.7,
    image: "/product-festival-lantern-v1.png",
    description: "A warm accent for festive corners and gathering spaces.",
  },
  {
    id: "couple-mug",
    name: "Personalized Couple Mug",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 899,
    compareAt: 999,
    rating: 4.8,
    image: "/product-couple-mug-v1.png",
    description:
      "A keepsake mug concept for the people who make every day feel special.",
  },
  {
    id: "birthday-cake",
    name: "Chocolate Truffle Cake",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 1999,
    compareAt: 2499,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&q=85",
    description: "A celebratory chocolate cake for the moments worth sharing.",
  },
  {
    id: "luxury-gift-box",
    name: "Luxury Gift Box",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 1499,
    compareAt: 1999,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=85",
    description: "A beautifully presented gift box for every occasion.",
  },
  {
    id: "party-supplies",
    name: "Colorful Party Supplies",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 799,
    compareAt: 999,
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=900&q=85",
    description: "Bright accents for a lively celebration.",
  },
  {
    id: "plush-toy",
    name: "Soft Plush Toy",
    brand: "Go Gather Hub",
    category: "Gifts",
    price: 1199,
    compareAt: 1499,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=900&q=85",
    description: "A playful gift for little celebrations.",
  },
  {
    id: "everyday-tote",
    name: "Everyday Canvas Tote",
    brand: "Haven & Co.",
    category: "Fashion",
    price: 1890,
    compareAt: 2490,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=900&q=85",
    badge: "BESTSELLER",
    description:
      "An easy everyday carry with structured canvas, roomy compartments and timeless details.",
  },
  {
    id: "ceramic-vase",
    name: "Sculpted Ceramic Vase",
    brand: "Form & Field",
    category: "Home",
    price: 2490,
    compareAt: 3290,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=900&q=85",
    badge: "NEW",
    description:
      "A softly sculpted accent for shelves, consoles and quiet corners.",
  },
  {
    id: "wireless-headphones",
    name: "Studio Wireless Headphones",
    brand: "NOVA Audio",
    category: "Electronics",
    price: 5990,
    compareAt: 7490,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85",
    badge: "20% OFF",
    description:
      "Immersive sound and comfortable all-day listening in a clean, modern silhouette.",
  },
  {
    id: "skin-serum",
    name: "The Daily Glow Serum",
    brand: "SORA Skin",
    category: "Beauty",
    price: 1290,
    compareAt: 1690,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=900&q=85",
    description:
      "A lightweight daily ritual designed for luminous, hydrated-looking skin.",
  },
  {
    id: "lounge-chair",
    name: "The Arc Lounge Chair",
    brand: "Atelier Living",
    category: "Home",
    price: 18990,
    compareAt: 24990,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=85",
    badge: "EDITOR'S PICK",
    description:
      "A considered statement piece with a calm profile and inviting comfort.",
  },
  {
    id: "classic-watch",
    name: "Minimalist Steel Watch",
    brand: "Morrow",
    category: "Lifestyle",
    price: 4490,
    compareAt: 5990,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85",
    description: "Understated precision, made for every day.",
  },
  {
    id: "linen-shirt",
    name: "Relaxed Linen Shirt",
    brand: "Haven & Co.",
    category: "Fashion",
    price: 2290,
    compareAt: 2990,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=900&q=85",
    badge: "NEW",
    description: "Breathable linen with an effortless shape for warmer days.",
  },
  {
    id: "table-lamp",
    name: "Aura Table Lamp",
    brand: "Form & Field",
    category: "Home",
    price: 3590,
    compareAt: 4590,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=85",
    description: "Soft ambient light for evenings well spent.",
  },
  ...comboParts
    .filter((part) => part.id !== "couple-mug")
    .map((part) => ({
      id: part.id,
      name: part.name,
      brand: "Go Gather Hub",
      category: part.category,
      price: part.price,
      compareAt: part.price,
      rating: 4.7,
      image: part.image,
      description: `An illustrative ${part.category.toLowerCase()} item for a customizable celebration kit.`,
    })),
];
export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
