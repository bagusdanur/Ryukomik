"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  banned: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: false,
  banned: false,
  refresh: async () => {},
  signOut: async () => {},
});

// Login lokal baru aktif setelah kredensial Google terpasang.
const ENABLED = process.env.NEXT_PUBLIC_AUTH_LOCAL === "1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(ENABLED);
  const [banned, setBanned] = useState(false);

  const refresh = useCallback(async () => {
    if (!ENABLED) return;
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        setUser(null);
        setBanned(false);
        return;
      }
      const json = (await response.json()) as { user?: AuthUser; banned?: boolean };
      setUser(json.user ?? null);
      setBanned(Boolean(json.banned));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // offline: state lokal tetap dibersihkan
    }
    setUser(null);
    setBanned(false);
    try {
      localStorage.removeItem("rk_access");
    } catch {
      // storage bisa diblokir
    }
  }, []);

  useEffect(() => {
    if (!ENABLED) return;
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, banned, refresh, signOut }),
    [user, loading, banned, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
