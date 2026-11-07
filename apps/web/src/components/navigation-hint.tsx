"use client";
import { useLinkStatus } from "next/link";
export function NavigationHint() {
  const { pending } = useLinkStatus();
  return <span role="status" aria-label={pending ? "Opening page" : undefined} style={{display:"inline-block",width:12,height:12,marginLeft:"auto",flexShrink:0,visibility:pending?"visible":"hidden"}}><span className="spinner" style={{display:"block",width:12,height:12}} /></span>;
}
