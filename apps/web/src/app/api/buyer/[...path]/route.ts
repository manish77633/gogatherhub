import { boundedText } from "@/lib/request-body";
import { backendCookie } from "@/lib/tab-session";
import { NextRequest } from "next/server";

async function forward(request: NextRequest, path: string[], method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT") {
  const allowed = path.length === 1 && path[0] === "notifications" && method === "GET" ||
    path.join("/") === "notifications/read" && method === "POST" ||
    path.length === 3 && path[0] === "support" && path[2] === "replies" && ["GET", "POST"].includes(method) || path.length === 1 && ({ addresses: ["GET","POST"], orders: ["GET","POST"], profile: ["GET","PATCH"], support: ["GET","POST"], cart: ["GET","PUT"], wishlist: ["GET"], "recently-viewed": ["GET"], reviews: ["GET","POST"], returns: ["GET","POST"], coupons: ["GET"] } as Record<string,string[]>)[path[0]]?.includes(method) ||
    path.length === 2 && ["wishlist", "recently-viewed"].includes(path[0]) && (method === "POST" || method === "DELETE" && path[0] === "wishlist") ||
    path.length === 2 && path[0] === "cart" && path[1] === "merge" && method === "POST" ||
    path.length === 2 && path[0] === "orders" && path[1] === "quote" && method === "POST" ||
    path.length === 2 && (path[0] === "orders" && method === "GET" || path[0] === "addresses" && ["DELETE", "PATCH"].includes(method)) ||
    path.length === 3 && path[0] === "addresses" && path[2] === "default" && method === "PATCH" ||
    path.length === 3 && path[0] === "orders" && path[2] === "cancel" && method === "POST" ||
    path.length === 4 && path[0] === "orders" && path[2] === "payment" && ["verify", "retry"].includes(path[3]) && method === "POST";
  if (!allowed) return Response.json({ error: "Unknown endpoint" }, { status: 404 });
  if (method !== "GET" && request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const bodyResult = method === "POST" || method === "PATCH" || method === "PUT" ? await boundedText(request,32768) : null;
  if(bodyResult && !bodyResult.ok)return bodyResult.response;
  const body = bodyResult?.ok ? bodyResult.text : undefined;
  if (body && body.length > 32768) return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/buyer/${path.map(encodeURIComponent).join("/")}`, {
      method, headers: { cookie: backendCookie(request), "content-type": "application/json" }, body,
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Order service is unavailable." } }, { status: 503 });
  }
}

export async function GET(request: NextRequest, context: RouteContext<"/api/buyer/[...path]">) { return forward(request, (await context.params).path, "GET"); }
export async function POST(request: NextRequest, context: RouteContext<"/api/buyer/[...path]">) { return forward(request, (await context.params).path, "POST"); }
export async function PATCH(request: NextRequest, context: RouteContext<"/api/buyer/[...path]">) { return forward(request, (await context.params).path, "PATCH"); }
export async function DELETE(request: NextRequest, context: RouteContext<"/api/buyer/[...path]">) { return forward(request, (await context.params).path, "DELETE"); }
export async function PUT(request: NextRequest, context: RouteContext<"/api/buyer/[...path]">) { return forward(request, (await context.params).path, "PUT"); }
