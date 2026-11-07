// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require("node:http");
const sessions = new Map();
let serial = 0;
http.createServer(async (req, res) => {
  const reply = (status, value) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(value)); };
  const token = /(?:^|;\s*)ggh_session=([^;]+)/.exec(req.headers.cookie || "")?.[1];
  const user = sessions.get(token);
  if (req.url === "/v1/auth/login") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const { email } = JSON.parse(raw);
    const role = email.startsWith("admin") ? "ADMIN" : email.startsWith("seller") ? "SELLER" : "BUYER";
    const value = String(++serial).padStart(43, "0");
    sessions.set(value, { id: email, email, role, name: email, sellerStatus: "APPROVED" });
    res.setHeader("set-cookie", `ggh_session=${value}; Path=/; HttpOnly; SameSite=Lax`);
    return reply(200, { ok: true, role });
  }
  if (req.url === "/v1/auth/logout") {
    sessions.delete(token); res.setHeader("set-cookie", "ggh_session=; Path=/; Max-Age=0; HttpOnly");
    return reply(200, { ok: true });
  }
  if (req.url === "/v1/catalog/products/variant-test") return reply(200, { slug: "variant-test", name: "Variant test", description: "Test product", imageUrl: null, category: { name: "Test" }, seller: { shopName: "Test seller" }, variants: [{ id: "11111111-1111-4111-8111-111111111111", label: "Small", price: "100", stock: 10 }, { id: "22222222-2222-4222-8222-222222222222", label: "Large", price: "200", stock: 10 }] });
  if (req.url.startsWith("/v1/catalog")) return reply(200, { items: [], categories: [], variants: [] });
  if (!user) return reply(401, { error: { message: "Sign in required" } });
  if (req.url === "/v1/auth/me" || req.url === "/v1/buyer/profile") return reply(200, user);
  if (req.url === "/v1/buyer/cart") return reply(200, { userId: user.id, revision: "a".repeat(64), items: [] });
  return reply(200, []);
}).listen(4310, "127.0.0.1");
