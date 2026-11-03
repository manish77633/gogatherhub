import {notFound} from "next/navigation";
import {LivePanel} from "@/features/dashboard/components/live-panel";
import {adminNav,slug} from "@/features/dashboard/data/navigation";
export function generateStaticParams(){return adminNav.map(label=>({section:slug(label)}))}
export default async function AdminSection({params}:{params:Promise<{section:string}>}){const {section}=await params;const title=adminNav.find(label=>slug(label)===section);if(!title)notFound();return <LivePanel panel="admin" title={title}/>}
