import type {ReactNode} from "react";
import {DashboardShell} from "@/features/dashboard/components/dashboard";
import {requireRole} from "@/lib/server-auth";
import "@/features/dashboard/styles/dashboard.css";
export default async function AdminLayout({children}:{children:ReactNode}){const user=await requireRole("ADMIN");return <DashboardShell panel="admin" userId={user.id}>{children}</DashboardShell>}
