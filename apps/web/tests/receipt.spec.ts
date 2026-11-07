import { test, expect } from "@playwright/test";
import { receiptHtml } from "../src/lib/receipt";
test("downloadable record escapes user content and accurately states unpaid status",()=>{
 const html=receiptHtml({orderNumber:"GGH-TEST",createdAt:"2026-11-03",paymentMethod:"COD",paymentStatus:"PENDING",total:"120",subtotal:"100",discount:"0",shipping:"20",codFee:"0",sellerOrders:[{seller:{shopName:"<script>attack()</script>"},items:[{productName:'<img src=x onerror="attack()">',quantity:1,lineTotal:"100"}]}]});
 expect(html).toContain("PENDING");expect(html).toContain("not a GST tax invoice");expect(html).not.toContain("<script>");expect(html).not.toContain("<img");expect(html).toContain("&lt;script&gt;");
});
