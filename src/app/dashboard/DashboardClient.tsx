"use client";


import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  FiUsers,
  FiLogOut,
  FiBell,
  FiActivity,
  FiShield,
  FiHome,
  FiMessageCircle,
} from "react-icons/fi";
import DashboardHomeTab from "@/components/dashboard/DashboardHomeTab";
import SourceHealthTab from "@/components/dashboard/SourceHealthTab";
import UsersTab from "@/components/dashboard/UsersTab";
import PremiumCodesTab from "@/components/dashboard/PremiumCodesTab";
import RequestsTab from "@/components/dashboard/RequestsTab";
import CommentsModerationTab from "@/components/dashboard/CommentsModerationTab";
import EventRewardsTab, {
  type TitleRushWinner,
} from "@/components/dashboard/EventRewardsTab";

// ── constants ──────────────────────────────────────────────────────────────
const PER_PAGE = 20;

type DashboardPage =
  | "dashboard"
  | "users"
  | "requests"
  | "source-health"
  | "comments"
  | "events"
  | "codes";

type AdminUser = User & {
  role?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type PremiumCode = {
  id: string;
  code: string;
  used?: boolean;
  duration_days: number;
  created_at: string;
  used_at?: string | null;
  used_by?: string | null;
};

type DashboardUser = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  is_premium?: boolean;
  level?: number | null;
  xp?: number | null;
  created_at?: string | null;
  premium_until?: string | null;
};

