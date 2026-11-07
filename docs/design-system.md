# Marketform design system (Phase 1)

## Direction

The current Phase 1 showcase uses soft neumorphism with modern minimalism for dashboard-oriented UI. Use depth sparingly: elevated cards and secondary actions receive dual shadows; input fields are flat, bordered surfaces; primary buttons use a solid accent. The light theme is the only implemented theme. All colors and global dimensions live in `apps/web/src/app/globals.css` under `:root`.

**Buyer storefront direction (user decision, 31 October 2026):** Build a realistic, rich ecommerce interface. Do not use neumorphism on buyer-facing pages. Prioritize product photography, strong merchandising hierarchy, clear prices and promotions, familiar navigation, crisp surfaces, restrained shadows, and prominent cart/checkout actions. Buyer components may share accessibility and typography foundations, but require separate storefront surface and component tokens so dashboard styling does not leak into shopping pages.

The Go Gather Hub homepage follows the user-supplied homepage reference with warm ivory surfaces, light blush, restrained red, serif display headings and sans-serif utility copy. Homepage-specific styles live in `apps/web/src/app/homepage.css`; reusable header/footer and browser-only commerce preview state live in `apps/web/src/components/storefront.tsx`. The custom gift hero asset is `apps/web/public/hero-gift-v1.png`. It was generated with the built-in imagegen tool from this prompt: “Photorealistic panoramic ecommerce hero; warm ivory interior, elegant ivory gift box with pale peach satin bow on right third, delicate white flowers, uncluttered left half for headline, no text or logos.”

Listing, product detail, cart, wishlist and account preview pages share this buyer visual language. Their reusable view components are in `apps/web/src/components/buyer-pages.tsx` and their styles in `apps/web/src/app/buyer-pages.css`. The account forms and checkout remain disabled until server-side authentication and order/payment flows exist. Cart and wishlist data are local browser previews only.

Three product images were generated before the user requested a stop to image generation: `apps/web/public/product-festival-lantern-v1.png` (warm brass festival lanterns), `apps/web/public/product-couple-mug-v1.png` (white personalized couple mug) and `apps/web/public/product-rose-bouquet-v1.png` (red roses in blush wrap). All were produced with the built-in imagegen tool using square, realistic premium catalog photography prompts with clean cream backgrounds and no logos or text. No further image generation is planned for this UI pass.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#E9ECF2` | App canvas |
| `--surface` | `#EEF1F6` | Cards and secondary buttons |
| `--raised` | `#F8F9FC` | Inputs, menus, dialogs |
| `--text` | `#202939` | Primary content |
| `--muted` | `#667287` | Secondary copy; darker than initial suggestion for readability |
| `--primary` | `#526AAB` | Primary action, focus, links |
| `--success` | `#187A5C` | Positive status text |
| `--danger` | `#BD434C` | Error and destructive text |
| `--warning` | `#946111` | Warning text |
| `--border` | `#CBD3DF` | Control separation |
| `--shadow`, `--shadow-sm` | Dual light/dark shadows | Elevated surfaces only |
| `--radius` | `16px` | Base corner radius |
| `--font` | Manrope | Body and heading typography, self-hosted by Next.js font loader |

Spacing follows 4/8/12/16/24/32/48 px rhythm. Heading sizes adapt to viewport width. Interactive targets are at least 42px high. Visible `:focus-visible` outlines are global; dialogs trap focus and close with Escape. Reduced-motion preference removes animations. Status colors pair with text and dot, so color alone is not the only cue.

## Components and ownership

`apps/web/src/components/ui.tsx` exports buttons/icon buttons, input/select/textarea/search, cards/stat cards, table/pagination, badges, tabs, dropdown, modal/confirmation, toast, tooltip, breadcrumbs, chart, empty state, skeleton and file upload. `apps/web/src/components/app-shell.tsx` provides responsive sidebar/top navigation. `apps/web/src/app/page.tsx` is a style guide with explicitly labeled static examples; it is not a functional marketplace dashboard.

Use buttons for actions and links for navigation. Form fields require visible labels; validation errors use `aria-invalid` and associated descriptions. Tables require column labels and `data-label` per mobile cell. File upload selection is local only; wire to signed storage in a later phase. Charts in the showcase are illustrative SVGs and must not be presented as real metrics.

## Responsive rules

| Width | Behavior |
|---|---|
| >= 1024px | Fixed 240px sidebar, multi-column grids, full table |
| 768-1023px | 72px icon sidebar, two-column grids |
| <= 767px | Navigation drawer with backdrop, one-column grids, tables rendered as labeled row cards, stacked hero and forms |

Every page should support 320px wide viewports without horizontal body overflow. Review keyboard navigation, contrast, 200% zoom and screen reader labels whenever adding a new component.

## Phase limits

No backend, authentication, order logic or external API is connected. The style guide's toast, dialog, tabs, dropdown and pagination are local interaction examples. No credentials are required in Phase 1; an `.env.example` will be added when configuration is introduced. Buyer storefront visuals are reserved for its implementation phase and must follow the separate direction above.
# Buyer UI refresh

- Buyer storefront typography uses **Fraunces** for editorial headings and **DM Sans** for body copy; dashboard typography remains separate.
- Buyer navigation, product actions, benefits, FAQ, ratings and dashboard navigation use the tree-shaken `lucide-react` SVG icon package. Decorative emoji and placeholder social/app-store badges were removed.
- The supplied transparent logo PNG is preserved. A CSS text overlay covers its original white subtitle and renders “YOUR DREAM, OUR PLANNING” in dark text on the light header/footer surface. The black rectangle behind the logo has been removed.
- Desktop category discovery cards use a photo, concise heading and short caption. Mobile cards use a two-column layout. Subcategory links remain available through the header mega menu.
- Product cards use wider image space, simpler borders, consistent pricing and a stable bag action. The buyer theme uses the logo's coral lettering (`#c84332` for readable controls), warm white surfaces, Cormorant Garamond headings and DM Sans body text. Kit editing stays on combo pages.
