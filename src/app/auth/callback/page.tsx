"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Callback() {
  useEffect(() => {
    const run = async () => {
      // Pastikan session diambil dulu
      await supabase.auth.getSession();

      // Ambil target redirect
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      // Kalau tidak ada "next", fallback ke home
      window.location.replace(next || "/");
    };

    run();
  }, []);

  return (
    <div className="flex items-center justify-center h-screen text-white">
      Sedang memproses login...
    </div>
  );
}
