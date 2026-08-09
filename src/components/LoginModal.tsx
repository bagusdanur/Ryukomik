"use client";
import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { FcGoogle } from "react-icons/fc";
import { FaDiscord, FaTwitter } from "react-icons/fa";
import Button from "@/components/Button";

type LoginModalProps = {
  close: () => void;
};

type LoginTab = "social" | "password";

export default function LoginModal({ close }: LoginModalProps) {
  const [tab, setTab] = useState<LoginTab>("social");

  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.href
        )}`
      : "";

  const login = async (provider: Provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl },
    });
  };

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={close}
      />

      {/* MODAL */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
        rk-card text-white w-[92%] max-w-[380px]
        rounded-3xl z-50"
      >
        {/* HEADER */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <h2 className="text-center text-xl font-black">
            Masuk ke Ryukomik
          </h2>
          <p className="text-xs text-white/50 text-center mt-1">
            Simpan bookmark & riwayat baca
          </p>
        </div>

        {/* TABS */}
        <div className="mx-4 mt-4 flex rounded-2xl bg-white/5 p-1">
          <button
            onClick={() => setTab("social")}
            className={`flex-1 py-2 text-sm rounded-lg transition
              ${
                tab === "social"
                  ? "bg-violet-500/20 text-cyan-100"
                  : "text-white/60 hover:text-white"
              }`}
          >
            Social
          </button>
          <button
            onClick={() => setTab("password")}
            className={`flex-1 py-2 text-sm rounded-lg transition
              ${
                tab === "password"
                  ? "bg-violet-500/20 text-cyan-100"
                  : "text-white/60 hover:text-white"
              }`}
          >
            Email
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5">
          {/* SOCIAL LOGIN */}
          {tab === "social" && (
            <div className="space-y-3">
              <button
                onClick={() => login("google")}
                className="w-full flex items-center justify-center gap-3
                bg-white text-black py-3 rounded-xl
                hover:bg-gray-100 transition"
              >
                <FcGoogle size={22} />
                <span className="font-medium">Lanjutkan dengan Google</span>
              </button>

              <button
                disabled
                className="w-full flex items-center justify-center gap-3
                bg-white/10 text-white/40 py-3 rounded-2xl cursor-not-allowed"
              >
                <FaDiscord size={22} />
                Discord (Coming Soon)
              </button>

              <button
                disabled
                className="w-full flex items-center justify-center gap-3
                bg-white/10 text-white/40 py-3 rounded-2xl cursor-not-allowed"
              >
                <FaTwitter size={22} />
                Twitter (Coming Soon)
              </button>
            </div>
          )}

          {/* EMAIL LOGIN */}
          {tab === "password" && (
            <div className="space-y-3">
              <input
                className="rk-input w-full rounded-2xl px-4 py-3"
                placeholder="Email"
              />

              <input
                type="password"
                className="rk-input w-full rounded-2xl px-4 py-3"
                placeholder="Password"
              />

              <Button className="w-full rounded-2xl py-3 font-bold">
                Login
              </Button>

              <button className="block mx-auto text-xs text-white/50 hover:text-white mt-2">
                Lupa Password?
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 pb-4 text-center text-xs text-white/40">
          Dengan login, kamu menyetujui{" "}
          <span className="underline">Syarat & Kebijakan</span>
        </div>
      </div>
    </>
  );
}
