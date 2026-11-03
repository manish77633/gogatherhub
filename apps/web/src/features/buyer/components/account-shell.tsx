"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard, Package, Heart, MapPin, RotateCcw, UserRound, TicketPercent, Wallet, Bell, Headset, LogOut } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { AccountUserContext } from "./account-context";
import { cachedAccountData, clearAccountData, loadAccountData } from "./account-cache";

const links = [
  { href: "/shop/account", title: "Overview", Icon: LayoutDashboard },
  { href: "/shop/account/orders", title: "My Orders", Icon: Package },
  { href: "/shop/account/wishlist", title: "My Wishlist", Icon: Heart },
  { href: "/shop/account/addresses", title: "Saved Addresses", Icon: MapPin },
  { href: "/shop/account/returns", title: "Returns & Refunds", Icon: RotateCcw },
  { href: "/shop/account/profile", title: "Profile Details", Icon: UserRound },
  { href: "/shop/account/coupons", title: "Coupons & Offers", Icon: TicketPercent },
  { href: "/shop/account/payments", title: "Wallet & Payments", Icon: Wallet },
  { href: "/shop/account/notifications", title: "Notifications", Icon: Bell },
  { href: "/shop/account/support", title: "Help & Support", Icon: Headset },
];

export function AccountShell({ children, userId }: { children: ReactNode; userId: string }) {
  const pathname = usePathname();
  const scrollPositions = useRef(new Map<string, number>());
  const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl?: string | null } | null>(() => cachedAccountData(userId, "profile") ?? null);
  useEffect(() => { const reload = () => { void loadAccountData<{ name: string; email: string; avatarUrl?: string | null }>(userId, "profile").then(setProfile).catch(() => {}); }; reload(); window.addEventListener("account-profile-updated", reload); const clear = () => clearAccountData(userId); window.addEventListener("ggh-session-ended", clear); return () => { window.removeEventListener("account-profile-updated", reload); window.removeEventListener("ggh-session-ended", clear); }; }, [userId]);
  useEffect(() => { let lastChecked = Date.now(); const verify = async () => { if (document.visibilityState !== "visible" || Date.now() - lastChecked < 60_000) return; lastChecked = Date.now(); try { const response = await fetch("/api/buyer/profile", { cache: "no-store" }); if (response.status === 401 || response.status === 403) { clearAccountData(userId); window.location.assign(`/shop/login?next=${encodeURIComponent(window.location.pathname)}`); } } catch { /* Keep the current view during a temporary network failure. */ } }; window.addEventListener("focus", verify); document.addEventListener("visibilitychange", verify); return () => { window.removeEventListener("focus", verify); document.removeEventListener("visibilitychange", verify); }; }, [userId]);
  useEffect(() => { const frame = requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.current.get(pathname) ?? 0, behavior: "instant" })); return () => { cancelAnimationFrame(frame); scrollPositions.current.set(pathname, window.scrollY); }; }, [pathname]);
  return <AccountUserContext.Provider value={userId}><div className="mx-auto grid max-w-[1440px] gap-5 py-7 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start"><aside className="rounded-2xl border border-[#eee3de] bg-white p-4 shadow-[0_8px_26px_#42312c0c] lg:sticky lg:top-44"><div className="flex flex-col items-center border-b border-[#eee3de] px-2 pb-5 text-center"><span className="account-sidebar-avatar mb-3 font-serif text-3xl text-[#a93629]" aria-hidden="true">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="Your profile" className="account-sidebar-photo" /> : profile?.name?.charAt(0).toUpperCase() ?? "G"}</span><strong className="max-w-full truncate text-sm text-[#302d2c]">{profile?.name ?? "Your account"}</strong><small className="max-w-full truncate text-xs text-[#786f6d]">{profile?.email ?? "Manage your account"}</small><Link className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#e5d4cc] bg-[#fffdfb] px-4 py-2 text-xs font-semibold text-[#754b41] transition-colors hover:border-[#cda99d] hover:bg-[#fff4ef]" href="/shop/account/profile">Edit profile →</Link></div><nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label="Account navigation">{links.map(({ href, title, Icon }) => <Link scroll={false} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-[#514845] hover:bg-[#fff3ef] hover:text-[#ad4033] aria-[current=page]:bg-[#fff0eb] aria-[current=page]:text-[#ad4033]" key={href} href={href} aria-current={pathname === href || href !== "/shop/account" && pathname.startsWith(`${href}/`) ? "page" : undefined}><Icon className="shrink-0" size={17} strokeWidth={1.8} aria-hidden="true" />{title}</Link>)}</nav><div className="mt-3 flex items-center gap-3 border-t border-[#eee3de] px-3 pt-4 text-[#ad4033]"><LogOut size={17} aria-hidden="true" /><LogoutButton className="min-h-10 rounded-lg px-2 text-xs font-semibold hover:bg-[#fff4ef]" /></div></aside><div className="min-w-0">{children}</div></div></AccountUserContext.Provider>;
}
