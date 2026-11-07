"use client";

import Form from "next/form";
import { useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export function AutoApplyFilters({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <Form ref={form} action="/shop/products" scroll={false} className="ggh-shop-filter-form" onChange={() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => form.current?.requestSubmit(), 350);
  }}>{searchParams.get("collection") && <input type="hidden" name="collection" value={searchParams.get("collection")!} />}{searchParams.get("q") && <input type="hidden" name="q" value={searchParams.get("q")!} />}{searchParams.get("sort") && <input type="hidden" name="sort" value={searchParams.get("sort")!} />}{children}</Form>;
}
