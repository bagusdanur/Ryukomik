"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getSession } from "@/lib/auth/getSession";
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
          if (session?.user) emit(session.user);
          else void getSession().then(({ data: next }) => emit((next?.session?.user as User | undefined) || null));
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

    initSupabaseUser()
      .then((nextUser) => setUser(nextUser))
      .catch((error) => {
        console.error("useSupabaseUser error:", error);
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => {
      listeners.delete(setUser);
    };
  }, []);

  return { user, loading };
}
