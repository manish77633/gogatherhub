"use client";
import { useState, type ChangeEvent } from "react";

export function ProfilePhoto({ url, name, onSaved }: { url?: string | null; name?: string; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/buyer/avatar", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not upload photo.");
      await onSaved(); window.dispatchEvent(new Event("account-profile-updated"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload photo."); }
    finally { setBusy(false); }
  }
  return <div className="account-photo-editor"><span className="account-profile-photo">{url ? <img src={url} alt="Your profile" /> : (name?.[0]?.toUpperCase() ?? "G")}</span><div><label className="account-secondary-button">{busy ? "Uploading…" : "Change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload} className="sr-only" /></label><p>JPEG, PNG or WebP · up to 5 MB</p>{error && <p role="alert">{error}</p>}</div></div>;
}
