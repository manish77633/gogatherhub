export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/products/${encodeURIComponent(slug)}/reviews`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch { return Response.json([], { status: 503 }); }
}
