"use client";

import { useEffect, useState } from "react";

/**
 * Banner kecil untuk hasil login: ?login=error|busy|banned.
 * Tanpa ini, login yang gagal terlihat seperti "tidak terjadi apa-apa".
 */
export default function LoginNotice() {
  const [state, setState] = useState<{ kind: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const login = params.get("login");
    if (!login) return;
    setState({ kind: login });
    // Bersihkan query supaya tidak menempel saat reload.
    params.delete("login");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);

  if (!state) return null;

  const message =
    state.kind === "banned"
      ? "Akun kamu sedang diblokir. Hubungi admin untuk banding."
      : state.kind === "busy"
        ? "Terlalu banyak percobaan login dari jaringan ini. Tunggu 1 menit lalu coba lagi."
        : "Login gagal atau sesi kedaluwarsa. Coba masuk lagi.";

  const tone =
    state.kind === "banned"
      ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
      : "border-amber-400/25 bg-amber-500/10 text-amber-100";

  return (
    <div className={`mx-4 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed ${tone}`}>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setState(null)}
        aria-label="Tutup"
        className="shrink-0 text-white/40 transition-colors hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
