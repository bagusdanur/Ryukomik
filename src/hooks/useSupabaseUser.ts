"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { clearLocalSessionCache, getSession } from "@/lib/auth/getSession";
import { pullAndMergeHistory } from "@/utils/historySync";

type Listener = (user: User | null) => void;

let currentUser: User | null = null;
const pulledHistoryFor = new Set<string>();
let initialized = false;
let initPromise: Promise<User | null> | null = null;
const listeners = new Set<Listener>();

function emit(user: User | null) {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
}

export function initSupabaseUser() {
  if (initPromise) return initPromise;

  // getSession() adalah jembatan: sesi Supabase lama atau sesi auth lokal.
  initPromise = getSession()
    .then(({ data }) => {
      const user = (data?.session?.user as User | undefined) || null;
      emit(user);
      // Setelah login: tarik riwayat server + merge ke perangkat ini (sekali per user).
      if (user && !pulledHistoryFor.has(user.id)) {
        pulledHistoryFor.add(user.id);
        void pullAndMergeHistory();
      }

      if (!initialized) {
        initialized = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            emit(session.user);
            // Login di tengah sesi (modal): tarik + merge riwayat juga di sini,
            // tidak perlu reload. Guard set mencegah tarik berulang.
            if (!pulledHistoryFor.has(session.user.id)) {
              pulledHistoryFor.add(session.user.id);
              void pullAndMergeHistory();
            }
          } else void getSession().then(({ data: next }) => emit((next?.session?.user as User | undefined) || null));
        });
      }

      return user;
    })
    .catch((error) => {
      console.error("Auth init error:", error);
      emit(null);
      return null;
    });

  return initPromise;
}

export function getCachedSupabaseUser() {
  return currentUser;
}

export function refreshSupabaseUser() {
  initPromise = null;
  return initSupabaseUser();
}

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(currentUser);
  const [loading, setLoading] = useState(!initPromise);

  useEffect(() => {
    listeners.add(setUser);

    // Sesi bisa baru terpasang setelah OAuth (cookie diset server). Kalau tab
    // kembali aktif atau ada fokus, cek ulang sekali — jangan biarkan UI
    // menampilkan "Guest" padahal cookie sudah valid.
    const recheck = () => {
      void getSession().then(({ data }) => {
        const next = (data?.session?.user as User | undefined) || null;
        if (next && next.id !== currentUser?.id) emit(next);
      }).catch(() => undefined);
    };
    const onVisible = () => { if (document.visibilityState === "visible") recheck(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", recheck);

    initSupabaseUser()
      .then((nextUser) => setUser(nextUser))
      .catch((error) => {
        console.error("useSupabaseUser error:", error);
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => {
      listeners.delete(setUser);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recheck);
    };
  }, []);

  return { user, loading };
}
