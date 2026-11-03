import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Local admin bootstrap is disabled in production.");
  const db = new PrismaClient();
  const email = "local-admin@local.invalid";
  const target = resolve(process.cwd(), "../../tmp/local-admin-login.txt");
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) { console.info(`Local admin already exists. Credential file: ${target}`); return; }
    const password = randomBytes(36).toString("base64url");
    await db.user.create({ data: { email, name: "Local Admin", role: "ADMIN", passwordHash: await argon2.hash(password) } });
    await mkdir(resolve(process.cwd(), "../../tmp"), { recursive: true });
    await writeFile(target, `Admin login: http://localhost:3000/shop/admin-login\nEmail: ${email}\nPassword: ${password}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    console.info(`Local admin created. Credentials saved to ${target}`);
  } finally { await db.$disconnect(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
