export type CategoryGroup = {
  title: string;
  links: { label: string; slug: string }[];
};
export type SuperCategory = {
  label: string;
  slug: string;
  groups: CategoryGroup[];
};

// UI catalog only. Replace this source with paginated API data when catalog management is built.
export const superCategories: SuperCategory[] = [
  {
    label: "Birthday Party",
    slug: "birthday-party",
    groups: [
      {
        title: "Celebrate",
        links: [
          { label: "Birthday combos", slug: "birthday-combos" },
          { label: "Cakes", slug: "cakes" },
          { label: "Balloons & decor", slug: "balloons-decor" },
          { label: "Party supplies", slug: "party-supplies" },
        ],
      },
      {
        title: "Gifts",
        links: [
          { label: "Chocolates", slug: "chocolates" },
          { label: "Flowers", slug: "flowers" },
          { label: "Personalized gifts", slug: "personalized-gifts" },
          { label: "Kids gifts", slug: "kids-gifts" },
        ],
      },
      {
        title: "Moments",
        links: [
          { label: "First birthday", slug: "first-birthday" },
          { label: "Milestone birthday", slug: "milestone-birthday" },
          { label: "Surprise party", slug: "surprise-party" },
        ],
      },
    ],
  },
  {
    label: "Wedding",
    slug: "wedding",
    groups: [
      {
        title: "The celebration",
        links: [
          { label: "Wedding combos", slug: "wedding-combos" },
          { label: "Decor", slug: "wedding-decor" },
          { label: "Flowers", slug: "flowers" },
          { label: "Invitations", slug: "invitations" },
        ],
      },
      {
        title: "For the couple",
        links: [
          { label: "Gift hampers", slug: "gift-hampers" },
          { label: "Personalized gifts", slug: "personalized-gifts" },
          { label: "Home essentials", slug: "home-essentials" },
        ],
      },
    ],
  },
  {
    label: "Puja & Festivals",
    slug: "puja-festivals",
    groups: [
      {
        title: "Puja essentials",
        links: [
          { label: "Puja combos", slug: "puja-combos" },
          { label: "Puja samagri", slug: "puja-samagri" },
          { label: "Diyas & candles", slug: "diyas-candles" },
          { label: "Flowers", slug: "flowers" },
        ],
      },
      {
        title: "Festive gifting",
        links: [
          { label: "Festival hampers", slug: "festival-hampers" },
          { label: "Sweets", slug: "sweets" },
          { label: "Home decor", slug: "home-decor" },
        ],
      },
      {
        title: "Occasions",
        links: [
          { label: "Diwali", slug: "diwali" },
          { label: "Ganesh Chaturthi", slug: "ganesh-chaturthi" },
          { label: "Navratri", slug: "navratri" },
          { label: "Housewarming", slug: "housewarming" },
        ],
      },
    ],
  },
  {
    label: "Cakes & Flowers",
    slug: "cakes-flowers",
    groups: [
      {
        title: "Cakes",
        links: [
          { label: "Chocolate cakes", slug: "chocolate-cakes" },
          { label: "Photo cakes", slug: "photo-cakes" },
          { label: "Eggless cakes", slug: "eggless-cakes" },
        ],
      },
      {
        title: "Flowers",
        links: [
          { label: "Rose bouquets", slug: "rose-bouquets" },
          { label: "Mixed bouquets", slug: "mixed-bouquets" },
          { label: "Flower combos", slug: "flower-combos" },
        ],
      },
    ],
  },
  {
    label: "Combos",
    slug: "combos",
    groups: [
      {
        title: "Build your celebration",
        links: [
          { label: "Birthday party kit", slug: "birthday-combos" },
          { label: "Puja essentials kit", slug: "puja-combos" },
          { label: "Wedding gift set", slug: "wedding-combos" },
        ],
      },
      {
        title: "Pairings",
        links: [
          { label: "Cake & flowers", slug: "cake-flowers" },
          { label: "Cake & chocolates", slug: "cake-chocolates" },
          { label: "Gifts & decor", slug: "gifts-decor" },
        ],
      },
    ],
  },
  {
    label: "Gifts & Decor",
    slug: "gifts-decor",
    groups: [
      {
        title: "Gifts",
        links: [
          { label: "Gift boxes", slug: "gift-boxes" },
          { label: "Personalized gifts", slug: "personalized-gifts" },
          { label: "Toys", slug: "toys" },
        ],
      },
      {
        title: "Decor",
        links: [
          { label: "Home decor", slug: "home-decor" },
          { label: "Lanterns", slug: "lanterns" },
          { label: "Table styling", slug: "table-styling" },
        ],
      },
    ],
  },
];

