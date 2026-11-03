import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { tabUrl } from "./tab-session";

export async function tabRedirect(path: string): Promise<never> {
  const url = tabUrl(path, "http://internal", (await headers()).get("x-ggh-page-tab") ?? undefined);
  redirect(url.pathname + url.search + url.hash);
}
