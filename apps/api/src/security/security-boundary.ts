import type { Request, Response, NextFunction } from "express";

export function securityBoundary(webOrigin: string, limit = 20, now = () => Date.now()) {
  const expected = new URL(webOrigin).origin;
  const attempts = new Map<string, { count: number; expires: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    const write = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (write && req.path !== "/v1/payments/razorpay/webhook") {
      const origin = req.headers.origin;
      if (origin && origin !== expected || req.headers["sec-fetch-site"] === "cross-site") return res.status(403).json({ message: "Request origin is not allowed" });
    }
    if (write && /^\/v1\/auth\/(login|register|register-seller|google)(\/link)?$/.test(req.path)) {
      const current = now();
      for (const [key, entry] of attempts) if (entry.expires <= current) attempts.delete(key);
      const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
      let entry = attempts.get(key);
      if (!entry) {
        if (attempts.size >= 10000) return res.status(503).json({ message: "Sign in is busy; retry shortly" });
        entry = { count: 0, expires: current + 600000 }; attempts.set(key, entry);
      }
      if (++entry.count > limit) {
        res.setHeader("Retry-After", String(Math.ceil((entry.expires-current)/1000)));
        return res.status(429).json({ message: "Too many sign in attempts. Please retry later." });
      }
    }
    next();
  };
}
