"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Button, IconButton } from "./ui";
import {
  LayoutDashboard,
  Component,
  FormInput,
  Table2,
  MessageCircle,
  Menu,
} from "lucide-react";

const links = [
  { label: "Overview", icon: LayoutDashboard, href: "#overview" },
  { label: "Components", icon: Component, href: "#components" },
  { label: "Forms", icon: FormInput, href: "#forms" },
  { label: "Data", icon: Table2, href: "#data" },
  { label: "Feedback", icon: MessageCircle, href: "#feedback" },
];
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="shell">
      <button
        className={`mobile-backdrop ${open ? "open" : ""}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="brand">
          <span className="brand-mark">M</span>
          <span className="brand-name">Marketform</span>
        </div>
        <nav className="nav-list">
          {links.map((link) => (
            <a
              className="nav-link"
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              <span aria-hidden="true">
                {<link.icon size={18} strokeWidth={1.8} />}
              </span>
              <span className="nav-label">{link.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="row">
            <IconButton
              label="Open navigation"
              variant="ghost"
              className="mobile-toggle"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} strokeWidth={1.8} />
            </IconButton>
            <span className="muted small">Design system / UI foundation</span>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              document.getElementById("components")?.scrollIntoView()
            }
          >
            Explore components
          </Button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
