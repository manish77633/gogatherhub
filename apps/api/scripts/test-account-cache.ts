import assert from "node:assert/strict";

async function main() {
const counts = new Map<string, number>();
globalThis.fetch = (async (input: string | URL | Request) => {
  const path = String(input).split("/api/buyer/")[1];
  counts.set(path, (counts.get(path) ?? 0) + 1);
  return new Response(JSON.stringify({ path, request: counts.get(path) }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const { loadAccountData, cachedAccountData, clearAccountData } = await import("../../web/src/features/buyer/components/account-cache");
const user = "buyer-test";
for (const path of ["profile", "orders", "wishlist", "addresses", "returns"]) {
  await Promise.all([loadAccountData(user, path), loadAccountData(user, path)]);
  assert.equal(counts.get(path), 1, `${path} concurrent calls are deduplicated`);
}
for (let visit = 0; visit < 3; visit++) for (const path of ["orders", "wishlist", "addresses", "returns", "profile"]) {
  await loadAccountData(user, path);
  assert.equal(counts.get(path), 1, `${path} revisit uses cached data`);
  assert.ok(cachedAccountData(user, path));
}
await loadAccountData(user, "addresses", true);
assert.equal(counts.get("addresses"), 2, "Address update refreshes addresses");
assert.equal(counts.get("orders"), 1, "Other sections remain cached");
clearAccountData(user);
assert.equal(cachedAccountData(user, "orders"), undefined, "Logout removes cached account data");
await loadAccountData(user, "orders");
assert.equal(counts.get("orders"), 2, "Next session fetches fresh data");
console.log("Account cache checks passed: revisits 0 extra requests, one affected refresh, logout cleared cache");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
