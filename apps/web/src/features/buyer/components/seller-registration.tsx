"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function SellerRegistration() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (values.get("password") !== values.get("confirmPassword")) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/register-seller", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: values.get("name"), shopName: values.get("shopName"), email: values.get("email"), password: values.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : result.error?.message ?? "Could not create seller account.");
      setSubmitted(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create seller account."); }
    finally { setBusy(false); }
  }
  return <section className="ggh-seller-registration"><p className="ggh-page-eyebrow">Sell with Go Gather Hub</p><h1>Start your seller journey</h1>{submitted ? <><p>Your seller account has been submitted for review. An admin must approve it before you can access the seller dashboard and list products.</p><Link href="/shop/seller-status">View application status →</Link></> : <><p>Create your seller account. Your shop will be reviewed before it goes live.</p><form className="ggh-auth-form" onSubmit={submit}><label>Your name<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label><label>Shop name<input name="shopName" required minLength={2} maxLength={160} /></label><label>Email address<input name="email" type="email" required maxLength={320} autoComplete="email" /></label><label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label><label>Confirm password<input name="confirmPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label>{error && <p role="alert" className="ggh-auth-pending">{error}</p>}<button className="ggh-primary-action" disabled={busy}>{busy ? "Creating account…" : "Create seller account"}</button></form><p>Already have a seller account? <Link href="/shop/login?next=%2Fseller">Sign in</Link></p></>}</section>;
}
