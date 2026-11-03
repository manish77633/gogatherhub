export type Profile = { id: string; name: string; email: string; avatarUrl?: string | null; googleLinked?: boolean; createdAt: string };
export type Address = { id: string; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };
export type OrderItem = { id: string; productName: string; quantity: number; lineTotal: string; variant: { label: string; product: { slug: string; imageUrl: string | null } } };
export type Order = { id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string; total: string; subtotal: string; discount: string; shipping: string; codFee: string; createdAt: string; address?: Address; sellerOrders: { status: string; seller: { shopName: string }; items: OrderItem[] }[] };
export type ReturnRequest = { id: string; reason: string; status: string; createdAt: string; orderItem: { productName: string; quantity: number } };
export type Ticket = { id: string; subject: string; message: string; status: string; createdAt: string };
export type Coupon = { code: string; discountAmount: string; minSubtotal: string; expiresAt: string };
export type WishlistEntry = { product: { slug: string; name: string; imageUrl: string | null; seller: { shopName: string }; variants: { id: string; label: string; price: string; stock: number }[] } };

export async function accountRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/buyer/${path}`, { cache: "no-store", ...options, headers: { ...(options?.body ? { "content-type": "application/json" } : {}), ...options?.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : result.error?.message ?? "Request failed. Please try again.");
  return result as T;
}
export const money = (value: string | number) => `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
export const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
