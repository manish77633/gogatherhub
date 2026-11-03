export async function GET() {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/categories`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Catalog service unavailable" }, { status: 503 });
  }
}
