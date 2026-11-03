import { test, expect, type Page } from "@playwright/test";
import { sessionCookie, scopeSessionCookie } from "../src/lib/tab-session";

async function open(page: Page) {
  await page.goto("/shop/login");
  await expect(page).toHaveURL(/ggh_tab=[a-f0-9]{32}/);
  await page.waitForFunction(() => Boolean(sessionStorage.getItem("ggh_tab")));
}
async function api(page: Page, path: string, body?: object) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
    return { status: response.status, body: await response.json() };
  }, { path, body });
}

test("selector isolation fails closed and rollback restores shared cookies", () => {
  const tab = "a".repeat(32);
  const raw = `ggh_session=legacy; ggh_session_${tab}=buyer`;
  expect(sessionCookie(raw, tab)).toBe("ggh_session=buyer");
  expect(sessionCookie(raw)).toBe("");
  expect(sessionCookie(raw, "invalid")).toBe("");
  expect(scopeSessionCookie("ggh_session=buyer; Domain=backend.example; HttpOnly; Path=/", tab)).toBe(`ggh_session_${tab}=buyer; HttpOnly; Path=/`);
  const previous = process.env.TAB_SESSIONS;
  try {
    process.env.TAB_SESSIONS = "false";
    expect(sessionCookie(raw)).toBe(raw);
    expect(scopeSessionCookie("ggh_session=legacy; HttpOnly")).toBe("ggh_session=legacy; HttpOnly");
  } finally {
    if (previous === undefined) delete process.env.TAB_SESSIONS; else process.env.TAB_SESSIONS = previous;
  }
});

test("buyer, admin and seller remain independent in one browser", async ({ context }) => {
  const pages = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
  for (const page of pages) await open(page);
  const emails = ["buyer@example.com", "admin@example.com", "seller@example.com"];
  for (let i = 0; i < pages.length; i++) {
    expect((await api(pages[i], "/api/auth/login", { email: emails[i], password: "test-password-123" })).status).toBe(200);
    await pages[i].evaluate(i => sessionStorage.setItem("ggh-demo-cart", JSON.stringify({ item: i + 1 })), i);
  }
  const cookies = await context.cookies();
  expect(cookies.filter(cookie => cookie.name.startsWith("ggh_session_") && cookie.httpOnly)).toHaveLength(3);
  expect(cookies.some(cookie => cookie.name === "ggh_session")).toBe(false);
  for (let i = 0; i < pages.length; i++) {
    await pages[i].reload();
    expect((await api(pages[i], "/api/buyer/profile")).body.email).toBe(emails[i]);
    expect(await pages[i].evaluate(() => JSON.parse(sessionStorage.getItem("ggh-demo-cart")!))).toEqual({ item: i + 1 });
  }
  expect((await api(pages[1], "/api/auth/logout", {})).status).toBe(200);
  expect((await api(pages[1], "/api/buyer/profile")).status).toBe(401);
  expect((await api(pages[0], "/api/buyer/profile")).body.email).toBe(emails[0]);
  expect((await api(pages[2], "/api/buyer/profile")).body.email).toBe(emails[2]);
  const fresh = await context.newPage(); await open(fresh);
  expect((await api(fresh, "/api/buyer/profile")).status).toBe(401);
});

test("copied tab URLs do not adopt another account", async ({ context }) => {
  const first = await context.newPage(); await open(first);
  await api(first, "/api/auth/login", { email: "buyer@example.com", password: "test-password-123" });
  const second = await context.newPage(); await second.goto(first.url());
  await expect.poll(() => second.url()).not.toBe(first.url());
  expect((await api(second, "/api/buyer/profile")).status).toBe(401);
  expect((await api(first, "/api/buyer/profile")).body.email).toBe("buyer@example.com");
});

test("sign-in forms retain separate server-verified admin and seller roles", async ({ context }) => {
  const admin = await context.newPage(); const seller = await context.newPage();
  for (const [page, email, panel] of [[admin, "admin@example.com", "admin"], [seller, "seller@example.com", "seller"]] as const) {
    await open(page);
    await page.locator(".ggh-auth-form").getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("test-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${panel}/overview.*ggh_tab=`));
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/${panel}/overview.*ggh_tab=`));
  }
  // A seller cannot become an administrator merely by changing the route.
  const selector = new URL(seller.url()).searchParams.get("ggh_tab");
  await seller.goto(`/admin/overview?ggh_tab=${selector}`);
  await expect(seller).toHaveURL(/\/seller\/overview/);
  expect((await api(admin, "/api/buyer/profile")).body.role).toBe("ADMIN");
});

test("concurrent Google starts retain separate state and reject forged callbacks", async ({ context }) => {
  const first = await context.newPage(); const second = await context.newPage();
  await open(first); await open(second);
  const starts = [];
  for (const page of [first, second]) {
    const tab = new URL(page.url()).searchParams.get("ggh_tab");
    const response = await context.request.get(`/api/auth/google/start?ggh_tab=${tab}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers().location);
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:4311/api/auth/google/callback");
    starts.push(location.searchParams.get("state")!);
  }
  expect(starts[0]).not.toBe(starts[1]);
  const cookies = await context.cookies("http://localhost:4311/api/auth/google/callback");
  for (const state of starts) expect(cookies.some(cookie => cookie.name === `ggh_oauth_${state}` && cookie.httpOnly)).toBe(true);
  const forged = await context.request.get("/api/auth/google/callback?state=forged&code=forged", { maxRedirects: 0 });
  expect(forged.headers().location).toContain("error=google-state");
});

test("a new window with copied sessionStorage receives a fresh session", async ({ context }) => {
  const first = await context.newPage(); await open(first);
  await api(first, "/api/auth/login", { email: "buyer@example.com", password: "test-password-123" });
  const pending = context.waitForEvent("page");
  await first.evaluate(() => { window.open(location.href, "_blank"); });
  const second = await pending;
  await second.waitForLoadState();
  await expect.poll(() => second.url()).not.toBe(first.url());
  await expect.poll(async () => (await api(second, "/api/buyer/profile")).status).toBe(401);
  expect((await api(first, "/api/buyer/profile")).body.email).toBe("buyer@example.com");
});
