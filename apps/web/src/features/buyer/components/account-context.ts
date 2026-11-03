"use client";
import { createContext, useContext } from "react";
export const AccountUserContext = createContext("");
export function useAccountUserId() { return useContext(AccountUserContext); }
