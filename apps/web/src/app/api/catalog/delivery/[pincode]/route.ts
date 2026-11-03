export async function GET(_request: Request, context: RouteContext<"/api/catalog/delivery/[pincode]">) {
  const { pincode } = await context.params;
  if (!/^\d{6}$/.test(pincode)) return Response.json({ error: "Invalid pincode" }, { status: 400 });
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/catalog/delivery/${pincode}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Availability service is unavailable." } }, { status: 503 });
  }
}
