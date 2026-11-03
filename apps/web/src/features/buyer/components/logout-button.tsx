"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button className={className} type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      window.dispatchEvent(new Event("ggh-session-ended"));
      router.replace("/shop/login");
      router.refresh();
    } catch { setBusy(false); }
  }}>{busy ? "Signing out…" : "Sign out"}</button>;
}
