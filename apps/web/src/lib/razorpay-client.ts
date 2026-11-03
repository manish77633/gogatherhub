export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (error: { error?: { description?: string } }) => void) => void } };

export async function loadRazorpay() {
  const view = window as RazorpayWindow;
  if (view.Razorpay) return view.Razorpay;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment window could not load."));
    document.head.appendChild(script);
  });
  if (!view.Razorpay) throw new Error("Payment window could not load.");
  return view.Razorpay;
}

