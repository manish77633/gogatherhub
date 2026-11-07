"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaLibrary } from "./media-library";
import { homepageDefaults } from "../data/homepage-defaults";

type Section = { id?: string; key: string; draft: Record<string, unknown>; published: Record<string, unknown>; enabled: boolean; position: number; publishedAt?: string | null };
const homeKeys = ["hero", "categories", "bestsellers", "celebration-kits", "gifts-under-budget", "testimonials", "faq", "newsletter", "header", "announcement", "navigation", "footer", "social-links"];
const retiredHomeKeys = new Set(["promotions", "curated-collections", "personalized-gifts", "gifting-guide"]);
const pages = [
  ["home", "Homepage"], ["products", "Products"], ["product-detail", "Product details"],
  ["cart", "Cart"], ["checkout", "Checkout"], ["account", "Buyer account"],
  ["wishlist", "Wishlist"], ["content", "Content pages"], ["combos", "Celebration kits"],
  ["seller-register", "Seller registration"], ["seller-status", "Seller status"],
  ["login", "Login"], ["register", "Register"],
] as const;
const label = (value: string) => value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initialDraft = (section: Section | undefined, page: string, key: string) => section && Object.keys(section.draft ?? {}).length ? section.draft : section && Object.keys(section.published ?? {}).length ? section.published : page === "home" ? homepageDefaults[key] ?? { heading: label(key) } : { heading: label(key) };

