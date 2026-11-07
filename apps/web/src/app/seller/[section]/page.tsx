import {notFound} from "next/navigation";
import {SellerPanel} from "@/features/dashboard/components/seller-panel";
import {sellerNav,slug} from "@/features/dashboard/data/navigation";
export function generateStaticParams(){return sellerNav.map(label=>({section:slug(label)}))}
export default async function SellerSection({params}:{params:Promise<{section:string}>}){const {section}=await params;const title=sellerNav.find(label=>slug(label)===section);if(!title)notFound();return <SellerPanel key={title} title={title}/>}