type PremiumRequest = {
  id: string;
  user_id?: string | null;
  status: string;
  name?: string | null;
  proof_url: string;
  created_at: string;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

type ModeratedComment = {
  id: string;
  content?: string | null;
  slug?: string | null;
  chapter?: string | number | null;
  author_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  is_spoiler?: boolean;
  user_id?: string | null;
};

type SourceHealth = {
  checkedAt?: string;
  degraded?: number;
  sources?: Array<{
    id: string;
    label: string;
    ok?: boolean;
    imageProxy?: string;
    status?: string | number;
    latencyMs?: number;
    itemCount?: number;
    empty?: boolean;
    error?: string;
    endpoint: string;
  }>;
  error?: string;
};

type ActivityToday = {
  recent: unknown[];
  topChapters: Array<{ slug: string; count: number }>;
  topUsers: Array<{
    userId: string;
    count: number;
    profile?: { username?: string | null; avatar_url?: string | null } | null;
  }>;
};

// ── helpers ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [page, setPage] = useState<DashboardPage>("dashboard");
  const [premiumCodes, setPremiumCodes] = useState<PremiumCode[]>([]);
  const [codeDays, setCodeDays] = useState(30);
  const [codesLoading, setCodesLoading] = useState(false);
  const [copied, setCopied] = useState("");

  // comments moderation
  const [comments, setComments] = useState<ModeratedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentFilter, setCommentFilter] = useState("all"); // all | spoiler
  const [commentSearch, setCommentSearch] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotal, setCommentTotal] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    commentsToday: 0, // ← tambah ini
    readsToday: 0, // ← tambah ini
    totalComments: 0, // ← opsional (untuk sub-label)
    totalReads: 0,
  });

  // users table
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // premium requests
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [sourceHealth, setSourceHealth] = useState<SourceHealth | null>(null);
  const [sourceHealthLoading, setSourceHealthLoading] = useState(false);
  const [healthNotice, setHealthNotice] = useState("");
  const [imageProxyTestUrl, setImageProxyTestUrl] = useState("");
  const [cacheSourcePath, setCacheSourcePath] = useState("/api/source/sekte/pustaka?page=1");
  const [chapterRefreshPath, setChapterRefreshPath] = useState(
    "/chapter/komiku/solo-leveling-chapter-152",
  );
  const [chapterRefreshLoading, setChapterRefreshLoading] = useState(false);
  const [activityToday, setActivityToday] = useState<ActivityToday>({
    recent: [],
    topChapters: [],
    topUsers: [],
  });
  const [activityLoading, setActivityLoading] = useState(false);
  const [eventWinners, setEventWinners] = useState<TitleRushWinner[]>([]);
  const [eventWeekStart, setEventWeekStart] = useState("");
  const [eventCurrentWeek, setEventCurrentWeek] = useState("");
  const [eventWeeks, setEventWeeks] = useState<string[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventAwarding, setEventAwarding] = useState(false);
  const [eventDeleting, setEventDeleting] = useState(false);
  const [eventNotice, setEventNotice] = useState("");
  const [eventDebugAward, setEventDebugAward] = useState(false);
  const [titleRushEnabled, setTitleRushEnabled] = useState(true);
  const [titleRushStatusLoading, setTitleRushStatusLoading] = useState(false);

  // ── init ──────────────────────────────────────────────────────────────
  const init = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") return setLoading(false);

    setAdminUser({ ...user, ...profile });
    setAuthed(true);
    await Promise.all([fetchStats(), fetchPendingCount()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      let query = supabase
        .from("comments")
        .select(
          "id, content, slug, chapter, author_name, avatar_url, created_at, is_spoiler, user_id",
          { count: "exact" },
        );

      if (commentFilter === "spoiler") query = query.eq("is_spoiler", true);
      if (commentSearch.trim())
        query = query.ilike("content", `%${commentSearch.trim()}%`);

      query = query
        .order("created_at", { ascending: false })
        .range((commentPage - 1) * PER_PAGE, commentPage * PER_PAGE - 1);

      const { data, count } = await query;
      setComments(data ?? []);
      setCommentTotal(count ?? 0);
    } finally {
      setCommentsLoading(false);
    }
  }, [commentPage, commentFilter, commentSearch]);

  useEffect(() => {
    if (authed && page === "comments") fetchComments();
  }, [authed, page, fetchComments]);

  async function deleteComment(id: string) {
    if (!confirm("Hapus komentar ini?")) return;
    setDeleteLoading(id);
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) {
        alert("Gagal hapus: " + error.message);
        return;
      }
      await fetchComments();
    } finally {
      setDeleteLoading(null);
    }
  }

  // ── stats ─────────────────────────────────────────────────────────────
  async function fetchStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [
      { count: totalUsers },
      { count: premiumUsers },
      { count: commentsToday },
      { count: totalComments },
      { count: readsToday },
      { count: totalReads },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),

      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_premium", true),

      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO),

      supabase.from("comments").select("id", { count: "exact", head: true }),

      supabase
        .from("user_reads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayISO),

      supabase.from("user_reads").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: totalUsers ?? 0,
      premiumUsers: premiumUsers ?? 0,
      commentsToday: commentsToday ?? 0,
      totalComments: totalComments ?? 0,
      readsToday: readsToday ?? 0,
      totalReads: totalReads ?? 0,
    });
  }

  const fetchActivityToday = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    setActivityLoading(true);

    try {
      const { data } = await supabase
        .from("user_reads")
        .select("id, user_id, chapter_slug, created_at")
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(80);

      const reads = data || [];
      const userIds = Array.from(new Set(reads.map((read) => read.user_id).filter(Boolean)));
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

      const chapterCounts = new Map<string, number>();
      const userCounts = new Map<string, number>();
      for (const read of reads) {
        if (!read.chapter_slug || !read.user_id) continue;
        chapterCounts.set(read.chapter_slug, (chapterCounts.get(read.chapter_slug) || 0) + 1);
        userCounts.set(read.user_id, (userCounts.get(read.user_id) || 0) + 1);
      }

      setActivityToday({
        recent: reads.slice(0, 6).map((read) => ({
          ...read,
          profile: profileMap.get(read.user_id),
        })),
        topChapters: Array.from(chapterCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([slug, count]) => ({ slug, count })),
        topUsers: Array.from(userCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([userId, count]) => ({
            userId,
            count,
            profile: profileMap.get(userId),
          })),
      });
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && page === "dashboard") fetchActivityToday();
  }, [authed, page, fetchActivityToday]);

  const fetchEventWinners = useCallback(async (weekStart?: string) => {
    setEventLoading(true);
    setEventNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setEventNotice("Login admin diperlukan.");
        return;
      }

      const selectedWeek = weekStart || eventWeekStart;
      const endpoint = selectedWeek
        ? `/api/admin/title-rush-rewards?week_start=${encodeURIComponent(selectedWeek)}`
        : "/api/admin/title-rush-rewards";
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        setEventNotice(json?.error || "Gagal mengambil pemenang.");
        return;
      }

      setEventWinners(Array.isArray(json?.winners) ? json.winners : []);
      setEventWeeks(Array.isArray(json?.weeks) ? json.weeks : []);
      setEventWeekStart(json?.weekStart || json?.week_start || "");
      setEventCurrentWeek(json?.current_week || "");
    } catch (error) {
      setEventNotice(error instanceof Error ? error.message : "Gagal mengambil pemenang.");
    } finally {
      setEventLoading(false);
    }
  }, [eventWeekStart]);

  const fetchTitleRushStatus = useCallback(async () => {
    setTitleRushStatusLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/admin/title-rush-status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();

      if (res.ok) {
        setTitleRushEnabled(json?.enabled !== false);
      } else if (json?.error) {
        setEventNotice(json.error);
      }
    } finally {
      setTitleRushStatusLoading(false);
    }
  }, []);

  const toggleTitleRushStatus = useCallback(async () => {
    setTitleRushStatusLoading(true);
    setEventNotice("");
    try {
      const nextEnabled = !titleRushEnabled;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setEventNotice("Login admin diperlukan.");
        return;
      }

      const res = await fetch("/api/admin/title-rush-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const json = await res.json();

      if (!res.ok) {
        setEventNotice(json?.error || "Gagal update status event.");
        return;
      }

      setTitleRushEnabled(json?.enabled !== false);
      setEventNotice(json?.message || "Status event diperbarui.");
    } catch (error) {
      setEventNotice(error instanceof Error ? error.message : "Gagal update status event.");
    } finally {
      setTitleRushStatusLoading(false);
    }
  }, [titleRushEnabled]);

  const selectEventWeek = useCallback((weekStart: string) => {
    setEventWeekStart(weekStart);
    void fetchEventWinners(weekStart);
  }, [fetchEventWinners]);

  const awardEventWinners = useCallback(async () => {
    setEventAwarding(true);
    setEventNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setEventNotice("Login admin diperlukan.");
        return;
      }

      const res = await fetch("/api/admin/title-rush-rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week_start: eventWeekStart,
          debug: eventDebugAward,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setEventNotice(json?.error || "Gagal memberi hadiah.");
        return;
      }

      setEventNotice(json?.message || "Hadiah berhasil diberikan.");
      setEventWinners(Array.isArray(json?.awarded) ? json.awarded : []);
      setEventWeeks(Array.isArray(json?.weeks) ? json.weeks : eventWeeks);
      setEventWeekStart(json?.week_start || eventWeekStart);
      setEventCurrentWeek(json?.current_week || eventCurrentWeek);
      await fetchStats();
    } catch (error) {
      setEventNotice(error instanceof Error ? error.message : "Gagal memberi hadiah.");
    } finally {
      setEventAwarding(false);
    }
  }, [eventCurrentWeek, eventDebugAward, eventWeekStart, eventWeeks]);

  const deleteCurrentEventWeek = useCallback(async () => {
    setEventDeleting(true);
    setEventNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setEventNotice("Login admin diperlukan.");
        return;
      }

      const res = await fetch("/api/admin/title-rush-rewards", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ week_start: eventWeekStart }),
      });
      const json = await res.json();

      if (!res.ok) {
        setEventNotice(json?.error || "Gagal menghapus leaderboard.");
        return;
      }

      setEventWinners([]);
      setEventWeeks(Array.isArray(json?.weeks) ? json.weeks : eventWeeks);
      setEventWeekStart(json?.week_start || eventWeekStart);
      setEventCurrentWeek(json?.current_week || eventCurrentWeek);
      setEventNotice(json?.message || "Data leaderboard minggu ini dihapus.");
    } catch (error) {
      setEventNotice(error instanceof Error ? error.message : "Gagal menghapus leaderboard.");
    } finally {
      setEventDeleting(false);
    }
  }, [eventCurrentWeek, eventWeekStart, eventWeeks]);

  useEffect(() => {
    if (authed && page === "events") void fetchEventWinners();
  }, [authed, page, fetchEventWinners]);

  useEffect(() => {
    if (authed && page === "events") void fetchTitleRushStatus();
  }, [authed, page, fetchTitleRushStatus]);

  // ── pending count untuk badge notif ───────────────────────────────────
  async function fetchPendingCount() {
    const { count } = await supabase
      .from("premium_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingCount(count ?? 0);
  }

  // ── users table ───────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select(
          "id, username, avatar_url, is_premium, level, xp, created_at, premium_until",
          { count: "exact" },
        );

      if (filter === "premium") query = query.eq("is_premium", true);
      if (filter === "reguler") query = query.eq("is_premium", false);
      if (search.trim()) query = query.ilike("username", `%${search.trim()}%`);

      query = query
        .order("created_at", { ascending: false })
        .range((userPage - 1) * PER_PAGE, userPage * PER_PAGE - 1);

      const { data, count } = await query;
      setUsers(data ?? []);
      setUserTotal(count ?? 0);
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, filter, search]);

  useEffect(() => {
    if (authed && page === "users") fetchUsers();
  }, [authed, page, fetchUsers]);

  // ── premium requests — JOIN dengan profiles untuk username & avatar ────
  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      let query = supabase
        .from("premium_requests")
        .select("*, profiles(username, avatar_url)")
        .order("created_at", { ascending: false });

      if (requestFilter !== "all") query = query.eq("status", requestFilter);

      const { data } = await query;
      setRequests(data ?? []);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestFilter]);

  useEffect(() => {
    if (authed && page === "requests") fetchRequests();
  }, [authed, page, fetchRequests]);

  const fetchSourceHealth = useCallback(async () => {
    setSourceHealthLoading(true);
    try {
      const res = await fetch("/api/source-health", { cache: "no-store" });
      const json = await res.json();
      setSourceHealth(json);
    } catch (err) {
      setSourceHealth({
        checkedAt: new Date().toISOString(),
        degraded: 1,
        sources: [],
        error: err instanceof Error ? err.message : "Gagal mengecek source",
      });
    } finally {
      setSourceHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && page === "source-health") fetchSourceHealth();
  }, [authed, page, fetchSourceHealth]);

  const copyText = useCallback(async (text: string, message = "Disalin") => {
    try {
      await navigator.clipboard.writeText(text);
      setHealthNotice(message);
      setTimeout(() => setHealthNotice(""), 1800);
    } catch {
      setHealthNotice("Gagal menyalin");
      setTimeout(() => setHealthNotice(""), 1800);
    }
  }, []);

  const copyHealthReport = useCallback(() => {
    if (!sourceHealth) return;
    copyText(JSON.stringify(sourceHealth, null, 2), "Report disalin");
  }, [sourceHealth, copyText]);

  const openSourceEndpoint = useCallback((endpoint?: string) => {
    if (!endpoint) return;
    window.open(endpoint, "_blank", "noopener,noreferrer");
  }, []);

  const openImageProxyTest = useCallback(() => {
    const url = imageProxyTestUrl.trim();
    if (!url) return;
    window.open(
      `/api/image?url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [imageProxyTestUrl]);

  const openCacheSourceTest = useCallback(() => {
    if (!cacheSourcePath.trim()) return;
    window.open(cacheSourcePath.trim(), "_blank", "noopener,noreferrer");
  }, [cacheSourcePath]);

  const refreshChapterCache = useCallback(async () => {
    const path = chapterRefreshPath.trim();
    if (!path) return;

    setChapterRefreshLoading(true);
    setHealthNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setHealthNotice("Login admin diperlukan.");
        return;
      }

      const res = await fetch("/api/admin/revalidate-chapter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path }),
      });
      const json = await res.json();

      if (!res.ok) {
        setHealthNotice(json?.error || "Gagal refresh cache.");
        return;
      }

      setHealthNotice(json?.message || "Cache chapter di-refresh.");
    } catch (error) {
      setHealthNotice(error instanceof Error ? error.message : "Gagal refresh cache.");
    } finally {
      setChapterRefreshLoading(false);
      setTimeout(() => setHealthNotice(""), 2200);
    }
  }, [chapterRefreshPath]);

  const handleRequestAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id + action);
    const status = action === "approve" ? "approved" : "rejected";

    await supabase
      .from("premium_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (action === "approve") {
      const req = requests.find((r) => r.id === id);
      if (req?.user_id) {
        const premiumUntil = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();

        await supabase
          .from("profiles")
          .update({ is_premium: true, premium_until: premiumUntil })
          .eq("id", req.user_id);

        // 🔥 TAMBAH INI — kirim notif ke user
        await supabase.from("notifications").insert({
          user_id: req.user_id,
          actor_id: req.user_id,
          actor_name: "Admin",
          type: "premium_activated",
          slug: null,
          target_id: null,
        });
      }
    }

    await Promise.all([fetchRequests(), fetchPendingCount(), fetchStats()]);
    setActionLoading(null);
  };

  // ── premium actions ───────────────────────────────────────────────────
  async function givePremium(userId: string, days = 30) {
    try {
      const safeDays = Math.max(1, Math.min(3650, Math.floor(Number(days) || 30)));
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("premium_until")
        .eq("id", userId)
        .single();

      if (profileError) {
        alert(`Error: ${profileError.message}`);
        return;
      }

      const currentUntil = profile?.premium_until
        ? new Date(profile.premium_until)
        : null;
      const baseDate =
        currentUntil && currentUntil.getTime() > Date.now()
          ? currentUntil
          : new Date();
      const premiumUntil = new Date(
        baseDate.getTime() + safeDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: true, premium_until: premiumUntil })
        .eq("id", userId);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      await Promise.all([fetchUsers(), fetchStats()]);
      alert(`Premium ${safeDays} hari berhasil ditambahkan.`);
    } catch (err) {
      alert("Gagal memberikan premium");
    }
  }

  async function removePremium(userId: string) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: false, premium_until: null })
        .eq("id", userId);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      await Promise.all([fetchUsers(), fetchStats()]);
      alert("✅ Premium dihapus!");
    } catch (err) {
      alert("❌ Gagal hapus premium");
    }
  }

  // ── premium codes ─────────────────────────────────────────────────────
  async function fetchPremiumCodes() {
    setCodesLoading(true);
    try {
      const { data } = await supabase
        .from("premium_codes")
        .select("id, code, used, duration_days, created_at, used_at, used_by")
        .order("created_at", { ascending: false });
      setPremiumCodes(data || []);
    } finally {
      setCodesLoading(false);
    }
  }

  async function generateCode() {
    await supabase.rpc("generate_premium_code", {
      p_duration_days: codeDays,
      p_prefix: "RYUKO",
    });
    fetchPremiumCodes();
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  async function deleteCode(id: string) {
    if (confirm("Hapus kode ini?")) {
      await supabase.from("premium_codes").delete().eq("id", id);
      fetchPremiumCodes();
    }
  }

  useEffect(() => {
    if (authed && page === "codes") fetchPremiumCodes();
  }, [authed, page]);

  // ── guards ────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/30 font-medium">
            Memuat dashboard...
          </p>
        </div>
      </div>
    );

  if (!authed)
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiShield size={28} className="text-red-400" />
          </div>
          <p className="text-white font-bold text-lg">Akses Ditolak</p>
          <p className="text-white/40 text-sm mt-1">
            Halaman ini hanya untuk admin.
          </p>
        </div>
      </div>
    );

  const totalPages = Math.max(1, Math.ceil(userTotal / PER_PAGE));
  const setDashboardPage = (nextPage: string) => {
    if (
      nextPage === "dashboard" ||
      nextPage === "users" ||
      nextPage === "requests" ||
      nextPage === "source-health" ||
      nextPage === "comments" ||
      nextPage === "events" ||
      nextPage === "codes"
    ) {
      setPage(nextPage);
    }
  };
  const navItems: Array<{
    id: DashboardPage;
    icon: React.ReactNode;
    label: string;
  }> = [
    { id: "dashboard", icon: <FiHome size={18} />, label: "Dashboard" },
    { id: "users", icon: <FiUsers size={18} />, label: "User" },
    {
      id: "requests",
      icon: (
        <div className="relative">
          <FiBell size={18} />
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#7c5cfc] rounded-full text-[8px] font-bold text-white flex items-center justify-center">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </div>
      ),
      label: "Request",
    },
    {
      id: "source-health",
      icon: <FiActivity size={18} />,
      label: "Health",
    },
    {
      id: "comments",
      icon: <FiMessageCircle size={18} />,
      label: "Komentar",
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0c0c10] text-white"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* ── TOPBAR ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0c0c10]/95 backdrop-blur border-b border-white/[.06]">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-bold text-[15px]">Ryukomik</span>
          <span className="text-[9px] font-bold bg-[#7c5cfc] text-white px-1.5 py-0.5 rounded ml-1">
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPage("requests");
            }}
            className="relative w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <FiBell size={14} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#7c5cfc] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
          >
            <FiLogOut size={13} />
          </button>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="px-4 py-4 pb-24 space-y-4">
        {/* ══ DASHBOARD PAGE ══ */}
        {page === "dashboard" && (
          <DashboardHomeTab
            adminUser={adminUser}
            stats={stats}
            activityToday={activityToday}
            activityLoading={activityLoading}
            fetchActivityToday={fetchActivityToday}
            pendingCount={pendingCount}
            setPage={setDashboardPage}
            setFilter={setFilter}
          />
        )}
        {/* ══ USERS PAGE ══ */}
        {page === "source-health" && (
          <SourceHealthTab
            sourceHealth={sourceHealth}
            sourceHealthLoading={sourceHealthLoading}
            healthNotice={healthNotice}
            imageProxyTestUrl={imageProxyTestUrl}
            setImageProxyTestUrl={setImageProxyTestUrl}
            cacheSourcePath={cacheSourcePath}
            setCacheSourcePath={setCacheSourcePath}
            chapterRefreshPath={chapterRefreshPath}
            setChapterRefreshPath={setChapterRefreshPath}
            chapterRefreshLoading={chapterRefreshLoading}
            fetchSourceHealth={fetchSourceHealth}
            copyHealthReport={copyHealthReport}
            openImageProxyTest={openImageProxyTest}
            openCacheSourceTest={openCacheSourceTest}
            refreshChapterCache={refreshChapterCache}
            openSourceEndpoint={openSourceEndpoint}
            copyText={copyText}
          />
        )}
        {page === "users" && (
          <UsersTab
            users={users}
            userTotal={userTotal}
            userPage={userPage}
            totalPages={totalPages}
            filter={filter}
            search={search}
            usersLoading={usersLoading}
            fetchUsers={fetchUsers}
            setFilter={setFilter}
            setSearch={setSearch}
            setUserPage={setUserPage}
            givePremium={givePremium}
            removePremium={removePremium}
          />
        )}
        {/* ══ CODES PAGE ══ */}
        {page === "codes" && (
          <PremiumCodesTab
            premiumCodes={premiumCodes}
            codeDays={codeDays}
            codesLoading={codesLoading}
            copied={copied}
            setCodeDays={setCodeDays}
            fetchPremiumCodes={fetchPremiumCodes}
            generateCode={generateCode}
            deleteCode={deleteCode}
            copyToClipboard={copyToClipboard}
          />
        )}
        {/* ══ REQUESTS PAGE ══ */}
        {page === "requests" && (
          <RequestsTab
            requests={requests}
            requestsLoading={requestsLoading}
            requestFilter={requestFilter}
            actionLoading={actionLoading}
            fetchRequests={fetchRequests}
            setRequestFilter={setRequestFilter}
            setProofModal={setProofModal}
            handleRequestAction={handleRequestAction}
          />
        )}
        {/* ══ COMMENTS PAGE ══ */}
        {page === "events" && (
          <EventRewardsTab
            winners={eventWinners}
            weekStart={eventWeekStart}
            currentWeek={eventCurrentWeek}
            weeks={eventWeeks}
            loading={eventLoading}
            awarding={eventAwarding}
            deleting={eventDeleting}
            debugAward={eventDebugAward}
            notice={eventNotice}
            eventEnabled={titleRushEnabled}
            statusLoading={titleRushStatusLoading}
            fetchWinners={fetchEventWinners}
            awardWinners={awardEventWinners}
            deleteCurrentWeek={deleteCurrentEventWeek}
            selectWeek={selectEventWeek}
            setDebugAward={setEventDebugAward}
            toggleEventEnabled={toggleTitleRushStatus}
          />
        )}
        {page === "comments" && (
          <CommentsModerationTab
            comments={comments}
            commentsLoading={commentsLoading}
            commentFilter={commentFilter}
            commentSearch={commentSearch}
            commentPage={commentPage}
            commentTotal={commentTotal}
            deleteLoading={deleteLoading}
            fetchComments={fetchComments}
            setCommentFilter={setCommentFilter}
            setCommentSearch={setCommentSearch}
            setCommentPage={setCommentPage}
            deleteComment={deleteComment}
          />
        )}
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0f0f14]/95 backdrop-blur border-t border-white/[.07] flex z-30">
        {navItems.map((nav) => (
          <button
            key={nav.id}
            onClick={() => setPage(nav.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${page === nav.id ? "text-[#7c5cfc]" : "text-white/25 hover:text-white/50"}`}
          >
            {nav.icon}
            <span className="text-[10px] font-semibold">{nav.label}</span>
          </button>
        ))}
      </nav>

      {/* ── MODAL FOTO BUKTI ── */}
      {proofModal && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setProofModal(null)}
        >
          <div
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={proofModal}
              alt="Bukti bayar"
              className="w-full rounded-2xl"
            />
            <button
              onClick={() => setProofModal(null)}
              className="mt-3 w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
