import Link from "next/link";

export default async function ContentIndex() {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
  const kinds = ["page", "policy", "blog", "faq"];
  const groups = await Promise.all(kinds.map(async kind => {
    try { const response = await fetch(`${base}/v1/cms/${kind}`, { cache: "no-store", signal: AbortSignal.timeout(5000) }); return { kind, items: response.ok ? await response.json() as { slug: string; title: string }[] : [] }; }
    catch { return { kind, items: [] as { slug: string; title: string }[] }; }
  }));
  return <main className="ggh-page"><div className="ggh-page-container"><p className="ggh-page-eyebrow">Information</p><h1>Guides and policies</h1>{groups.map(group => <section key={group.kind}><h2>{group.kind.toUpperCase()}</h2>{group.items.length ? group.items.map(item => <p key={item.slug}><Link href={`/shop/content/${group.kind}/${item.slug}`}>{item.title}</Link></p>) : <p>No published entries.</p>}</section>)}</div></main>;
}