export const categoryHref = (slug: string) =>
  `/shop/products?collection=${encodeURIComponent(slug)}`;

export type ComboPart = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
};
export type DemoCombo = {
  id: string;
  name: string;
  occasion: string;
  description: string;
  image: string;
  parts: { id: string; quantity: number }[];
};
export const comboParts: ComboPart[] = [
  {
    id: "chocolate-cake",
    name: "Chocolate celebration cake",
    price: 899,
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&q=85",
    category: "Cakes",
  },
  {
    id: "party-balloons",
    name: "Birthday balloon set",
    price: 349,
    image:
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=900&q=85",
    category: "Decor",
  },
  {
    id: "chocolate-box",
    name: "Assorted chocolate box",
    price: 449,
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=85",
    category: "Treats",
  },
  {
    id: "rose-bouquet",
    name: "Red rose bouquet",
    price: 699,
    image: "/product-rose-bouquet-v1.png",
    category: "Flowers",
  },
  {
    id: "party-candles",
    name: "Celebration candles",
    price: 149,
    image:
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=900&q=85",
    category: "Decor",
  },
  {
    id: "puja-thali",
    name: "Puja thali set",
    price: 599,
    image: "/product-festival-lantern-v1.png",
    category: "Puja",
  },
  {
    id: "diyas",
    name: "Decorative diya set",
    price: 299,
    image: "/product-festival-lantern-v1.png",
    category: "Puja",
  },
  {
    id: "incense",
    name: "Incense & holder",
    price: 199,
    image:
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=900&q=85",
    category: "Puja",
  },
  {
    id: "marigold",
    name: "Floral decor bundle",
    price: 449,
    image: "/product-rose-bouquet-v1.png",
    category: "Flowers",
  },
  {
    id: "gift-box",
    name: "Premium gift box",
    price: 899,
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=85",
    category: "Gifts",
  },
  {
    id: "couple-mug",
    name: "Personalized couple mug",
    price: 899,
    image: "/product-couple-mug-v1.png",
    category: "Gifts",
  },
];
export const demoCombos: DemoCombo[] = [
  {
    id: "birthday-party-kit",
    name: "Build Your Birthday Party Kit",
    occasion: "Birthday Party",
    description:
      "Start with cake, balloons and chocolates. Adjust quantities or add more celebration essentials.",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1100&q=85",
    parts: [
      { id: "chocolate-cake", quantity: 1 },
      { id: "party-balloons", quantity: 1 },
      { id: "chocolate-box", quantity: 1 },
    ],
  },
  {
    id: "puja-essentials-kit",
    name: "Build Your Puja Essentials Kit",
    occasion: "Puja & Festivals",
    description:
      "A starting set for a thoughtful puja, with every item editable.",
    image: "/product-festival-lantern-v1.png",
    parts: [
      { id: "puja-thali", quantity: 1 },
      { id: "diyas", quantity: 2 },
      { id: "incense", quantity: 1 },
      { id: "marigold", quantity: 1 },
    ],
  },
  {
    id: "wedding-gift-set",
    name: "Build Your Wedding Gift Set",
    occasion: "Wedding",
    description:
      "Create a personal wedding gift with flowers, keepsakes and a gift box.",
    image: "/hero-gift-v1.png",
    parts: [
      { id: "gift-box", quantity: 1 },
      { id: "rose-bouquet", quantity: 1 },
      { id: "couple-mug", quantity: 1 },
    ],
  },
];

