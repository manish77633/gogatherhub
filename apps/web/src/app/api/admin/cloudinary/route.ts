import { boundedForm, imageSignatureMatches } from "@/lib/request-body";
import { backendCookie } from "@/lib/tab-session";
import { NextRequest } from "next/server";

async function authorized(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/v1/auth/me`, { headers: { cookie: backendCookie(request) }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const user = await response.json() as { role: string };
    return user.role === "ADMIN";
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  if (!await authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ configured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!await authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return Response.json({ error: "Cloudinary credentials are not configured." }, { status: 503 });
  if (!/^[a-zA-Z0-9_-]+$/.test(cloud)) return Response.json({ error: "Invalid Cloudinary configuration" }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 8_500_000) return Response.json({ error: "Image must be under 8 MB" }, { status: 413 });
  const formResult=await boundedForm(request,8500000);if(!formResult.ok)return formResult.response;
  const file = formResult.form.get("file");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size < 1 || file.size > 8_000_000) return Response.json({ error: "Choose a JPEG, PNG, WebP or AVIF image under 8 MB." }, { status: 400 });
  if(!await imageSignatureMatches(file))return Response.json({error:"Image content does not match the selected file type"},{status:400});
  const upload = new FormData();
  upload.set("file", file);
  upload.set("folder", "go-gather-hub/catalog");
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` }, body: upload, signal: AbortSignal.timeout(30000) });
    const result = await response.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; bytes?: number; format?: string; original_filename?: string; error?: { message?: string } };
    if (!response.ok || !result.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)) return Response.json({ error: "Image upload failed. Choose a valid image and retry." }, { status: 502 });
    return Response.json({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, bytes: result.bytes, format: result.format, filename: result.original_filename ?? file.name });
  } catch { return Response.json({ error: "Cloudinary is unavailable. Please retry." }, { status: 503 }); }
}
