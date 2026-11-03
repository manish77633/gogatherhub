"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AutoApplyFilters({ children }: { children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <form ref={form} action="/shop/products" className="ggh-shop-filter-form" onChange={() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => form.current?.requestSubmit(), 350);
  }}>{children}</form>;
}
