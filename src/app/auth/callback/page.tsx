"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Callback() {
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const description =
        params.get("error_description") || hash.get("error_description") || params.get("error") || hash.get("error") || "";
      const code = params.get("error_code") || hash.get("error_code") || "";

      // Akun diblokir: Supabase menolak login. Beri tahu user, jangan diam-diam
      // kembali ke beranda seolah tidak terjadi apa-apa.
      if (code === "user_banned" || /ban(ned)?/i.test(description)) {
        try {
          localStorage.setItem("rk-ban-notice", JSON.stringify({ at: Date.now() }));
        } catch {
          /* storage bisa diblokir browser */
        }
        window.location.replace("/?login=banned");
        return;
      }

      // Login berhasil → penanda blokir lama tidak relevan lagi.
      try {
        localStorage.removeItem("rk-ban-notice");
      } catch {
        /* storage bisa diblokir browser */
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const lastUserId = sessionData.session?.user?.id;
      if (lastUserId) {
        try {
          // Dipakai /api/ban/lookup kalau akun ini diblokir dan sesinya dicabut.
          localStorage.setItem("rk-last-user", JSON.stringify({ id: lastUserId, at: Date.now() }));
        } catch {
          /* storage bisa diblokir browser */
        }
      }

      const next = params.get("next");
      window.location.replace(next || "/");
    };

    void run();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center text-white">
      Sedang memproses login...
    </div>
  );
}
