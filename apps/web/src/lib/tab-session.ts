// The selector is public routing context, never an authentication credential.
export const TAB_PARAM = "ggh_tab";
export const validTab = (value: string | null | undefined): value is string => Boolean(value && /^[a-f0-9]{32}$/.test(value));
export const tabSessionsEnabled = () => process.env.TAB_SESSIONS !== "false";

export function requestTab(request: { url: string; headers: Headers }): string | undefined {
  const url = new URL(request.url);
  const explicit = request.headers.get("x-ggh-tab") ?? url.searchParams.get(TAB_PARAM);
  if (validTab(explicit)) return explicit;
  // Redirects and ordinary browser navigation retain the originating tab.
  try {
    const referer = new URL(request.headers.get("referer") ?? "");
    const tab = referer.searchParams.get(TAB_PARAM);
    if (referer.origin === url.origin && validTab(tab)) return tab;
  } catch { /* A new navigation has no referring page. */ }
}

export function sessionCookie(raw: string, tab?: string): string {
  if (!tabSessionsEnabled()) return raw;
  if (!validTab(tab)) return "";
  const name = `ggh_session_${tab}=`;
  const value = raw.split(";").map(part => part.trim()).find(part => part.startsWith(name))?.slice(name.length);
  return value ? `ggh_session=${value}` : "";
}

export function backendCookie(request: { url: string; headers: Headers }): string {
  return sessionCookie(request.headers.get("cookie") ?? "", requestTab(request));
}

export function scopeSessionCookie(cookie: string, tab?: string): string {
  if (!tabSessionsEnabled()) return cookie;
  if (!validTab(tab)) throw new Error("Missing tab session context");
  // Host-only cookies: backend domains must never leak into frontend cookies.
  return cookie.replace(/^ggh_session=/, `ggh_session_${tab}=`).replace(/;\s*Domain=[^;]+/ig, "");
}

export function tabUrl(path: string, origin: string, tab?: string): URL {
  const url = new URL(path, origin);
  if (tabSessionsEnabled() && validTab(tab)) url.searchParams.set(TAB_PARAM, tab);
  return url;
}
