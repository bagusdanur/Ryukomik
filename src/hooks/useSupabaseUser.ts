"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Listener = (user: User | null) => void;

let currentUser: User | null = null;
let initialized = false;
let initPromise: Promise<User | null> | null = null;
const listeners = new Set<Listener>();

function emit(user: User | null) {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
}

export function initSupabaseUser() {
  if (initPromise) return initPromise;

  initPromise = supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error("Session fetch error:", error);
      }
      const user = data?.session?.user || null;
      emit(user);

      if (!initialized) {
        initialized = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          emit(session?.user || null);
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
