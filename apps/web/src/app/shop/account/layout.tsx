import type { ReactNode } from "react";
import { requireRole } from "@/lib/server-auth";
import { AccountShell } from "@/features/buyer/components/account-shell";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("BUYER", "/shop/account");
  return <main className="ggh-page account-hub"><div className="ggh-page-container"><AccountShell userId={user.id}>{children}</AccountShell></div></main>;
}
