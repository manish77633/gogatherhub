import type {ReactNode} from "react";
import {StorefrontShell} from "@/features/buyer/components/storefront";
import "@/features/buyer/styles/storefront.css";
import "@/features/buyer/styles/homepage.css";
import "@/features/buyer/styles/buyer-pages.css";
import "@/features/buyer/styles/catalog-extensions.css";
import "@/features/buyer/styles/buyer-theme.css";
export default function ShopLayout({children}:{children:ReactNode}){return <StorefrontShell>{children}</StorefrontShell>}
