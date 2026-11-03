"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminNav, sellerNav, slug } from "../data/navigation";
import { CloudinaryImageField, ProductImageEditor } from "./cloudinary-image";
import { cachedPanel, fetchPanel } from "./dashboard-cache";
import { useDashboardUserId } from "./dashboard-context";

type Panel = "admin" | "seller";
type RecordValue = Record<string, unknown>;
const endpoint: Record<Panel, Record<string, string>> = {
  admin: { Overview: "overview", Sellers: "sellers", Buyers: "buyers", Products: "products", Categories: "categories", Orders: "orders", Reviews: "reviews", Returns: "returns", "Coupons and Offers": "coupons", Shipping: "pincodes", Support: "support", CMS: "cms", "Staff and Permissions": "roles" },
  seller: { Overview: "overview", "My Shop": "shop", Products: "products", Inventory: "inventory", Orders: "orders", Returns: "returns", Support: "support" },
};
const display = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    if (Array.isArray(value)) return `${value.length} items`;
    return Object.values(value).filter(v => typeof v !== "object").map(String).join(" · ") || "Details available";
  }
  return String(value);
};

export function LivePanel({ panel, title }: { panel: Panel; title: string }) {
  const userId = useDashboardUserId();
  const resource = endpoint[panel][title];
  const [data, setData] = useState<RecordValue | RecordValue[] | null>(() => cachedPanel(userId, panel, resource)?.value as RecordValue | RecordValue[] | null ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(() => !cachedPanel(userId, panel, resource));
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{ rows: { row: number; name: string; sku: string; errors: string[] }[]; validCount: number } | null>(null);
  const [alerts, setAlerts] = useState<RecordValue[]>([]);
  const [movements, setMovements] = useState<RecordValue[]>([]);
  const [staff, setStaff] = useState<RecordValue[]>([]);
  const [contentImageUrl, setContentImageUrl] = useState("");
  const reload = useCallback(async (fresh = false) => {
    if (!resource) return;
    const cached = cachedPanel(userId, panel, resource);
    if (cached && !fresh) { setData(cached.value as RecordValue | RecordValue[]); setBusy(false); }
    else if (!fresh) setBusy(true);
    try {
      const result = await fetchPanel(userId, panel, resource, fresh);
      setData(result as RecordValue | RecordValue[]);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load records"); }
    finally { setBusy(false); }
  }, [panel, resource, userId]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (panel === "seller" && title === "Inventory") void Promise.all([fetch("/api/dashboard/seller/inventory/alerts"), fetch("/api/dashboard/seller/inventory/movements")]).then(async ([a, m]) => { if (a.ok) setAlerts(await a.json()); if (m.ok) setMovements(await m.json()); }).catch(() => {}); }, [panel, title, data]);
  useEffect(() => { if (panel === "admin" && title === "Staff and Permissions") void fetch("/api/dashboard/admin/staff").then(async response => { if (response.ok) setStaff(await response.json()); }).catch(() => {}); }, [panel, title, data]);
  useEffect(() => { if (panel === "seller" && title === "Products") void fetch("/api/catalog/categories").then(response => response.json()).then(setCategories).catch(() => setCategories([])); }, [panel, title]);
  async function update(path: string, payload: RecordValue) {
    setError("");
    const response = await fetch(`/api/dashboard/${panel}/${path}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const result = await response.json(); setError(result?.message ?? "Update failed"); return; }
    await reload(true);
  }
  async function saveProductImage(id: string, url: string) {
    const response = await fetch(`/api/dashboard/admin/products/${encodeURIComponent(id)}/image`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageUrl: url }) });
    if (!response.ok) { const result = await response.json(); throw new Error(result?.message ?? result?.error?.message ?? "Could not save product image"); }
    await reload(true);
  }
  async function remove(path: string) {
    setError("");
    const response = await fetch(`/api/dashboard/${panel}/${path}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json(); setError(result?.message ?? "Could not archive"); return; }
    await reload(true);
  }
  async function create(path: string, payload: RecordValue, form: HTMLFormElement) {
    setError("");
    const response = await fetch(`/api/dashboard/${panel}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const result = await response.json(); setError(result?.message ?? result?.error?.message ?? "Could not save"); return; }
    form.reset(); if (path === "cms") setContentImageUrl(""); await reload(true);
  }
  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    const name = String(input.get("name") ?? "");
    const slugValue = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    void create("products", { categoryId: String(input.get("categoryId")), name, slug: slugValue, description: String(input.get("description")), imageUrls: String(input.get("imageUrls") ?? "").split(/\r?\n/).map(url => url.trim()).filter(Boolean), variants: [{ sku: String(input.get("sku")), label: String(input.get("label")), price: String(input.get("price")), stock: Number(input.get("stock")) }] }, form);
  }
  function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    void create("coupons", { code: String(input.get("code")).toUpperCase(), discountAmount: String(input.get("discountAmount")), minSubtotal: String(input.get("minSubtotal")), usageLimit: Number(input.get("usageLimit")), startsAt: new Date(String(input.get("startsAt"))).toISOString(), expiresAt: new Date(String(input.get("expiresAt"))).toISOString(), active: true }, form);
  }
  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    void create("categories", { name: String(input.get("name")), slug: String(input.get("slug")) }, form);
  }
  function submitContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    void create("cms", { kind: String(input.get("kind")), title: String(input.get("title")), slug: String(input.get("slug")), body: String(input.get("body")), imageUrl: contentImageUrl || undefined, metaTitle: String(input.get("metaTitle")) || undefined, metaDescription: String(input.get("metaDescription")) || undefined, published: input.get("published") === "on" }, form);
  }
  function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    void create("roles", { name: String(input.get("name")), permissions: input.getAll("permissions").map(String) }, form);
  }
  function submitStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    void create("staff", { name: String(input.get("name")), email: String(input.get("email")), password: String(input.get("password")), roleId: String(input.get("roleId")) }, form);
  }
  function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const input = new FormData(form);
    void create("support", { subject: String(input.get("subject")), message: String(input.get("message")) }, form);
  }
  async function importCsv(action: "preview" | "commit") {
    setError("");
    const path = action === "preview" ? "products/import/preview" : "products/import";
    const response = await fetch(`/api/dashboard/seller/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv }) });
    const result = await response.json();
    if (!response.ok) { setError(result?.message ?? result?.error?.message ?? "Import failed"); return; }
    if (action === "preview") setPreview(result);
    else { setCsv(""); setPreview(null); await reload(true); }
  }
  const nav = panel === "admin" ? adminNav : sellerNav;
  return <div>
    <div className="dash-page-head"><div><p className="dash-eyebrow">{panel.toUpperCase()} WORKSPACE</p><h1>{title}</h1><p className="muted">Live marketplace data</p></div><button onClick={() => void reload(true)}>Refresh</button></div>
    {error && <p role="alert" className="dash-error">{error}</p>}
    {busy && <div role="status" aria-label={`Loading ${title.toLowerCase()}`} className="dash-skeleton-stack"><div className="dash-skeleton dash-skeleton-head" /><div className="dash-skeleton dash-skeleton-row" /><div className="dash-skeleton dash-skeleton-row" /><div className="dash-skeleton dash-skeleton-row" /></div>}
    {!resource && <div className="dash-live-card"><h2>{title}</h2><p>This workflow needs additional business rules or a configured provider before it can accept transactions.</p><p>Available now: {nav.filter(label => endpoint[panel][label]).map(label => <a key={label} href={`/${panel}/${slug(label)}`}>{label} · </a>)}</p></div>}
    {panel === "seller" && title === "My Shop" && data && !Array.isArray(data) && <form className="dash-live-form" onSubmit={event => { event.preventDefault(); void update("shop", { shopName: String(new FormData(event.currentTarget).get("shopName")) }); }}><h2>Shop details</h2><label>Shop name<input name="shopName" defaultValue={String(data.shopName ?? "")} required minLength={3} maxLength={160} /></label><button>Save shop</button></form>}
    {panel === "seller" && title === "My Shop" && data && !Array.isArray(data) && <><form className="dash-live-form" onSubmit={event => { event.preventDefault(); const input = new FormData(event.currentTarget); void update("shop", { businessName: String(input.get("businessName")), description: String(input.get("description")), addressLine1: String(input.get("addressLine1")), city: String(input.get("city")), state: String(input.get("state")), pincode: String(input.get("pincode")), isOpen: input.get("isOpen") === "on" }); }}><h2>Business profile</h2><label>Business name<input name="businessName" defaultValue={String(data.businessName ?? "")} minLength={3} required /></label><label>Description<textarea name="description" defaultValue={String(data.description ?? "")} /></label><label>Address<input name="addressLine1" defaultValue={String(data.addressLine1 ?? "")} minLength={5} required /></label><label>City<input name="city" defaultValue={String(data.city ?? "")} minLength={2} required /></label><label>State<input name="state" defaultValue={String(data.state ?? "")} minLength={2} required /></label><label>Pincode<input name="pincode" defaultValue={String(data.pincode ?? "")} pattern="[0-9]{6}" required /></label><label><input type="checkbox" name="isOpen" defaultChecked={Boolean(data.isOpen)} /> Store open to buyers</label><button>Save business profile</button></form><form className="dash-live-form" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const input = new FormData(form); const payload: RecordValue = { currentPassword: String(input.get("currentPassword")) }; for (const field of ["gstin", "bankHolderName", "bankIfsc", "bankAccountNumber"]) { const value = String(input.get(field) ?? "").trim(); if (value) payload[field] = value; } void update("shop", payload); }}><h2>GST and bank submission</h2><p>GST: {String(data.gstStatus)} · Bank: {String(data.bankStatus)}{data.bankAccountLast4 ? ` · Account ending ${String(data.bankAccountLast4)}` : ""}. Provider verification is pending.</p><label>GSTIN<input name="gstin" defaultValue={String(data.gstin ?? "")} maxLength={15} /></label><label>Account holder<input name="bankHolderName" defaultValue={String(data.bankHolderName ?? "")} /></label><label>IFSC<input name="bankIfsc" defaultValue={String(data.bankIfsc ?? "")} maxLength={11} /></label><label>Bank account number<input name="bankAccountNumber" type="password" autoComplete="off" /></label><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><button>Submit unverified details</button></form></>}
    {panel === "seller" && title === "Products" && <form className="dash-live-form" onSubmit={submitProduct}><h2>Add product for review</h2><label>Name<input name="name" required minLength={3} /></label><label>Category<select name="categoryId" required><option value="">Select category</option>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Description<textarea name="description" required minLength={10} /></label><label>Product images (up to 5 URLs, one per line)<textarea name="imageUrls" rows={5} placeholder="https://..." /></label><label>SKU<input name="sku" required minLength={2} /></label><label>Variant label<input name="label" required defaultValue="Standard" /></label><label>Price (₹)<input name="price" type="number" min="0.01" step="0.01" required /></label><label>Stock<input name="stock" type="number" min="0" step="1" required /></label><button>Add product</button></form>}
    {panel === "seller" && title === "Products" && <section className="dash-live-form"><h2>Bulk CSV import</h2><p>Required columns: categoryId,name,slug,description,sku,label,price,stock. Up to 100 rows. All products enter admin review.</p><a download="product-import-template.csv" href={`data:text/csv,${encodeURIComponent("categoryId,name,slug,description,sku,label,price,stock\n")}`}>Download template</a><label>CSV file<input type="file" accept=".csv,text/csv" onChange={event => { const file = event.target.files?.[0]; if (file) void file.text().then(text => { setCsv(text); setPreview(null); }); }} /></label><textarea value={csv} onChange={event => { setCsv(event.target.value); setPreview(null); }} rows={5} placeholder="Paste CSV or select a file" /><div className="dash-live-actions"><button type="button" disabled={!csv} onClick={() => void importCsv("preview")}>Preview rows</button>{preview && preview.validCount === preview.rows.length && <button type="button" onClick={() => void importCsv("commit")}>Import {preview.validCount} products</button>}</div>{preview && <div><p>{preview.validCount} of {preview.rows.length} rows valid</p>{preview.rows.map(row => <p key={row.row}>Row {row.row}: {row.name || row.sku || "Unnamed"} — {row.errors.length ? row.errors.join("; ") : "Ready"}</p>)}</div>}</section>}
    {panel === "admin" && title === "Coupons and Offers" && <form className="dash-live-form" onSubmit={submitCoupon}><h2>Create fixed discount coupon</h2><label>Code<input name="code" required minLength={3} maxLength={40} /></label><label>Discount (₹)<input name="discountAmount" type="number" min="0.01" step="0.01" required /></label><label>Minimum subtotal (₹)<input name="minSubtotal" type="number" min="0" step="0.01" defaultValue="0" required /></label><label>Usage limit<input name="usageLimit" type="number" min="1" step="1" required /></label><label>Starts<input name="startsAt" type="datetime-local" required /></label><label>Expires<input name="expiresAt" type="datetime-local" required /></label><button>Create coupon</button></form>}
    {panel === "admin" && title === "Categories" && <form className="dash-live-form" onSubmit={submitCategory}><h2>Create category</h2><label>Name<input name="name" minLength={2} maxLength={120} required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={140} required /></label><button>Create category</button></form>}
    {panel === "admin" && title === "CMS" && <form className="dash-live-form" onSubmit={submitContent}><h2>Create content</h2><label>Type<select name="kind"><option value="PAGE">Page</option><option value="POLICY">Policy</option><option value="BLOG">Blog</option><option value="FAQ">FAQ</option><option value="BANNER">Banner</option></select></label><label>Title<input name="title" minLength={2} maxLength={200} required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} required /></label><label>Body<textarea name="body" rows={8} required /></label><label>SEO title<input name="metaTitle" maxLength={200} /></label><label>SEO description<textarea name="metaDescription" maxLength={500} /></label><CloudinaryImageField key={contentImageUrl ? "selected" : "empty"} initialUrl={contentImageUrl} onUploaded={setContentImageUrl} /><label><input type="checkbox" name="published" /> Publish now</label><button>Save content</button></form>}
    {panel === "admin" && title === "Staff and Permissions" && <><form className="dash-live-form" onSubmit={submitRole}><h2>Create staff role</h2><label>Role name<input name="name" minLength={2} maxLength={100} required /></label><fieldset><legend>Permissions</legend>{["analytics.read", "audit.read", "seller.read", "seller.write", "catalog.read", "catalog.write", "buyer.read", "order.read", "promotion.read", "promotion.write", "shipping.read", "shipping.write", "support.read", "support.write", "content.read", "content.write"].map(value => <label key={value}><input type="checkbox" name="permissions" value={value} /> {value}</label>)}</fieldset><button>Create role</button></form><form className="dash-live-form" onSubmit={submitStaff}><h2>Add staff account</h2><label>Name<input name="name" required minLength={2} /></label><label>Email<input name="email" type="email" required /></label><label>Initial password<input name="password" type="password" minLength={12} required /></label><label>Role<select name="roleId" required><option value="">Select role</option>{Array.isArray(data) && data.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name)}</option>)}</select></label><button>Create staff account</button></form><div className="dash-live-card"><h2>Staff accounts</h2>{staff.map(row => <p key={String(row.id)}>{String(row.name)} · {String(row.email)} · {display(row.staffRole)}</p>)}</div></>}
    {panel === "seller" && title === "Support" && <form className="dash-live-form" onSubmit={submitSupport}><h2>Contact admin support</h2><label>Subject<input name="subject" required minLength={4} maxLength={160} /></label><label>Message<textarea name="message" required minLength={10} maxLength={5000} /></label><button>Send ticket</button></form>}
    {panel === "seller" && title === "Inventory" && <div className="dash-live-grid"><div className="dash-live-card"><h2>Low stock alerts</h2>{alerts.length ? alerts.map(row => <p key={String(row.id)}>{String(row.sku)} · {String(row.stock)} left</p>) : <p>No low stock variants.</p>}</div><div className="dash-live-card"><h2>Recent movements</h2>{movements.length ? movements.map(row => <p key={String(row.id)}>{String(row.reason)} · {Number(row.delta) > 0 ? "+" : ""}{String(row.delta)} · {String(row.before)} → {String(row.after)}</p>) : <p>No movement history yet.</p>}</div></div>}
    {!busy && resource && data && !Array.isArray(data) && <div className="dash-live-grid">{Object.entries(data).filter(([, value]) => !Array.isArray(value)).map(([key, value]) => <div className="dash-live-card" key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{display(value)}</strong></div>)}</div>}
    {!busy && Array.isArray(data) && <div className="dash-live-card"><h2>{data.length} records</h2>{data.length === 0 ? <p>No records yet.</p> : <div className="dash-live-table-wrap"><table className="dash-live-table"><thead><tr>{Object.keys(data[0]).filter(key => !["passwordHash", "userId"].includes(key)).slice(0, 7).map(key => <th key={key}>{key}</th>)}<th>Action</th></tr></thead><tbody>{data.map((row, index) => <tr key={String(row.id ?? index)}>{Object.keys(data[0]).filter(key => !["passwordHash", "userId"].includes(key)).slice(0, 7).map(key => <td key={key}>{display(row[key])}</td>)}<td>{panel === "admin" && title === "Sellers" && ["PENDING", "REJECTED", "SUSPENDED"].includes(String(row.status)) && <button onClick={() => void update(`sellers/${row.id}/status`, { status: "APPROVED" })}>Approve</button>}{panel === "admin" && title === "Products" && row.status === "PENDING" && <button onClick={() => void update(`products/${row.id}/status`, { status: "ACTIVE" })}>Approve</button>}{panel === "admin" && title === "Support" && row.status !== "RESOLVED" && <button onClick={() => void update(`support/${row.id}/status`, { status: row.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED" })}>Advance status</button>}{panel === "seller" && title === "Products" && <button onClick={() => { const current = Array.isArray(row.imageUrls) ? row.imageUrls.join("\n") : ""; const entered = prompt("Up to 5 product image URLs, one per line", current); if (entered !== null) void update(`products/${row.id}`, { imageUrls: entered.split(/\r?\n/).map(url => url.trim()).filter(Boolean).slice(0, 5) }); }}>Edit gallery</button>}{panel === "seller" && title === "Inventory" && <button onClick={() => { const stock = prompt("New stock", String(row.stock)); if (stock !== null && /^\d+$/.test(stock)) void update(`inventory/${row.id}`, { stock: Number(stock) }); }}>Update stock</button>}{panel === "seller" && title === "Orders" && (() => { const next: Record<string,string> = { NEW: "ACCEPTED", ACCEPTED: "PACKED", PACKED: "SHIPPED", SHIPPED: "DELIVERED" }; const status = next[String(row.status)]; return status && <button onClick={() => void update(`orders/${row.id}/status`, { status })}>Mark {status.toLowerCase()}</button>; })()}</td></tr>)}</tbody></table></div>}</div>}
    {!busy && Array.isArray(data) && panel === "seller" && title === "Products" && data.map(row => <div className="dash-live-card" key={String(row.id)}><strong>{String(row.name)}</strong><p>Status: {String(row.status)}{row.reviewReason ? ` · Reason: ${String(row.reviewReason)}` : ""}</p><div className="dash-live-actions"><button onClick={() => { const name = prompt("Product name", String(row.name)); if (name && name.trim() !== row.name) void update(`products/${row.id}`, { name: name.trim() }); }}>Edit name</button><button onClick={() => { if (confirm("Archive this product?")) void remove(`products/${row.id}`); }}>Archive</button>{Array.isArray(row.variants) && row.variants.map((variant: RecordValue) => <button key={String(variant.id)} onClick={() => { const price = prompt(`New price for ${String(variant.label)}`, String(variant.price)); if (price && /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(price)) void update(`products/${row.id}/variants/${variant.id}`, { price }); }}>Price: {String(variant.label)}</button>)}</div></div>)}
    {!busy && Array.isArray(data) && panel === "admin" && ["Sellers", "Products"].includes(title) && data.map(row => <div className="dash-live-card" key={String(row.id)}><strong>{String(row.shopName ?? row.name)}</strong><span> {String(row.status)}{row.reviewReason ? ` · ${String(row.reviewReason)}` : ""}</span>{title === "Products" && <ProductImageEditor initialUrl={String(row.imageUrl ?? "")} onUploaded={url => saveProductImage(String(row.id), url)} />}<div className="dash-live-actions">{title === "Sellers" ? <><button onClick={() => { const reason = prompt("Reason for rejection"); if (reason) void update(`sellers/${row.id}/status`, { status: "REJECTED", reason }); }}>Reject</button><button onClick={() => { const reason = prompt("Reason for suspension"); if (reason) void update(`sellers/${row.id}/status`, { status: "SUSPENDED", reason }); }}>Suspend</button></> : <button onClick={() => { const reason = prompt("Reason for rejection"); if (reason) void update(`products/${row.id}/status`, { status: "REJECTED", reason }); }}>Reject</button>}</div></div>)}
    {!busy && Array.isArray(data) && panel === "admin" && title === "Categories" && data.map(row => <div className="dash-live-card" key={String(row.id)}><strong>{String(row.name)}</strong><span>/{String(row.slug)}</span><div className="dash-live-actions"><button onClick={() => { const name = prompt("Category name", String(row.name)); if (name) void update(`categories/${row.id}`, { name }); }}>Rename</button><button onClick={() => { if (confirm("Delete this unused category?")) void remove(`categories/${row.id}`); }}>Delete</button></div></div>)}
    {!busy && Array.isArray(data) && panel === "admin" && title === "Reviews" && data.map(row => <div className="dash-live-card" key={String(row.id)}><strong>{String(row.title)} · {String(row.rating)}/5</strong><p>{String(row.body)}</p><span>Status: {String(row.status)}</span><div className="dash-live-actions"><button onClick={() => void update(`reviews/${row.id}/status`, { status: "APPROVED" })}>Approve</button><button onClick={() => { const reason = prompt("Reason for rejection"); if (reason) void update(`reviews/${row.id}/status`, { status: "REJECTED", reason }); }}>Reject</button></div></div>)}
    {!busy && Array.isArray(data) && title === "Returns" && data.map(row => <div className="dash-live-card" key={String(row.id)}><strong>{display(row.orderItem)}</strong><p>{String(row.reason)}</p><span>Status: {String(row.status)} · Refund execution is pending</span><div className="dash-live-actions">{panel === "seller" && row.status === "REQUESTED" && <><button onClick={() => { const reason = prompt("Reason for approval"); if (reason) void update(`returns/${row.id}/decision`, { status: "SELLER_APPROVED", reason }); }}>Approve request</button><button onClick={() => { const reason = prompt("Reason for rejection"); if (reason) void update(`returns/${row.id}/decision`, { status: "SELLER_REJECTED", reason }); }}>Reject request</button></>}{panel === "admin" && ["SELLER_APPROVED", "SELLER_REJECTED"].includes(String(row.status)) && <button onClick={() => { const reason = prompt("Admin review note"); if (reason) void update(`returns/${row.id}/status`, { status: "ADMIN_REVIEW", reason }); }}>Review</button>}{panel === "admin" && row.status === "ADMIN_REVIEW" && <button onClick={() => { const reason = prompt("Finance review note"); if (reason) void update(`returns/${row.id}/status`, { status: "REFUND_PENDING", reason }); }}>Send to finance queue</button>}</div></div>)}
    {!busy && Array.isArray(data) && panel === "admin" && title === "CMS" && data.map(row => <div className="dash-live-card" key={String(row.id)}><strong>{String(row.title)}</strong><span>{String(row.kind)} /{String(row.slug)} · {row.published ? "Published" : "Draft"}</span><div className="dash-live-actions"><button onClick={() => void update(`cms/${row.id}`, { published: !row.published })}>{row.published ? "Unpublish" : "Publish"}</button><button onClick={() => { const body = prompt("Edit body", String(row.body)); if (body) void update(`cms/${row.id}`, { body }); }}>Edit body</button><button onClick={() => { if (confirm("Delete this content?")) void remove(`cms/${row.id}`); }}>Delete</button>{Boolean(row.published) && <a href={`/shop/content/${String(row.kind).toLowerCase()}/${String(row.slug)}`}>View page</a>}</div></div>)}
  </div>;
}


