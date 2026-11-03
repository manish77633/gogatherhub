"use client";
import { createContext, useContext } from "react";
export const DashboardUserContext = createContext("");
export function useDashboardUserId() { return useContext(DashboardUserContext); }