export function HomepageEditor({ initialPage = "" }: { initialPage?: string }) {
  const [page, setPage] = useState(initialPage || "");
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [enabled, setEnabled] = useState(true);
  const [position, setPosition] = useState(0);
  const [newName, setNewName] = useState("");
  const [picker, setPicker] = useState<number | "cover" | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    if (!page) return;
    try {
      const response = await fetch(`/api/dashboard/admin/site-sections/${page}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Page sections could not be loaded");
      setSections(await response.json());
    } catch (cause) { setError((cause as Error).message); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!page || !active) return;
    const section = sections.find(item => item.key === active);
    setDraft(initialDraft(section, page, active));
    setEnabled(section?.enabled ?? true);
    setPosition(section?.position ?? Math.max(0, homeKeys.indexOf(active)));
  }, [page, active, sections]);
  const available = page === "home" ? [...new Set([...homeKeys, ...sections.map(item => item.key)])].filter(key => !retiredHomeKeys.has(key)) : sections.map(item => item.key);
  const saved = sections.find(item => item.key === active);
  const field = (name: string, value: unknown) => setDraft(current => ({ ...current, [name]: value }));
  const items = Array.isArray(draft.items) ? draft.items as Record<string, unknown>[] : [];
  const setItem = (index: number, name: string, value: string) => field("items", items.map((item, at) => at === index ? { ...item, [name]: value } : item));
  function selectPage(key: string) { setPage(key); setSections([]); setActive(""); setError(""); setNotice(""); setPreview(false); }
  function addSection() {
    const key = slugify(newName);
    if (!/^[a-z][a-z0-9-]{1,79}$/.test(key)) { setError("Enter a section name starting with a letter."); return; }
    if (available.includes(key)) { setError("This section already exists on the page."); return; }
    setNewName(""); setError(""); setActive(key); setDraft({ heading: newName.trim() });
  }
  async function save(publish = false) {
    if (!active) return;
    if (!Object.values(draft).some(value => typeof value === "string" ? value.trim() : Array.isArray(value) && value.length)) { setError("Add content before saving."); return; }
    if (publish && !window.confirm(`Publish ${label(active)} on ${pages.find(item => item[0] === page)?.[1] ?? page}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/dashboard/admin/site-sections/${page}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: active, draft, enabled, position }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Could not save section");
      if (publish) {
        const published = await fetch(`/api/dashboard/admin/site-sections/${result.id}/publish`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true }) });
        if (!published.ok) throw new Error("Draft saved, but publishing failed");
      }
      setNotice(publish ? "Section published on the website." : "Draft saved. Publish when ready.");
      await load();
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  function moveSection(direction: -1 | 1) {
    setPosition(current => Math.max(0, Math.min(100, current + direction)));
    setNotice("Display order changed. Save and publish to update the website.");
  }
  return <div className="cms-workspace">
    {!page ? <><div className="cms-workspace-heading"><span>CONTENT MANAGER</span><h2>Pages</h2><p>Choose a storefront page to edit its sections. Existing homepage content is ready to edit.</p></div><div className="cms-page-grid">{pages.map(([key, name]) => <button type="button" className="cms-page-card" key={key} onClick={() => selectPage(key)}><strong>{name}</strong><small>{key === "home" ? `${homeKeys.length} starting sections` : "Add and manage sections"}</small><span aria-hidden="true">→</span></button>)}</div></> : <><div className="cms-workspace-heading cms-workspace-heading-row"><div><span>CONTENT MANAGER / PAGES</span><h2>{pages.find(item => item[0] === page)?.[1] ?? label(page)}</h2><p>Edit content, images and order. Save a draft, then publish it.</p></div><button type="button" className="cms-quiet-button" onClick={() => selectPage("")}>All pages</button></div><div className="cms-page-layout"><aside className="cms-section-list"><h3>Sections <small>{available.length}</small></h3>{available.length === 0 && <p>No custom sections yet. Add the first one below.</p>}{available.map((key, index) => <button type="button" className={active === key ? "selected" : ""} key={key} onClick={() => { setActive(key); setError(""); setNotice(""); }}><span className="cms-section-number">{index + 1}</span><span>{label(key)}<small>{sections.find(item => item.key === key)?.publishedAt ? "Live" : "Ready to edit"}</small></span><span aria-hidden="true">›</span></button>)}<div className="cms-add-section"><label htmlFor="cms-new-section">Add section</label><input id="cms-new-section" value={newName} onChange={event => setNewName(event.target.value)} placeholder="e.g. Customer stories" onKeyDown={event => { if (event.key === "Enter") addSection(); }}/><button type="button" onClick={addSection}>+ Add section</button></div></aside><div className="cms-section-content">{!active ? <div className="cms-empty-section"><h3>Choose a section</h3><p>Select a section from the left, or add one to this page.</p></div> : <><div className="cms-edit-heading"><div><small>SECTION {position + 1}</small><h3>{label(active)}</h3><p>{saved?.publishedAt ? "Live on website" : "Unpublished section"}</p></div><div className="cms-order-buttons"><button type="button" onClick={() => moveSection(-1)} aria-label="Move section earlier">↑</button><button type="button" onClick={() => moveSection(1)} aria-label="Move section later">↓</button></div></div>{error && <p role="alert" className="dash-error">{error}</p>}{notice && <p role="status" className="seller-success">{notice}</p>}<div className="cms-form-grid"><label>Heading<input value={String(draft.heading ?? "")} onChange={event => field("heading", event.target.value)} maxLength={200}/></label><label>Subheading<input value={String(draft.subheading ?? "")} onChange={event => field("subheading", event.target.value)} maxLength={200}/></label><label className="cms-wide">Description<textarea value={String(draft.description ?? "")} onChange={event => field("description", event.target.value)} maxLength={2000}/></label><label>Button label<input value={String(draft.buttonLabel ?? "")} onChange={event => field("buttonLabel", event.target.value)} maxLength={100}/></label><label>Button URL<input value={String(draft.buttonUrl ?? "")} onChange={event => field("buttonUrl", event.target.value)} placeholder="/shop/products" maxLength={500}/></label></div><div className="cms-media-row"><div><strong>Section image</strong><p>Choose a reusable image from Media Library.</p></div>{typeof draft.imageUrl === "string" && draft.imageUrl && <img src={draft.imageUrl} alt="Selected section"/>}<button type="button" onClick={() => setPicker("cover")}>Choose image</button></div><div className="cms-items"><div className="cms-items-title"><div><strong>Cards and linked items</strong><p>Add cards for products, categories, offers or other content.</p></div><button type="button" onClick={() => field("items", [...items, { heading: "", description: "", imageUrl: "", buttonLabel: "", buttonUrl: "" }])}>+ Add item</button></div>{items.map((item, index) => <div className="cms-item-card" key={index}><div className="cms-item-head"><strong>Item {index + 1}</strong><div><button type="button" onClick={() => field("items", items.map((row, at) => at === index - 1 ? items[index] : at === index ? items[index - 1] : row))} disabled={index === 0} aria-label={`Move item ${index + 1} earlier`}>↑</button><button type="button" onClick={() => field("items", items.map((row, at) => at === index + 1 ? items[index] : at === index ? items[index + 1] : row))} disabled={index === items.length - 1} aria-label={`Move item ${index + 1} later`}>↓</button><button type="button" onClick={() => field("items", items.filter((_, at) => at !== index))}>Remove</button></div></div><div className="cms-form-grid"><label>Title<input value={String(item.heading ?? "")} onChange={event => setItem(index, "heading", event.target.value)}/></label><label>Button label<input value={String(item.buttonLabel ?? "")} onChange={event => setItem(index, "buttonLabel", event.target.value)}/></label><label className="cms-wide">Description<textarea value={String(item.description ?? "")} onChange={event => setItem(index, "description", event.target.value)}/></label><label>Button URL<input value={String(item.buttonUrl ?? "")} onChange={event => setItem(index, "buttonUrl", event.target.value)}/></label><div className="cms-item-image">{typeof item.imageUrl === "string" && item.imageUrl && <img src={item.imageUrl} alt="Selected item"/>}<button type="button" onClick={() => setPicker(index)}>Choose image</button></div></div></div>)}</div><div className="cms-section-options"><label>Display order<input type="number" min={0} max={100} value={position} onChange={event => setPosition(Number(event.target.value))}/></label><label className="cms-visible"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/> Show this section on the website</label></div><div className="cms-section-actions"><button type="button" disabled={busy} onClick={() => void save()}>Save draft</button><button type="button" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview"}</button><button type="button" className="cms-publish" disabled={busy} onClick={() => void save(true)}>Publish section</button></div>{preview && <div className="cms-section-preview"><h3>{String(draft.heading ?? label(active))}</h3><p>{String(draft.subheading ?? "")}</p><p>{String(draft.description ?? "")}</p>{typeof draft.imageUrl === "string" && draft.imageUrl && <img src={draft.imageUrl} alt="Section preview"/>}</div>}{picker !== null && <div className="cms-media-picker"><div className="cms-media-picker-head"><h3>Select image</h3><button type="button" onClick={() => setPicker(null)}>Close</button></div><MediaLibrary onSelect={assets => { if (assets[0]) { if (picker === "cover") field("imageUrl", assets[0].url); else setItem(picker, "imageUrl", assets[0].url); } setPicker(null); }}/></div>}</>}</div></div></>}
  </div>;
}
