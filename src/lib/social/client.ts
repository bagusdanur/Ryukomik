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

/** Baca data sosial tanpa wajib login (pembaca anonim). Token tetap dikirim
 *  bila ada supaya penanda "disukai"/"milik saya" tetap akurat. Dipakai untuk
 *  komentar anime, yang pengunjungnya kebanyakan belum masuk. */
export async function socialRead<T>(input: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(input, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Permintaan gagal.");
  return payload as T;
}
