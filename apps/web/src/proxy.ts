import { NextRequest, NextResponse } from "next/server";
import { requestTab, tabSessionsEnabled, TAB_PARAM } from "./lib/tab-session";

export function proxy(request: NextRequest) {
  if (!tabSessionsEnabled()) return NextResponse.next();
  const tab = requestTab(request);
  const headers = new Headers(request.headers);
  // Always overwrite incoming internal context.
  headers.delete("x-ggh-page-tab");
  if (tab) headers.set("x-ggh-page-tab", tab);
  const url = request.nextUrl.clone();
  if (tab && !url.searchParams.has(TAB_PARAM) && !request.headers.has("rsc")) {
    url.searchParams.set(TAB_PARAM, tab);
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/shop/:path*", "/seller/:path*", "/admin/:path*"] };
