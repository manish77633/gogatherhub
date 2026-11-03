import { test, expect } from "@playwright/test";
import { cartLineKey, cartProductSlug, getCartVariant } from "../src/features/buyer/components/variant-storage";
const small="11111111-1111-4111-8111-111111111111",large="22222222-2222-4222-8222-222222222222";
test("variant identity survives line encoding",()=>{
 const a=cartLineKey("variant-test",small),b=cartLineKey("variant-test",large);
 expect(a).not.toBe(b);expect(cartProductSlug(a)).toBe("variant-test");expect(getCartVariant(a)).toBe(small);expect(getCartVariant(b)).toBe(large);
});
test("cart shows independent variants, quantities and correct prices",async({page})=>{
 await page.goto("/shop/login");await expect(page).toHaveURL(/ggh_tab=/);
 await page.evaluate(({small,large})=>{sessionStorage.setItem("ggh-demo-cart",JSON.stringify({[`variant-test-v-${small}`]:2,[`variant-test-v-${large}`]:1}));},{small,large});
 await page.goto("/shop/cart");
 await expect(page.getByText("Variant test · Small",{exact:true})).toBeVisible();
 await expect(page.getByText("Variant test · Large",{exact:true})).toBeVisible();
 await expect(page.getByText("₹400",{exact:true}).first()).toBeVisible();
});
