import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
const requireWeb=createRequire(process.cwd()+'/../web/package.json');
const {chromium}=requireWeb('@playwright/test');
const db=new PrismaClient();const suffix=randomBytes(6).toString('hex');const password=randomBytes(20).toString('hex');const ids:string[]=[];let browser:any;let product:any;
const token=randomBytes(32).toString('base64url');
async function call(path:string,method='GET',body?:any){const r=await fetch('http://localhost:4100/v1/seller/'+path,{method,headers:{cookie:`ggh_session=${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return r;}
async function main(){
try{
 console.log('Starting API checks');
 const user=await db.user.create({data:{email:`seller-audit-${suffix}@example.invalid`,name:'Seller Audit',role:'SELLER',passwordHash:await argon2.hash(password),seller:{create:{shopName:'Audit Shop',status:'APPROVED'}}}});ids.push(user.id);
 await db.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
 for(const path of ['overview','shop','products','orders','inventory','customers','analytics','reviews','payments','returns','support','category-requests'])assert.equal((await call(path)).status,200,path);
 assert.equal((await fetch('http://localhost:4100/v1/seller/customers')).status,401);
 const coupon=await call('coupons','POST',{code:`AUD_${suffix.toUpperCase()}`,discountAmount:'1.00',minSubtotal:'0',usageLimit:10,startsAt:new Date(Date.now()-60000).toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),active:true});assert.equal(coupon.status,201);const savedCoupon=await coupon.json();assert.equal((await call(`coupons/${savedCoupon.id}`,'PATCH',{active:false})).status,200);assert.equal((await db.coupon.findUniqueOrThrow({where:{id:savedCoupon.id}})).active,false);

 const category=await db.category.findFirstOrThrow();
 const created=await call('products','POST',{categoryId:category.id,name:'Audit Product',slug:`audit-${suffix}`,description:'Product for seller audit only',variants:[{sku:`AUD-${suffix}`,label:'Standard',price:'19.99',stock:2}]});assert.equal(created.status,201);product=await created.json();
 assert.equal((await call(`inventory/${product.variants[0].id}`,'PATCH',{stock:7})).status,200);
 assert.equal((await db.variant.findUniqueOrThrow({where:{id:product.variants[0].id}})).stock,7);
 assert.equal((await call(`inventory/${product.variants[0].id}`,'PATCH',{stock:-1})).status,400);
 assert.equal((await call('shop','PATCH',{shopName:'Audit Shop Updated'})).status,200);
 const foreign=await db.user.create({data:{email:`foreign-${suffix}@example.invalid`,name:'Foreign seller',role:'SELLER',passwordHash:'unused',seller:{create:{shopName:'Foreign Shop',status:'APPROVED'}}},include:{seller:true}});ids.push(foreign.id);
 const foreignCoupon=await db.coupon.create({data:{sellerId:foreign.seller!.id,code:`FOREIGN_${suffix.toUpperCase()}`,discountAmount:'1',minSubtotal:'0',active:true,startsAt:new Date(Date.now()-60000),expiresAt:new Date(Date.now()+86400000)}});
 assert.equal((await call(`coupons/${foreignCoupon.id}`,'PATCH',{active:false})).status,400,'seller cannot edit another shop coupon');
 const buyer=await db.user.create({data:{email:`audit-buyer-${suffix}@example.invalid`,name:'Audit buyer',passwordHash:'unused'}});ids.push(buyer.id);const bt=randomBytes(32).toString('base64url');await db.session.create({data:{userId:buyer.id,tokenHash:createHash('sha256').update(bt).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
 const service=await db.servicePincode.findFirstOrThrow({where:{active:true,cod:true}});const address=await db.address.create({data:{userId:buyer.id,fullName:'Audit Buyer',phone:'9876543210',line1:'Audit Address 123',city:'Delhi',state:'Delhi',pincode:service.pincode}});await db.product.update({where:{id:product.id},data:{status:'ACTIVE'}});
 const checkout={addressId:address.id,couponCode:foreignCoupon.code,paymentMethod:'COD',items:[{variantId:product.variants[0].id,quantity:1}],idempotencyKey:randomBytes(16).toString('hex')};
 for(const endpoint of ['orders/quote','orders']){const rejected=await fetch(`http://localhost:4100/v1/buyer/${endpoint}`,{method:'POST',headers:{cookie:`ggh_session=${bt}`,'content-type':'application/json'},body:JSON.stringify(checkout)});assert.equal(rejected.status,400,'foreign seller coupon rejected at '+endpoint);}
 assert.equal((await db.variant.findUniqueOrThrow({where:{id:product.variants[0].id}})).stock,7,'rejected checkout rolls back stock');
 await call(`coupons/${savedCoupon.id}`,'PATCH',{active:true});checkout.couponCode=savedCoupon.code;
 const quote=await fetch('http://localhost:4100/v1/buyer/orders/quote',{method:'POST',headers:{cookie:`ggh_session=${bt}`,'content-type':'application/json'},body:JSON.stringify(checkout)});assert.equal(quote.status,201);assert.equal(Number((await quote.json()).discount),1);
 const placed=await fetch('http://localhost:4100/v1/buyer/orders',{method:'POST',headers:{cookie:`ggh_session=${bt}`,'content-type':'application/json'},body:JSON.stringify(checkout)});assert.equal(placed.status,201);const order=await placed.json();const sellerOrder=await db.sellerOrder.findFirstOrThrow({where:{orderId:order.id},include:{items:true}});
 assert.equal((await call(`orders/${sellerOrder.id}/status`,'PATCH',{status:'SHIPPED'})).status,400);
 for(const status of ['ACCEPTED','PACKED','SHIPPED','DELIVERED'])assert.equal((await call(`orders/${sellerOrder.id}/status`,'PATCH',{status})).status,200,status);
 await db.review.create({data:{buyerId:buyer.id,productId:product.id,orderItemId:sellerOrder.items[0].id,rating:4,title:'Audit review',body:'Audit review content',status:'APPROVED'}});
 const ret=await db.returnRequest.create({data:{buyerId:buyer.id,sellerId:sellerOrder.sellerId,orderItemId:sellerOrder.items[0].id,reason:'Audit return reason'}});assert.equal((await call(`returns/${ret.id}/decision`,'PATCH',{status:'SELLER_APPROVED',reason:'Audit approval'})).status,200);
 assert.equal((await (await call('reviews')).json()).length,1);assert.equal((await (await call('analytics')).json()).products[0].quantity,1);


 assert.equal((await call('support','POST',{subject:'Audit ticket',message:'Audit support ticket message'})).status,201);
 assert.equal((await call('category-requests','POST',{name:'Audit category',slug:`audit-category-${suffix}`})).status,201);
 assert.equal((await call('category-requests','POST',{name:'Audit category',slug:`audit-category-${suffix}`})).status,400);
 console.log('API checks passed; starting browser');
 browser=await chromium.launch({headless:true});const context=await browser.newContext();const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.goto('http://localhost:3200/shop/login');await page.waitForFunction(()=>Boolean(sessionStorage.getItem('ggh_tab')));const tab=await page.evaluate(()=>sessionStorage.getItem('ggh_tab'));
 await context.addCookies([{name:`ggh_session_${tab}`,value:token,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
 const tabs=['coupons-and-offers','overview','my-shop','products','inventory','orders','customers','analytics','reviews','returns','payments','commission','payouts','support','settings'];
 for(const width of [1440,390]){await page.setViewportSize({width,height:950});for(const section of tabs){console.log('UI',width,section);await page.goto(`http://localhost:3200/seller/${section}?ggh_tab=${tab}`);await page.locator('.seller-page').waitFor();await page.waitForFunction(()=>!document.querySelector('.dash-skeleton-stack'));assert.equal(await page.locator('.dash-error:visible').count(),0,`${width} ${section} API errors`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${section} overflow`);if(section==='products'){await page.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('dialog[open]').waitFor();await page.getByRole('button',{name:'Close dialog'}).click();} }
 await page.screenshot({path:`../../seller-audit-${width}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASS: 12 API resources; unauthenticated rejection; product creation; stock persistence and validation; settings; support; category deduplication; all 15 tabs at 1440px and 390px; product dialog; no page exceptions or overflow.');
 assert.equal((await call(`products/${product.id}`,'DELETE')).status,200);
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();await db.returnRequest.deleteMany({where:{buyerId:{in:ids}}});await db.review.deleteMany({where:{buyerId:{in:ids}}});await db.orderItem.deleteMany({where:{sellerOrder:{order:{buyerId:{in:ids}}}}});await db.sellerOrder.deleteMany({where:{order:{buyerId:{in:ids}}}});await db.order.deleteMany({where:{buyerId:{in:ids}}});if(product){await db.inventoryMovement.deleteMany({where:{variant:{productId:product.id}}});await db.variant.deleteMany({where:{productId:product.id}});await db.product.delete({where:{id:product.id}});}await db.coupon.deleteMany({where:{seller:{userId:{in:ids}}}});await db.categoryRequest.deleteMany({where:{seller:{userId:{in:ids}}}});await db.supportTicket.deleteMany({where:{userId:{in:ids}}});await db.auditLog.deleteMany({where:{actorId:{in:ids}}});await db.session.deleteMany({where:{userId:{in:ids}}});await db.seller.deleteMany({where:{userId:{in:ids}}});await db.address.deleteMany({where:{userId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();}

}
void main();
