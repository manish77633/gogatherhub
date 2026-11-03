import assert from "node:assert/strict";
import { AccountController } from "../src/modules/orders/account.controller";
import type { PrismaService } from "../src/database/prisma.service";
import type { AuthService } from "../src/modules/auth/auth.service";
const userId="11111111-1111-4111-8111-111111111111",ticketId="22222222-2222-4222-8222-222222222222";
let requested: unknown;
let writes: unknown;
const db = {
 supportTicket:{findFirst:async(args:unknown)=>{requested=args;return null;},findMany:async()=>[]},
 order:{findMany:async()=>[{id:ticketId,orderNumber:"GGH-TEST",status:"PLACED",paymentStatus:"PENDING",createdAt:new Date(),sellerOrders:[]}]},
 notificationRead:{findMany:async()=>[],createMany:async(args:unknown)=>{writes=args;return {count:1};}}
};
const auth={requireRole:async()=>({id:userId,role:"BUYER"})};
async function main(){
 const controller=new AccountController(db as unknown as PrismaService,auth as unknown as AuthService);
 await assert.rejects(()=>controller.replies("buyer",ticketId),/Ticket unavailable/);
 assert.deepEqual(requested,{where:{id:ticketId,userId}});
 await assert.rejects(()=>controller.replies("buyer","invalid"),/Invalid ticket/);
 const notices=await controller.notifications("buyer");assert.equal(notices.length,1);assert.equal(notices[0].read,false);
 await controller.read("buyer",{ids:[notices[0].id,"another-buyers-notification"]});
 assert.deepEqual(writes,{data:[{userId,notificationId:notices[0].id}],skipDuplicates:true});
 console.log("Account activity: ownership, input validation and read scoping passed");
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
