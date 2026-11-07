import {ProductEditor} from "@/features/dashboard/components/product-editor";
export default async function EditAdminProduct({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProductEditor panel="admin" id={id}/>;}