export const demoServiceablePincodes = new Set([
  "110001",
  "110020",
  "400001",
  "400050",
  "560001",
  "560034",
  "700001",
  "600001",
  "302001",
  "411001",
]);

export const collectionProducts: Record<string, string[]> = {
  "birthday-party": [
    "birthday-cake",
    "party-supplies",
    "plush-toy",
    "red-rose-bouquet",
    "chocolate-cake",
    "party-balloons",
    "chocolate-box",
    "party-candles",
  ],
  wedding: [
    "wedding-gift-hamper",
    "red-rose-bouquet",
    "couple-mug",
    "gift-box",
    "rose-bouquet",
  ],
  "puja-festivals": [
    "decor-lantern",
    "puja-thali",
    "diyas",
    "incense",
    "marigold",
  ],
  "cakes-flowers": [
    "birthday-cake",
    "red-rose-bouquet",
    "chocolate-cake",
    "rose-bouquet",
  ],
  "gifts-decor": [
    "luxury-gift-box",
    "decor-lantern",
    "couple-mug",
    "gift-box",
    "ceramic-vase",
  ],
  "birthday-combos": [
    "birthday-cake",
    "chocolate-cake",
    "party-balloons",
    "chocolate-box",
  ],
  "puja-combos": ["puja-thali", "diyas", "incense", "marigold"],
  "wedding-combos": [
    "wedding-gift-hamper",
    "gift-box",
    "couple-mug",
    "rose-bouquet",
  ],
  cakes: ["birthday-cake", "chocolate-cake"],
  "chocolate-cakes": ["birthday-cake", "chocolate-cake"],
  "eggless-cakes": ["birthday-cake"],
  "photo-cakes": ["birthday-cake"],
  flowers: ["red-rose-bouquet", "rose-bouquet", "marigold"],
  "rose-bouquets": ["red-rose-bouquet", "rose-bouquet"],
  "mixed-bouquets": ["red-rose-bouquet", "marigold"],
  "flower-combos": ["red-rose-bouquet", "rose-bouquet"],
  "balloons-decor": ["party-balloons", "party-supplies"],
  "party-supplies": ["party-supplies", "party-balloons", "party-candles"],
  chocolates: ["chocolate-box"],
  "personalized-gifts": ["couple-mug"],
  "kids-gifts": ["plush-toy", "party-supplies"],
  "puja-samagri": ["puja-thali", "incense", "diyas"],
  "diyas-candles": ["diyas", "party-candles"],
  "gift-hampers": ["wedding-gift-hamper", "luxury-gift-box"],
  "festival-hampers": ["luxury-gift-box", "decor-lantern"],
  "home-decor": ["decor-lantern", "ceramic-vase", "table-lamp"],
  lanterns: ["decor-lantern"],
  "gift-boxes": ["luxury-gift-box", "gift-box"],
  toys: ["plush-toy"],
  "home-essentials": ["ceramic-vase", "table-lamp"],
};
export const collectionLabel = (slug: string) =>
  superCategories.find((category) => category.slug === slug)?.label ??
  superCategories
    .flatMap((category) => category.groups.flatMap((group) => group.links))
    .find((link) => link.slug === slug)?.label ??
  slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const comboCollections: Record<string, string[]> = {
  combos: demoCombos.map((combo) => combo.id),
  "birthday-party": ["birthday-party-kit"],
  "birthday-combos": ["birthday-party-kit"],
  wedding: ["wedding-gift-set"],
  "wedding-combos": ["wedding-gift-set"],
  "puja-festivals": ["puja-essentials-kit"],
  "puja-combos": ["puja-essentials-kit"],
};

