import { BadGatewayException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new ServiceUnavailableException("Online payment is unavailable");
  return { keyId, keySecret, authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` };
}

export function assertRazorpayConfigured() {
  credentials();
}

async function request(path: string, init: RequestInit = {}) {
  const { authorization } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, { ...init, headers: { authorization, "content-type": "application/json", ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!response?.ok) throw new BadGatewayException("Payment provider is unavailable");
  return response.json();
}

export async function createRazorpayOrder(amount: number, receipt: string): Promise<{ id: string; keyId: string; amount: number }> {
  const order = await request("orders", { method: "POST", body: JSON.stringify({ amount, currency: "INR", receipt, payment_capture: 1 }) }) as { id?: string; amount?: number; currency?: string };
  if (!order.id || order.amount !== amount || order.currency !== "INR") throw new BadGatewayException("Invalid payment order response");
  return { id: order.id, keyId: credentials().keyId, amount };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const digest = createHmac("sha256", credentials().keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const expected = Buffer.from(digest, "hex"), actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException("Invalid payment signature");
}

export async function fetchRazorpayPayment(paymentId: string): Promise<{ id: string; order_id: string; amount: number; currency: string; status: string }> {
  return request(`payments/${encodeURIComponent(paymentId)}`);
}

export async function fetchRazorpayOrder(orderId: string): Promise<{ id: string; status: string; amount: number; currency: string }> {
  return request(`orders/${encodeURIComponent(orderId)}`);
}

export async function fetchOrderPayments(orderId: string): Promise<{ items: { id: string; order_id: string; amount: number; currency: string; status: string }[] }> {
  return request(`orders/${encodeURIComponent(orderId)}/payments`);
}
