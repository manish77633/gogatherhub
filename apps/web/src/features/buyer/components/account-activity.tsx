"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAccountUserId } from "./account-context";
import { cachedAccountData, loadAccountData } from "./account-cache";
import { accountRequest } from "./account-data";
type Notice = { id: string; title: string; detail: string; date: string; href: string; read: boolean };
type Reply = { id: string; authorRole: string; message: string; createdAt: string };
export function AccountNotifications() {
  const userId=useAccountUserId(); const locked=useRef(false);
  const [rows,setRows]=useState<Notice[]>(()=>cachedAccountData<Notice[]>(userId,"notifications")??[]), [error,setError]=useState(""), [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try {setRows(await loadAccountData<Notice[]>(userId,"notifications"));setError("");} catch(e){setError(e instanceof Error?e.message:"Could not load updates");}},[userId]);
  useEffect(()=>{const initial=setTimeout(()=>void load(),0);const timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);return()=>{clearTimeout(initial);clearInterval(timer);};},[load]);
  async function read(ids:string[]){if(locked.current)return;locked.current=true;const before=rows;setRows(rows.map(row=>ids.includes(row.id)?{...row,read:true}:row));setBusy(true);try{await accountRequest("notifications/read",{method:"POST",body:JSON.stringify({ids})});await load();}catch(e){setRows(before);setError(e instanceof Error?e.message:"Could not save");}finally{locked.current=false;setBusy(false);}}
  return <section className="rounded-2xl border border-[#eee3de] bg-white p-6"><h1 className="font-serif text-3xl">Notifications</h1><button disabled={busy||!rows.some(r=>!r.read)} onClick={()=>void read(rows.filter(r=>!r.read).map(r=>r.id))} className="my-4 rounded-lg border px-4 py-2 disabled:opacity-50">Mark all as read</button>{error&&<p role="alert">{error}</p>}{!error&&!rows.length&&<p>No updates yet.</p>}{rows.map(row=><article key={row.id} className={`border-t py-4 ${row.read?"opacity-70":"font-semibold"}`}><Link href={row.href}>{row.title}</Link><p>{row.detail}</p><small>{new Date(row.date).toLocaleString()}</small>{!row.read&&<button disabled={busy} onClick={()=>void read([row.id])} className="ml-4 underline">Mark read</button>}</article>)}</section>;
}
export function SupportConversation({ticketId}:{ticketId:string}){
 const userId=useAccountUserId();
 const [rows,setRows]=useState<Reply[]>([]),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(){try{setRows(await loadAccountData<Reply[]>(userId,`support/${ticketId}/replies`));setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load conversation");}}
 // Conversations load only when expanded, avoiding one request per collapsed ticket.

 return <details className="mt-3" onToggle={e=>{if(e.currentTarget.open)void load();}}><summary className="cursor-pointer underline">Conversation and reply</summary>{rows.map(row=><div className="my-3 rounded-lg bg-[#faf6f3] p-3" key={row.id}><strong>{row.authorRole=== "BUYER"?"You":"Support team"}</strong><p className="whitespace-pre-wrap">{row.message}</p><small>{new Date(row.createdAt).toLocaleString()}</small></div>)}{error&&<p role="alert">{error}</p>}<form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await accountRequest(`support/${ticketId}/replies`,{method:"POST",body:JSON.stringify({message})});setMessage("");await load();}catch(e){setError(e instanceof Error?e.message:"Reply failed");}finally{setBusy(false);}}}><label className="block">Your reply<textarea value={message} onChange={e=>setMessage(e.target.value)} required maxLength={5000} className="mt-2 block w-full rounded-lg border p-3"/></label><button disabled={busy} className="mt-3 rounded-lg border px-4 py-2">{busy?"Sending…":"Send reply"}</button></form></details>;
}
