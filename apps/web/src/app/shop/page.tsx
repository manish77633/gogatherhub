import type { Metadata } from "next";
import { Homepage } from "@/features/buyer/components/homepage";
type Section={key:string;published:Record<string,unknown>;position:number};
async function loadSections():Promise<Section[]> {
  try { const response=await fetch(`${process.env.API_INTERNAL_URL??"http://localhost:4000"}/v1/cms/homepage/sections`,{next:{revalidate:30},signal:AbortSignal.timeout(5000)}); return response.ok?await response.json():[]; } catch { return [] }
}
export async function generateMetadata():Promise<Metadata>{const hero=(await loadSections()).find(section=>section.key==="hero")?.published??{};const title=typeof hero.heading==="string"&&hero.heading?`${hero.heading} | Go Gather Hub`:"Go Gather Hub | Gifts, Celebrations & More";const description=typeof hero.description==="string"&&hero.description?hero.description:"Shop gifts, celebration essentials and curated collections at Go Gather Hub.";const image=typeof hero.imageUrl==="string"&&hero.imageUrl.startsWith("https://")?hero.imageUrl:undefined;return {title,description,alternates:{canonical:"/shop"},openGraph:{title,description,images:image?[image]:undefined}}}
export default async function ShopHome() {
  const sections=await loadSections();
  return <Homepage sections={sections}/>;
}
