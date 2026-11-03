import { backendCookie } from "@/lib/tab-session";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
  const cookie = backendCookie(request);
  const session = await fetch(`${api}/v1/auth/me`, { headers: { cookie }, cache: "no-store" }).catch(() => null);
  if (!session?.ok || (await session.json()).role !== "BUYER") return Response.json({ error: "Please sign in." }, { status: 401 });
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloud)) return Response.json({ error: "Profile photo upload is not configured." }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 5_500_000) return Response.json({ error: "Image must be under 5 MB." }, { status: 413 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 5_000_000) return Response.json({ error: "Choose a JPEG, PNG or WebP image under 5 MB." }, { status: 400 });
  const upload = new FormData(); upload.set("file", file); upload.set("folder", "go-gather-hub/avatars");
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` }, body: upload, signal: AbortSignal.timeout(30000) });
    const result = await response.json() as { secure_url?: string };
    if (!response.ok || !result.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)) throw new Error();
    const saved = await fetch(`${api}/v1/buyer/profile/avatar`, { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ avatarUrl: result.secure_url }), signal: AbortSignal.timeout(10000) });
    if (!saved.ok) return Response.json({ error: "Photo uploaded but could not be saved to your profile." }, { status: 502 });
    return Response.json({ url: result.secure_url });
  } catch { return Response.json({ error: "Photo upload is unavailable. Please try again." }, { status: 503 }); }
}
