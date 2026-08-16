"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaThumbsUp, FaFire, FaStar, FaClock } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

const reactions = [
  { id: "suka", label: "Suka", icon: FaThumbsUp, color: "text-sky-300" },
  { id: "semangat", label: "Semangat", icon: FaFire, color: "text-orange-300" },
  { id: "keren", label: "Keren", icon: FaStar, color: "text-amber-300" },
  { id: "ditunggu", label: "Ditunggu", icon: FaClock, color: "text-violet-300" },
] as const;
type ReactionId = (typeof reactions)[number]["id"];
type Counts = Record<ReactionId, number>;
type Props = { slug: string; initialCount?: number; initialCounts?: Partial<Counts> };
type Response = { selected_reaction: ReactionId | null; upvote_count: number; reaction_counts: Partial<Counts> };
const normalizeCounts = (value?: Partial<Counts>): Counts => ({ suka: 0, semangat: 0, keren: 0, ditunggu: 0, ...value });

export default function ProjectUpvoteButton({ slug, initialCount = 0, initialCounts }: Props) {
  const { user, loading: userLoading } = useSupabaseUser();
  const [counts, setCounts] = useState<Counts>(() => normalizeCounts(initialCounts));
  const [selected, setSelected] = useState<ReactionId | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const total = useMemo(() => Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0) || Number(initialCount) || 0, [counts, initialCount]);

  const request = useCallback(async (method: "GET" | "POST", reactionType?: ReactionId) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Silakan login untuk memberikan reaksi.");
    const response = await fetch(`/api/project/${encodeURIComponent(slug)}/upvote`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      body: method === "POST" ? JSON.stringify({ reactionType }) : undefined,
      cache: "no-store",
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || "Reaksi gagal diproses.");
    return json as Response;
  }, [slug]);

  useEffect(() => { setCounts(normalizeCounts(initialCounts)); }, [initialCounts, slug]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    request("GET").then((data) => { if (active) { setSelected(data.selected_reaction); setCounts(normalizeCounts(data.reaction_counts)); } }).catch(() => undefined);
    return () => { active = false; };
  }, [request, user]);

  const react = async (reactionType: ReactionId) => {
    if (!user) { setMessage("Silakan login untuk memberikan reaksi."); return; }
    if (loading) return;
    const previous = { counts, selected };
    const next = { ...counts };
    if (selected) next[selected] = Math.max(0, next[selected] - 1);
    if (selected !== reactionType) next[reactionType] += 1;
    setCounts(next); setSelected(selected === reactionType ? null : reactionType); setMessage(""); setLoading(true);
    try {
      const result = await request("POST", reactionType);
      setSelected(result.selected_reaction); setCounts(normalizeCounts(result.reaction_counts));
    } catch (error) {
      setCounts(previous.counts); setSelected(previous.selected);
      setMessage(error instanceof Error ? error.message : "Reaksi gagal diproses.");
    } finally { setLoading(false); }
  };

  return <div className="text-center">
    <h2 className="text-lg font-black text-white/95">Reaksi Project Ini</h2>
    <p className="mt-1 text-xs text-white/45">{total} reaksi pembaca</p>
    <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {reactions.map(({ id, label, icon: Icon, color }) => {
        const active = selected === id;
        return <button key={id} type="button" onClick={() => react(id)} disabled={loading || userLoading} aria-pressed={active}
          className={`flex min-w-[92px] flex-col items-center rounded-2xl border px-3 py-3.5 transition active:scale-95 disabled:opacity-60 ${active ? "border-violet-300/55 bg-violet-400/15 shadow-[0_0_22px_rgba(167,139,250,.1)]" : "border-white/10 bg-white/[.04] hover:border-white/20 hover:bg-white/[.07]"}`}>
          <span className={`grid h-10 w-10 place-items-center rounded-full bg-white/[.07] ${color}`}><Icon size={19} /></span>
          <span className="mt-2 text-[11px] font-bold text-white/70">{label}</span>
          <span className="mt-0.5 text-sm font-black tabular-nums text-white">{counts[id]}</span>
        </button>;
      })}
    </div>
    {message && <p className="mt-3 text-xs text-amber-200/80">{message}</p>}
  </div>;
}
