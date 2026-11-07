import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Block={type:"heading"|"paragraph"|"image";text:string;url?:string};
function blocks(body:string):Block[]{if(body.startsWith("GHH_BLOCKS_V1:")){try{const parsed=JSON.parse(body.slice(14));if(Array.isArray(parsed))return parsed}catch{}}return body.split(/\n\s*\n/).filter(Boolean).map(text=>({type:"paragraph",text}))}
type Entry = { kind: string; title: string; body: string; imageUrl?: string; metaTitle?: string; metaDescription?: string; updatedAt: string };
async function load(kind: string, slug: string): Promise<Entry | null> {
  if (!/^(page|policy|blog|faq|banner)$/.test(kind) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  try { const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/cms/${kind}/${slug}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(5000) }); return response.ok ? await response.json() : null; }
  catch { return null; }
}
export async function generateMetadata({ params }: { params: Promise<{ kind: string; slug: string }> }): Promise<Metadata> {
  const { kind, slug } = await params; const entry = await load(kind, slug);
  if (!entry) return { title: "Content unavailable", robots: { index: false } };
  return { title: entry.metaTitle || entry.title, description: entry.metaDescription || blocks(entry.body).map(block=>block.text).join(" ").slice(0, 160), alternates: { canonical: `/shop/content/${kind}/${slug}` }, openGraph: { title: entry.metaTitle || entry.title, description: entry.metaDescription || blocks(entry.body).map(block=>block.text).join(" ").slice(0, 160), type: "article" } };
}
export default async function ContentPage({ params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params; const entry = await load(kind, slug); if (!entry) notFound();
  const contentBlocks=blocks(entry.body); const description=contentBlocks.map(block=>block.text).join(" ").slice(0,160); const structured=kind==="blog"?{"@context":"https://schema.org","@type":"Article",headline:entry.title,description,image:entry.imageUrl?[entry.imageUrl]:undefined,dateModified:entry.updatedAt,mainEntityOfPage:`${process.env.SITE_URL??"http://localhost:3000"}/shop/content/${kind}/${slug}`}:null;
  return <main className="ggh-page">{structured&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/>}<article className="ggh-page-container ggh-content-entry"><nav aria-label="Breadcrumb"><Link href="/shop">Home</Link> / <Link href="/shop/content">Information</Link> / {entry.title}</nav><p className="ggh-page-eyebrow">{entry.kind.toLowerCase()}</p><h1>{entry.title}</h1>{entry.imageUrl&&<Image src={entry.imageUrl} alt={entry.title} width={900} height={480} unoptimized/>}{contentBlocks.map((block,index)=>block.type==="heading"?<h2 key={index}>{block.text}</h2>:block.type==="image"&&block.url?<Image key={index} src={block.url} alt={block.text} width={900} height={480} unoptimized/>:<p key={index}>{block.text}</p>)}</article></main>;
}
