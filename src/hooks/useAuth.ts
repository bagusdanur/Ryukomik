"use client";

import { useContext } from "react";

import { AuthContext } from "@/components/auth/AuthProvider";

/** Akses status login auth lokal (aktif setelah NEXT_PUBLIC_AUTH_LOCAL=1). */
export function useAuth() {
  return useContext(AuthContext);
}
