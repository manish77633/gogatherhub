"use client";

import { useEffect, useState } from "react";
let configuration: Promise<boolean> | null = null;
function loadConfiguration() { configuration ??= fetch("/api/admin/cloudinary", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(result => Boolean(result?.configured)).catch(() => false); return configuration; }

export function CloudinaryImageField({ onUploaded, initialUrl }: { onUploaded: (url: string) => Promise<void> | void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void loadConfiguration().then(setConfigured); }, []);
  async function upload(file: File) {
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/admin/cloudinary", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      await onUploaded(result.url); setUrl(result.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  return <div className="dash-image-field"><label>Product image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={configured !== true || busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>{url && <img src={url} alt="Uploaded product preview" />}{configured === false && <p>Cloudinary is not configured yet. Add its server credentials to enable uploads.</p>}{busy && <p role="status">Uploading image…</p>}{error && <p role="alert" className="dash-error">{error}</p>}</div>;
}

export function ProductImageEditor({ initialUrl, onUploaded }: { initialUrl: string; onUploaded: (url: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return <div className="dash-product-image-editor">{initialUrl && <img src={initialUrl} alt="Current product" />}<button type="button" onClick={() => setOpen(value => !value)}>{open ? "Close image editor" : "Add or change image"}</button>{open && <CloudinaryImageField initialUrl={initialUrl} onUploaded={async url => { await onUploaded(url); setOpen(false); }} />}</div>;
}
