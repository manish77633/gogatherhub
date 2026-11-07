import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveProductDetail } from "@/features/buyer/components/live-product-detail";
import type { Metadata } from "next";
import type { LiveProduct } from "@/features/buyer/components/live-catalog";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))return {robots:{index:false}};
 try{const response=await fetch(`${process.env.API_INTERNAL_URL??"http://localhost:4000"}/v1/catalog/products/${encodeURIComponent(id)}`,{next:{revalidate:10},signal:AbortSignal.timeout(5000)});if(!response.ok)return {title:"Product unavailable",robots:{index:false}};const product=await response.json() as LiveProduct;const description=(product.seoDescription||product.description).replace(/\s+/g," ").slice(0,160);const title=product.seoTitle||`${product.name} | Go Gather Hub`;const images=[...(product.imageUrls??[]),product.imageUrl].filter((value):value is string=>Boolean(value));return {title,description,alternates:{canonical:`/shop/products/${product.slug}`},openGraph:{title,description,type:"website",images},twitter:{card:"summary_large_image",title,description,images:images.slice(0,1)}};}catch{return {title:"Product unavailable",robots:{index:false}}}
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) notFound();
  let product: LiveProduct | null = null;
  let related: LiveProduct[] = [];
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/products/${encodeURIComponent(id)}`, { next: { revalidate: 10 }, signal: AbortSignal.timeout(10000) });
    if (response.status === 400 || response.status === 404) notFound();
    if (response.ok) product = await response.json();
    if (product?.category.slug) {
      const relatedResponse = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/products?category=${encodeURIComponent(product.category.slug)}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(10000) });
      if (relatedResponse.ok) related = ((await relatedResponse.json()) as { items: LiveProduct[] }).items.filter(item => item.slug !== id).slice(0, 4);
    }
  } catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; }
  const offer=product?.variants.find(item=>item.stock>0)??product?.variants[0];
  const structured=product?{"@context":"https://schema.org","@type":"Product",name:product.name,description:product.description,image:[...(product.imageUrls??[]),product.imageUrl].filter(Boolean),brand:product.brand?{"@type":"Brand",name:product.brand}:undefined,offers:offer?{"@type":"Offer",priceCurrency:"INR",price:offer.price,availability:offer.stock>0?"https://schema.org/InStock":"https://schema.org/OutOfStock",url:`${process.env.SITE_URL??"http://localhost:3000"}/shop/products/${product.slug}`}:undefined}:null;
  return <main className="ggh-page">{structured&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/>}<div className="ggh-page-container"><nav aria-label="Breadcrumb"><Link href="/shop">Home</Link> / <Link href="/shop/products">Products</Link> / {product?.category.parent && <><Link href={`/shop/products?category=${encodeURIComponent(product.category.parent.slug)}`}>{product.category.parent.name}</Link> / </>}{product?.category && <><Link href={`/shop/products?category=${encodeURIComponent(product.category.slug ?? "")}`}>{product.category.name}</Link> / </>}{product?.name ?? id}</nav>{product ? <LiveProductDetail product={product} related={related} /> : <p role="alert">Product service is unavailable. Please retry shortly.</p>}</div></main>;
}
