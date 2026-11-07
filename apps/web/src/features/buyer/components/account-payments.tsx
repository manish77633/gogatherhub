"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { accountRequest, money, date, type Order } from "./account-data";
import { loadRazorpay, type RazorpayResult } from "@/lib/razorpay-client";
import { useAccountUserId } from "./account-context";
import { cachedAccountData, loadAccountData, invalidateAccountPath } from "./account-cache";
type PaymentOrder = Order & { razorpayPaymentId?: string | null; paymentExpiresAt?: string | null };
type PaymentSession = { paid?: boolean; keyId?: string; razorpayOrderId?: string; amount?: number; orderNumber: string };
export function AccountPayments() {
 const userId=useAccountUserId();
 const [orders,setOrders]=useState<PaymentOrder[]>(()=>cachedAccountData<PaymentOrder[]>(userId,"orders")??[]),[error,setError]=useState(""),[busy,setBusy]=useState<string|null>(null),[loading,setLoading]=useState(()=>!cachedAccountData(userId,"orders"));
 const active=useRef(false);
 const load=useCallback(async()=>{try{setOrders(await loadAccountData<PaymentOrder[]>(userId,"orders"));setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to load payments");}finally{setLoading(false);}},[userId]);
 useEffect(()=>{const initial=setTimeout(()=>void load(),0);const verify=()=>{if(document.visibilityState==="visible"&&!active.current)void load();};const timer=setInterval(verify,15000);window.addEventListener("focus",verify);return()=>{clearTimeout(initial);clearInterval(timer);window.removeEventListener("focus",verify);};},[load]);
 async function retry(order: PaymentOrder){
  if(active.current)return;active.current=true;setBusy(order.id);setError("");
  const done=()=>{active.current=false;setBusy(null);};
  try{
   const session=await accountRequest<PaymentSession>(`orders/${order.id}/payment/retry`,{method:"POST",body:"{}"});
   if(session.paid){invalidateAccountPath("orders");await load();done();return;}
   if(!session.keyId||!session.razorpayOrderId||!session.amount)throw new Error("Online payments are not configured yet.");
   const Razorpay=await loadRazorpay();
   const checkout=new Razorpay({key:session.keyId,order_id:session.razorpayOrderId,amount:session.amount,currency:"INR",name:"Go Gather Hub",description:`Order ${session.orderNumber}`,modal:{ondismiss:()=>{setError("Payment window closed. No success is recorded until payment is verified.");done();}},handler:async(payment:RazorpayResult)=>{
    try{await accountRequest(`orders/${order.id}/payment/verify`,{method:"POST",body:JSON.stringify(payment)});invalidateAccountPath("orders");await load();}catch(e){setError(e instanceof Error?e.message:"Payment verification failed. Check your order before retrying.");}finally{done();}
   }});
   checkout.on("payment.failed",event=>{setError(event.error?.description??"Payment failed. You can retry while the payment window remains open.");done();});checkout.open();
  }catch(e){setError(e instanceof Error?e.message:"Unable to start payment");done();}
 }
 return <section className="rounded-2xl border border-[#eee3de] bg-white p-6"><h1 className="font-serif text-3xl">Payments</h1><p>Payment records for your orders.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}{loading?<p role="status">Loading payments…</p>:!orders.length?<p>No payment history yet.</p>:orders.map(order=><article key={order.id} className="border-t py-5"><div className="flex flex-wrap justify-between gap-3"><Link className="font-semibold underline" href={`/shop/account/orders/${order.id}`}>{order.orderNumber}</Link><strong>{money(order.total)}</strong></div><a className="my-2 inline-block underline" href={`/api/buyer/receipts/${order.id}`} download>Download order record</a><p>{date(order.createdAt)} · {order.paymentMethod} · {order.paymentStatus.replaceAll("_"," ")}</p>{order.razorpayPaymentId&&<p className="break-all text-sm">Transaction: {order.razorpayPaymentId}</p>}{order.paymentMethod==="ONLINE"&&order.status==="PAYMENT_PENDING"&&order.paymentStatus==="PENDING"&&<button className="rounded-lg border px-4 py-2 disabled:opacity-50" disabled={busy!==null} onClick={()=>void retry(order)}>{busy===order.id?"Processing…":"Retry payment"}</button>}</article>)}</section>;
}
