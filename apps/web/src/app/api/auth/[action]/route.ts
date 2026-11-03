import { NextRequest } from "next/server";

const allowed = new Set(["login", "register", "register-seller", "logout", "google"]);

export async function POST(request: NextRequest, context: RouteContext<"/api/auth/[action]">) {
  const { action } = await context.params;
  if (!allowed.has(action)) return Response.json({ error: "Unknown action" }, { status: 404 });
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const body = await request.text();
  if (body.length > 8192) return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/${action}`, {
      method: "POST", headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "" },
      body: body || "{}", cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) headers.set("set-cookie", setCookie);
    return new Response(await response.text(), { status: response.status, headers });
  } catch {
    return Response.json({ error: { message: "Account service is unavailable. Please try again later." } }, { status: 503 });
  }
}
