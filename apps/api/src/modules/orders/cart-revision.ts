import { createHash } from "node:crypto";
export function cartRevision(items: {variantId:string;quantity:number;updatedAt:Date}[]):string {
  return createHash("sha256").update(JSON.stringify(items.map(item=>[item.variantId,item.quantity,item.updatedAt.toISOString()]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest("hex");
}
