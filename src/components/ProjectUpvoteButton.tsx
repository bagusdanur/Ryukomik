"use client";

import { useCallback, useEffect, useState } from "react";
import { FiArrowUp } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type Props = { slug: string; initialCount?: number };

export default function ProjectUpvoteButton({ slug, initialCount = 0 }: Props) {
  const { user, loading: userLoading } = useSupabaseUser();
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const request = useCallback(async (method: "GET" | "POST") => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Silakan login untuk memberi upvote.");
    const response = await fetch(`/api/project/${encodeURIComponent(slug)}/upvote`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || "Upvote gagal diproses.");
    return json as { upvoted: boolean; upvote_count: number };
  }, [slug]);

  useEffect(() => {
    setCount(Number(initialCount) || 0);
  }, [initialCount, slug]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    request("GET").then((data) => {
      if (active) { setUpvoted(data.upvoted); setCount(data.upvote_count); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [request, user]);

  const toggle = async () => {
    if (!user) { setMessage("Silakan login untuk memberi upvote."); return; }
    if (loading) return;
    const previous = { count, upvoted };
    setLoading(true);
    setMessage("");
    setUpvoted(!upvoted);
    setCount(Math.max(0, count + (upvoted ? -1 : 1)));
    try {
      const result = await request("POST");
      setUpvoted(result.upvoted);
      setCount(result.upvote_count);
    } catch (error) {
      setCount(previous.count);
      setUpvoted(previous.upvoted);
      setMessage(error instanceof Error ? error.message : "Upvote gagal diproses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={toggle} disabled={loading || userLoading}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition active:scale-95 disabled:opacity-60 ${upvoted ? "border-amber-300/50 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/[.05] text-white/80 hover:border-amber-300/30"}`}>
        <FiArrowUp size={18} className={upvoted ? "stroke-[3]" : ""} />
        <span>{upvoted ? "Sudah di-upvote" : "Upvote Project"}</span>
        <span className="rounded-full bg-black/20 px-2 py-0.5 tabular-nums">{count}</span>
      </button>
      {message && <p className="mt-1.5 text-xs text-amber-200/80">{message}</p>}
    </div>
  );
}
