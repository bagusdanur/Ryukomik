"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import BanNoticeCard, { type BanInfo } from "@/components/ban/BanNoticeCard";

type BanState = BanInfo & { banned: boolean };

const OVERLAY_ID = "rk-ban-gate";
const Z_INDEX = 2147483000;

/**
 * Gerbang blokir penuh untuk akun yang sedang login tapi diblokir.
 *
 * Tidak bisa ditutup: tanpa tombol close, Escape diblokir, dirender lewat
 * portal ke <body> dengan z-index maksimum, isi <body> lain dibuat `inert`,
 * dan node-nya menyembuhkan diri kalau dihapus/disembunyikan dari DOM.
 * Server tetap penentu akhir — semua API menolak akun yang diblokir.
 */
export default function BanGate() {
  const { user } = useSupabaseUser();
  const pathname = usePathname();
  const [state, setState] = useState<BanState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const savedNode = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user?.id) {
      setState(null);
      return;
    }
    let active = true;

    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/me/ban-status", {
          cache: "no-store",
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = (await res.json()) as BanState;
        if (active) setState(json?.banned ? json : null);
      } catch {
        // Jaringan bermasalah: jangan salah kunci user.
      }
    };

    void check();
    const interval = window.setInterval(check, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id, pathname]);

  useEffect(() => {
    if (!state?.banned) return;
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const inerted: Element[] = [];
    for (const child of Array.from(document.body.children)) {
      if ((child as HTMLElement).id === OVERLAY_ID) continue;
      if (typeof (child as HTMLElement & { inert?: boolean }).inert === "boolean") {
        (child as HTMLElement & { inert: boolean }).inert = true;
        inerted.push(child);
      }
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      for (const el of inerted) (el as HTMLElement & { inert: boolean }).inert = false;
    };
  }, [state?.banned]);

  useEffect(() => {
    if (!state?.banned) return;
    const observer = new MutationObserver(() => {
      const node = savedNode.current;
      if (!node) return;
      // Pasang kembali node yang sama kalau dihapus dari DOM, dan pulihkan
      // inline style yang dipakai untuk menyembunyikannya.
      if (!document.getElementById(OVERLAY_ID)) document.body.appendChild(node);
      if (node.style.display === "none") node.style.display = "";
      if (node.style.visibility === "hidden") node.style.visibility = "visible";
      if (node.style.opacity === "0") node.style.opacity = "1";
      if (node.style.pointerEvents === "none") node.style.pointerEvents = "auto";
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, [state?.banned]);

  useEffect(() => {
    if (!state?.banned) return;
    const block = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [state?.banned]);

  if (!mounted || !state?.banned) return null;

  async function logout() {
    setLeaving(true);
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/";
  }

  return createPortal(
    <div
      id={OVERLAY_ID}
      ref={(el) => {
        nodeRef.current = el;
        if (el) savedNode.current = el;
      }}
      style={{ zIndex: Z_INDEX }}
      className="fixed inset-0 flex items-center justify-center px-5 py-8"
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--background) 92%, transparent)", backdropFilter: "blur(8px)" }}
        onClick={(event) => event.stopPropagation()}
      />
      <BanNoticeCard info={state} busy={leaving} onLogout={logout} />
    </div>,
    document.body,
  );
}
