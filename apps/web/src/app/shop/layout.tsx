import type {ReactNode} from "react";
import {StorefrontShell} from "@/features/buyer/components/storefront";
import "@/features/buyer/styles/storefront.css";
import "@/features/buyer/styles/homepage.css";
import "@/features/buyer/styles/buyer-pages.css";
import "@/features/buyer/styles/catalog-extensions.css";
import "@/features/buyer/styles/buyer-theme.css";
import "@/features/buyer/styles/account-dashboard.css";
export default async function ShopLayout({children}:{children:ReactNode}){let sections:Array<{pageKey:string;key:string;published:Record<string,unknown>;position:number}>=[];try{const response=await fetch(`${process.env.API_INTERNAL_URL??"http://localhost:4000"}/v1/cms/site-sections`,{next:{revalidate:30},signal:AbortSignal.timeout(5000)});if(response.ok)sections=await response.json()}catch{}let pages:Array<{kind:string;slug:string;title:string}>=[];try{const responses=await Promise.all(["page","policy"].map(kind=>fetch(`${process.env.API_INTERNAL_URL??"http://localhost:4000"}/v1/cms/${kind}`,{next:{revalidate:30},signal:AbortSignal.timeout(5000)})));pages=(await Promise.all(responses.map(async response=>response.ok?await response.json():[]))).flat()}catch{}return <StorefrontShell sections={sections} pages={pages}>{children}</StorefrontShell>}
