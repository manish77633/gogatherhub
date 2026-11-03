import type {ReactNode} from "react";
import {DashboardShell} from "@/features/dashboard/components/dashboard";
import {requireRole} from "@/lib/server-auth";
import "@/features/dashboard/styles/dashboard.css";
export default async function SellerLayout({children}:{children:ReactNode}){const user=await requireRole("SELLER");return <DashboardShell panel="seller" userId={user.id}>{children}</DashboardShell>}
