import { boundedText } from "@/lib/request-body";
import { backendCookie } from "@/lib/tab-session";
import { NextRequest } from "next/server";

const allowed: Record<string, string[]> = {
  admin: ["overview", "sellers", "products", "orders", "buyers", "reviews", "returns", "coupons", "activity", "pincodes", "support", "categories", "category-requests", "cms", "media", "homepage", "roles", "staff"],
  seller: ["overview", "shop", "products", "inventory", "orders", "returns", "support", "category-requests", "customers", "analytics", "reviews", "payments", "coupons", "integrations"],
};

type Context = { params: Promise<{ panel: string; path: string[] }> };
async function forward(request: NextRequest, context: Context) {
  const { panel, path } = await context.params;
  const method = request.method;
  const list = allowed[panel];
  const validRead = method === "GET" && (panel === "admin" && path.length === 2 && path[0] === "site-sections" || path.length === 1 && list?.includes(path[0]) || ["seller", "admin"].includes(panel) && path.length === 2 && path[0] === "products" || panel === "seller" && path.length === 2 && ["inventory", "coupons"].includes(path[0]) && ["alerts", "movements"].includes(path[1]));
  const validWrite = (method === "PATCH" || method === "POST" || method === "DELETE") && (
    panel === "seller" && (path.join("/") === "shop" || ["products/full", "coupons", "products", "support", "products/import", "products/import/preview", "category-requests"].includes(path.join("/")) && method === "POST" || path.length === 2 && ["inventory", "coupons"].includes(path[0]) || path.length === 2 && path[0] === "products" || path.length === 3 && path[0] === "products" && path[2] === "full" && method === "PATCH" || path.length === 4 && path[0] === "products" && path[2] === "variants" || path.length === 3 && path[0] === "orders" && path[2] === "status" || path.length === 3 && path[0] === "returns" && path[2] === "decision") ||
    panel === "admin" && (path.length === 2 && path[0] === "site-sections" && method === "POST" || path.length === 3 && path[0] === "site-sections" && path[2] === "publish" && method === "PATCH" || path.length === 3 && path[0] === "cms" && path[2] === "publish" && method === "PATCH" || path.length === 3 && path[0] === "products" && path[2] === "full" && method === "PATCH" || path.join("/") === "products/full" && method === "POST" || path.length === 3 && ["sellers", "products", "support", "reviews", "returns", "category-requests"].includes(path[0]) && ["status", "image"].includes(path[2]) || ["coupons", "categories", "cms", "media", "homepage", "roles", "staff"].includes(path.join("/")) && method === "POST" || path.length === 2 && ["categories", "cms", "media", "homepage", "roles", "products"].includes(path[0]) && ["PATCH", "DELETE"].includes(method))
  );
  if (!validRead && !validWrite) return Response.json({ error: "Unknown endpoint" }, { status: 404 });
  if (validWrite && request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const bodyResult = validWrite ? await boundedText(request,panel === "seller" && path[0] === "products" && path[1] === "import" ? 90000 : 32768) : null;
  if(bodyResult && !bodyResult.ok)return bodyResult.response;
  const body = bodyResult?.ok ? bodyResult.text : undefined;
  if (body && body.length > (panel === "seller" && path[0] === "products" && path[1] === "import" ? 90000 : 32768)) return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/${panel === "seller" ? "seller" : "admin"}/${path.map(encodeURIComponent).join("/")}`, {
      method, headers: { cookie: backendCookie(request), "content-type": "application/json" }, body,
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Dashboard service is unavailable." } }, { status: 503 });
  }
}

export async function GET(request: NextRequest, context: Context) { return forward(request, context); }
export async function POST(request: NextRequest, context: Context) { return forward(request, context); }
export async function PATCH(request: NextRequest, context: Context) { return forward(request, context); }
export async function DELETE(request: NextRequest, context: Context) { return forward(request, context); }
