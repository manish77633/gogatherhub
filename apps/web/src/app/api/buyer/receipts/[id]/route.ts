import { NextRequest } from "next/server";
import { backendCookie } from "@/lib/tab-session";
import { receiptHtml } from "@/lib/receipt";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
 const { id } = await context.params;
 if (!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ error: "Invalid order" }, { status: 400 });
 try {
  const result = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/buyer/orders/${id}`, { headers: { cookie: backendCookie(request) }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!result.ok) return Response.json({ error: "Order record unavailable" }, { status: result.status });
  const order = await result.json();
  return new Response(receiptHtml(order), { headers: { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="order-${id}.html"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
 } catch { return Response.json({ error: "Unable to download order record" }, { status: 503 }); }
}
