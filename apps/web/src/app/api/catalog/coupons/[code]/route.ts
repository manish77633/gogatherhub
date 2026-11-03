export async function GET(_request: Request, context: RouteContext<"/api/catalog/coupons/[code]">) {
  const { code } = await context.params;
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/coupons/${encodeURIComponent(code)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Coupon service is unavailable." } }, { status: 503 });
  }
}
