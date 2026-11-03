import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Entry = { kind: string; title: string; body: string; imageUrl?: string; metaTitle?: string; metaDescription?: string; updatedAt: string };
async function load(kind: string, slug: string): Promise<Entry | null> {
  if (!/^(page|policy|blog|faq|banner)$/.test(kind) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  try { const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/cms/${kind}/${slug}`, { cache: "no-store", signal: AbortSignal.timeout(5000) }); return response.ok ? await response.json() : null; }
  catch { return null; }
}
export async function generateMetadata({ params }: { params: Promise<{ kind: string; slug: string }> }): Promise<Metadata> {
  const { kind, slug } = await params; const entry = await load(kind, slug);
  if (!entry) return { title: "Content unavailable", robots: { index: false } };
  return { title: entry.metaTitle || entry.title, description: entry.metaDescription || entry.body.slice(0, 160), alternates: { canonical: `/shop/content/${kind}/${slug}` }, openGraph: { title: entry.metaTitle || entry.title, description: entry.metaDescription || entry.body.slice(0, 160), type: "article" } };
}
export default async function ContentPage({ params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params; const entry = await load(kind, slug); if (!entry) notFound();
  return <main className="ggh-page"><article className="ggh-page-container ggh-content-entry"><nav aria-label="Breadcrumb"><Link href="/shop">Home</Link> / <Link href="/shop/content">Information</Link> / {entry.title}</nav><p className="ggh-page-eyebrow">{entry.kind.toLowerCase()}</p><h1>{entry.title}</h1>{entry.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article></main>;
}
