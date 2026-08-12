"use client";

import { supabase } from "@/lib/supabaseClient";

export async function socialFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Login diperlukan.");
  const response = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Permintaan gagal.");
  return payload as T;
}
