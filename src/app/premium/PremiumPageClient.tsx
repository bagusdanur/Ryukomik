"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ChangeEvent } from "react";
import {
  FiCheck,
  FiX,
  FiZap,
  FiUpload,
  FiLoader,
  FiRefreshCw,
  FiMessageSquare,
  FiChevronRight,
  FiChevronLeft,
  FiAlertTriangle,
} from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { TbLayersLinked, TbBadge } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlineDownloadForOffline, MdOutlineOndemandVideo } from "react-icons/md";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";
import LoginModal from "@/components/LoginModal";
import SkPremiumModal from "@/components/SkPremiumModal";
import Button from "@/components/Button";

const features = [
  {
    icon: <MdOutlineDownloadForOffline size={16} />,
    title: "Download Komik",
    desc: "Simpan chapter favorit buat dibaca offline",
    basic: "5 / Hari",
    premium: "Unlimited",
  },
  {
    icon: <FiZap size={15} />,
    title: "Tanpa Iklan",
    desc: "Baca lebih fokus tanpa gangguan iklan",
    basic: null,
    premium: "Bersih",
  },
  {
    icon: <MdOutlineOndemandVideo size={16} />,
    title: "Server RYU-LOKAL",
    desc: "Akses player super cepat (HD) & tanpa jeda iklan",
    basic: null,
    premium: "Bebas Iklan",
  },
  {
    icon: <TbLayersLinked size={16} />,
    title: "Batch Download",
    desc: "Gratis bisa download satuan; Premium hingga 5 chapter sekaligus",
    basic: null,
    premium: "5 Chapter",
  },
  {
    icon: <TbBadge size={16} />,
    title: "VIP Badge",
    desc: "Badge VIP konsisten di komentar dan leaderboard",
    basic: null,
    premium: "Eksklusif",
  },
  {
    icon: <FiRefreshCw size={15} />,
    title: "Auto Sync Backup",
    desc: "History dan data baca dicadangkan otomatis",
    basic: null,
    premium: "6 Jam",
  },
  {
    icon: <FiMessageSquare size={15} />,
    title: "Komentar Eksklusif",
    desc: "Card komentar VIP pakai background GIF khusus",
    basic: null,
    premium: "VIP Style",
  },
];

const premiumPlans = [
  {
    id: "1m",
    name: "1 Bulan",
    durationDays: 30,
    amount: 10000,
    qrisSrc: "/qris10k.jpeg",
    badge: "Harga Normal",
    badgeClass: "bg-white/[0.06] text-white/40 border border-white/[0.08]",
    note: "Coba Premium",
  },
  {
    id: "3m",
    name: "3 Bulan",
    durationDays: 90,
    amount: 25000,
    qrisSrc: "/qris25.jpeg",
    badge: "Hemat 17%",
    badgeClass: "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20",
    note: "Lebih praktis",
    subtext: "≈ Rp 8.333/bulan",
  },
  {
    id: "6m",
    name: "6 Bulan",
    durationDays: 180,
    amount: 45000,
    qrisSrc: "/qris45k.jpeg",
    badge: "Hemat 25%",
    badgeClass: "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20",
    note: "Aktif lebih lama",
    subtext: "≈ Rp 7.500/bulan",
  },
];

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

type PremiumProfile = {
  username?: string | null;
  avatar_url?: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
};

type ImgBbResponse = {
  success?: boolean;
  data?: {
    url?: string;
  };
};

function StepIndicator({ step }: { step: number }) {
  const steps = ["Bayar", "Upload", "Konfirmasi"];
  return (
    <div className="flex items-center justify-center gap-1 mb-4 select-none">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isDone = idx < step;
        const isActive = idx === step;
        return (
          <div key={idx} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                  isDone
                    ? "bg-[#5DCAA5]/20 text-[#5DCAA5]"
                    : isActive
                    ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/30 animate-pulse"
                    : "bg-white/[0.06] text-white/25"
                }`}
              >
                {isDone ? <FiCheck size={10} /> : idx}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                  isDone
                    ? "text-[#5DCAA5]/80"
                    : isActive
                    ? "text-cyan-200"
                    : "text-white/20"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-[1px] w-8 mb-3 transition-colors duration-300 ${
                  isDone ? "bg-[#5DCAA5]/40" : "bg-white/[0.08]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PremiumPage() {
  const { user } = useSupabaseUser();
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showQrisPreview, setShowQrisPreview] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(premiumPlans[0].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isSkAgreed, setIsSkAgreed] = useState(false);
  const [showSkModal, setShowSkModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Pending request states
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isCheckingPending, setIsCheckingPending] = useState(false);

  // user profile state
  const [profile, setProfile] = useState<PremiumProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      const data = await loadCachedProfile(user.id);
      setProfile(data);
      setProfileLoading(false);
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    async function checkPending() {
      if (!user) {
        setHasPendingRequest(false);
        return;
      }
      setIsCheckingPending(true);
      try {
        const { data } = await supabase
          .from("premium_requests")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .limit(1);

        if (data && data.length > 0) {
          setHasPendingRequest(true);
        } else {
          setHasPendingRequest(false);
        }
      } catch (e) {
        console.error("Error checking pending request", e);
      } finally {
        setIsCheckingPending(false);
      }
    }
    if (showModal) {
      checkPending();
    }
  }, [user, showModal]);

  // hitung sisa hari premium
  const premiumDaysLeft = useMemo(() => {
    if (!profile?.premium_until) return null;
    const diff = new Date(profile.premium_until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile?.premium_until]);

  const isActivePremium = isActivePremiumProfile(profile);
  const selectedPlan =
    premiumPlans.find((plan) => plan.id === selectedPlanId) || premiumPlans[0];

  const doClose = () => {
    if (preview) URL.revokeObjectURL(preview);
    setShowModal(false);
    setShowQrisPreview(false);
    setFile(null);
    setPreview(null);
    setError("");
    setSuccess(false);
    setIsSkAgreed(false);
    setStep(1);
    setShowCloseConfirm(false);
  };

  const handleCloseRequest = () => {
    if (file && !success) {
      setShowCloseConfirm(true);
      return;
    }
    doClose();
  };

  const handleActivatePremium = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setStep(1);
    setShowModal(true);
  };

  const handleFile = (f: File) => {
    if (!allowedImageTypes.includes(f.type)) {
      setError("File harus berupa JPG, PNG, atau WebP");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File max 5MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowLogin(true);
      setError("Silakan login terlebih dahulu");
      return;
    }
    if (hasPendingRequest) {
      setError("Anda masih memiliki request premium yang menunggu konfirmasi.");
      return;
    }
    if (!file) {
      setError("Upload bukti transfer dulu");
      return;
    }
    if (!isSkAgreed) {
      setError("Anda harus menyetujui Syarat & Ketentuan terlebih dahulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const imgRes = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`,
        { method: "POST", body: formData }
      );
      const imgData = (await imgRes.json()) as ImgBbResponse;
      if (!imgData.success || !imgData.data?.url) {
        throw new Error("Upload gambar gagal. Coba format lain atau kompres file.");
      }
      const { error: dbErr } = await supabase.from("premium_requests").insert({
        user_id: user.id,
        name: profile?.username || user.email || "User",
        proof_url: imgData.data.url,
        package_name: selectedPlan.name,
        duration_days: selectedPlan.durationDays,
        amount: selectedPlan.amount,
        sk_agreed: true,
        sk_agreed_at: new Date().toISOString(),
      });
      if (dbErr) throw new Error(dbErr.message);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const goToStep2 = () => {
    setError("");
    setStep(2);
  };

  const goToStep3 = () => {
    if (!file) {
      setError("Upload bukti transfer dulu di Step 2!");
      return;
    }
    setError("");
    setStep(3);
  };

  return (
    <>
      <div className="rk-page px-4 pb-24 pt-20 text-white">
        {/* Heading */}
        <div className="max-w-xl mx-auto text-center mb-8">
          <div className="rk-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest">
            <RiVipCrownLine size={13} />
            Premium
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Pilih Paket Kamu
          </h1>
          <p className="text-sm text-white/40">
            Upgrade ke Premium untuk pengalaman baca yang lebih seru
          </p>

          {/* Status Premium User */}
          {!profileLoading && profile && (
            <div
              className={`mt-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-sm font-semibold ${
                isActivePremium
                  ? "bg-[var(--accent-2)]/10 border-[var(--accent-2)]/30 text-[var(--accent-2)]"
                  : "bg-white/[0.04] border-white/10 text-white/40"
              }`}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username || "Avatar"}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)]/30 flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                  {profile.username?.slice(0, 2)?.toUpperCase() || "??"}
                </div>
              )}
              <span>{profile.username}</span>
              {isActivePremium ? (
                <>
                  <RiVipCrownLine size={14} />
                  <span>
                    Premium
                    {premiumDaysLeft !== null
                      ? ` · ${premiumDaysLeft} hari lagi`
                      : " · Aktif"}
                  </span>
                </>
              ) : (
                <span>· Belum Premium</span>
              )}
            </div>
          )}
        </div>

        {/* 2 Cards */}
        <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ── BASIC CARD ── */}
          <div className="rk-card-soft flex flex-col rounded-3xl p-5">
            <div className="mb-5">
              <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">
                Basic
              </div>
              <div className="text-2xl font-black text-white">Gratis</div>
              <div className="text-xs text-white/30 mt-1 font-medium">
                Tanpa biaya apapun
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {f.basic === null ? (
                      <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
                        <FiX size={10} className="text-white/20" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                        <FiCheck size={10} className="text-white/50" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium leading-tight ${f.basic === null ? "text-white/25 line-through" : "text-white/70"}`}
                    >
                      {f.title}
                    </div>
                    <div className="text-xs text-white/25 mt-0.5 font-normal leading-normal">
                      {f.basic === null ? f.desc : f.basic}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled
              className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-white/30 cursor-not-allowed border border-white/[0.06] min-h-[44px]"
            >
              Paket Aktif
            </button>
          </div>

          {/* ── PREMIUM CARD ── */}
          <div className="rk-card relative flex flex-col overflow-hidden rounded-3xl p-5">
            <div className="absolute left-0 right-0 top-0 h-[2px] bg-[var(--accent)] rounded-t-2xl" />

            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-1">
                <RiVipCrownLine size={13} className="text-cyan-200" />
                <div className="text-xs font-bold text-cyan-200 uppercase tracking-widest">
                  Premium
                </div>
              </div>
              <div className="text-2xl font-black text-white">Premium Akses</div>
              <div className="text-xs text-white/30 mt-1 font-medium">
                Dari Admin atau Support
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <div className="w-4 h-4 rounded-full bg-cyan-400/15 flex items-center justify-center">
                      <FiCheck size={10} className="text-cyan-200" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white leading-tight">
                      {f.title}
                    </div>
                    <div className="text-xs text-white/35 mt-0.5 font-normal leading-normal">
                      {f.desc}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200/80 mt-1">
                      {f.premium}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06] mt-5 pt-4">
              <div className="mb-4">
                <div className="text-xs text-white/30 mb-3 font-semibold">
                  Pilih paket
                </div>
                <div className="grid gap-2">
                  {premiumPlans.map((plan) => {
                    const active = selectedPlan.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition-all min-h-[44px] cursor-pointer ${
                          active
                            ? "border-cyan-200/50 bg-cyan-400/10"
                            : "border-white/[0.07] bg-white/[0.025] hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-white">
                                {plan.name}
                              </span>
                              {plan.badge && (
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${plan.badgeClass || 'bg-cyan-400/12 text-cyan-200'}`}>
                                  {plan.badge}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[11px] text-white/30 font-medium">
                              {plan.durationDays} hari - {plan.note}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-black text-white">
                              {formatRupiah(plan.amount)}
                            </div>
                            {plan.subtext && (
                              <div className="text-[10px] text-white/40 mt-0.5 font-medium">
                                {plan.subtext}
                              </div>
                            )}
                            <div className="text-[10px] text-white/30 mt-0.5 font-medium">
                              via QRIS
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-xs text-white/30 mb-1 font-semibold">
                    Paket dipilih
                  </div>
                  <div className="text-3xl font-black text-white">
                    {formatRupiah(selectedPlan.amount)}
                  </div>
                  <div className="text-xs text-white/30 mt-1 font-medium">
                    {selectedPlan.name} - {selectedPlan.durationDays} hari
                  </div>
                </div>
                <div className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                  selectedPlan.id === "1m"
                    ? "bg-white/[0.06] text-white/40 border border-white/[0.08]"
                    : "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20"
                }`}>
                  {selectedPlan.id === "1m" ? "Tanpa Diskon" : selectedPlan.badge}
                </div>
              </div>
              {isActivePremium ? (
                <div className="w-full py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center gap-2 min-h-[44px]">
                  <RiVipCrownLine size={15} />
                  Aktif
                  {premiumDaysLeft !== null
                    ? ` · ${premiumDaysLeft} hari lagi`
                    : " · Premium"}
                </div>
              ) : (
                <Button
                  onClick={handleActivatePremium}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold min-h-[44px] cursor-pointer"
                >
                  <HiOutlineSparkles size={15} />
                  Aktifkan Premium
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── BANNER LAPOR MASALAH ── */}
        <div className="max-w-xl mx-auto mt-6">
          <a
            href="https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV"
            target="_blank"
            rel="noopener noreferrer"
            className="rk-card-soft group flex items-center gap-3 rounded-2xl px-4 py-3.5 hover:border-cyan-200/20"
          >
            <div className="w-9 h-9 rounded-xl bg-[#25d366]/15 flex items-center justify-center shrink-0 group-hover:bg-[#25d366]/25 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">
                Ada masalah? Lapor di sini
              </p>
              <p className="text-[11px] text-white/30 truncate">
                Gabung grup WhatsApp support kami
              </p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-white/20 group-hover:text-[#25d366] shrink-0"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        </div>

        <p className="text-center text-xs text-white/20 mt-4 mb-2">
          Dapatkan kode premium di Dashboard Admin atau hubungi support
        </p>
      </div>

      {/* ── MODAL UTAMA DENGAN STEPPER (z-[60] & responsive bottom-sheet/center) ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 px-0 sm:px-4 pb-0 pt-4 backdrop-blur-sm"
          onClick={handleCloseRequest}
        >
          <div
            className="rk-card relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] flex flex-col animate-[slideUp_0.3s_ease-out] pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal handle bar untuk mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            {/* Tombol close interaktif (touch target besar) */}
            <button
              onClick={handleCloseRequest}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all z-10 cursor-pointer"
              aria-label="Tutup"
            >
              <FiX size={18} className="text-white/60" />
            </button>

            {/* Body Modal */}
            <div className="overflow-y-auto px-6 pb-6 pt-4 flex-1">
              {success ? (
                /* ── Tampilan Sukses Pembayaran ── */
                <div className="flex flex-col items-center text-center py-6 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-[#5DCAA5]/15 flex items-center justify-center mb-4">
                    <FiCheck size={32} className="text-[#5DCAA5]" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">
                    Bukti Terkirim!
                  </h2>
                  <p className="text-sm text-white/40 leading-relaxed mb-1">
                    Admin akan memverifikasi pembayaran Anda dalam 1×24 jam. Akun kamu otomatis aktif setelah disetujui.
                  </p>
                  <p className="text-xs text-cyan-300/80 font-bold mb-6">
                    Anda bisa mengecek status aktivasi di Halaman Profil.
                  </p>
                  <div className="w-full flex flex-col gap-2">
                    <a
                      href="/setting"
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-cyan-400/15 border border-cyan-400/20 text-cyan-200 text-center block min-h-[44px] cursor-pointer hover:bg-cyan-400/25 active:scale-[0.99] transition-all"
                    >
                      Lihat Profil
                    </a>
                    <button
                      onClick={doClose}
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-[var(--accent)] hover:brightness-110 active:scale-[0.99] transition-all text-white min-h-[44px] cursor-pointer"
                    >
                      Oke, Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Title & Info */}
                  <div className="mb-4 pr-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <RiVipCrownLine size={14} className="text-cyan-200" />
                      <span className="text-[10px] font-black text-cyan-200 uppercase tracking-widest">
                        Langkah {step} dari 3
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white leading-snug">
                      {step === 1 ? "Scan QRIS & Transfer" : step === 2 ? "Upload Bukti Pembayaran" : "Konfirmasi Pembelian"}
                    </h2>
                  </div>

                  {/* Stepper indicator */}
                  <StepIndicator step={step} />

                  {/* ──────────────── STEP 1: BAYAR ──────────────── */}
                  {step === 1 && (
                    <div className="animate-fadeIn space-y-4">
                      {/* Compact Plan Selector inside Modal */}
                      <div>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2">
                          Ganti Paket Pilihan
                        </span>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {premiumPlans.map((plan) => {
                            const active = selectedPlan.id === plan.id;
                            return (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition-all min-h-[44px] cursor-pointer ${
                                  active
                                    ? "border-cyan-200/50 bg-cyan-400/10"
                                    : "border-white/[0.07] bg-white/[0.025] hover:border-white/15"
                                }`}
                              >
                                <div className="text-xs font-black text-white">{plan.name}</div>
                                <div className="text-[10px] font-bold text-white/50 mt-0.5">
                                  {formatRupiah(plan.amount)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Info Summary */}
                      <div className="rounded-2xl border border-cyan-200/15 bg-cyan-400/[0.05] p-3 flex justify-between items-center">
                        <div>
                          <p className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">
                            Paket {selectedPlan.name}
                          </p>
                          <p className="text-[10px] text-white/35 mt-0.5">
                            Aktif {selectedPlan.durationDays} Hari setelah disetujui
                          </p>
                        </div>
                        <span className="text-base font-black text-white">
                          {formatRupiah(selectedPlan.amount)}
                        </span>
                      </div>

                      {/* QRIS Scan Area */}
                      <div className="bg-white rounded-3xl p-3.5 flex flex-col items-center border border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowQrisPreview(true)}
                          className="rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60 cursor-pointer active:scale-[0.98] transition-all"
                          aria-label="Perbesar QRIS"
                        >
                          <img
                            src={selectedPlan.qrisSrc}
                            alt="QRIS QR Code"
                            className="w-40 h-40 object-contain mx-auto"
                          />
                        </button>
                        <div className="mt-2.5 text-center">
                          <p className="text-xs font-black text-gray-800">
                            RyuDev · QRIS GPN
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 select-all">
                            NMID: ID1026514213762
                          </p>
                          <p className="mt-1 text-[9px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full inline-block">
                            Tap gambar untuk memperbesar
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2">
                        <Button
                          onClick={goToStep2}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all"
                        >
                          Saya Sudah Transfer
                          <FiChevronRight size={16} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── STEP 2: UPLOAD ──────────────── */}
                  {step === 2 && (
                    <div className="animate-fadeIn space-y-4">
                      {/* Active profile review */}
                      {profile && (
                        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                              {profile.username?.slice(0, 2)?.toUpperCase() || "??"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">
                              {profile.username}
                            </p>
                            <p className="text-[10px] text-white/30">
                              Akun tujuan aktivasi premium
                            </p>
                          </div>
                        </div>
                      )}

                      {isCheckingPending ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-3xl border border-white/10 bg-white/[0.01]">
                          <FiLoader size={24} className="animate-spin text-cyan-400" />
                          <p className="text-xs text-white/50">Mengecek status request...</p>
                        </div>
                      ) : hasPendingRequest ? (
                        <div className="flex flex-col items-center justify-center p-6 gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 text-center">
                          <FiAlertTriangle size={32} className="text-amber-400 mb-1" />
                          <h3 className="text-sm font-bold text-amber-300">Request Sedang Diproses</h3>
                          <p className="text-[11px] text-amber-200/70 leading-relaxed max-w-[250px]">
                            Anda masih memiliki pengajuan premium yang sedang menunggu konfirmasi admin. Harap tunggu maksimal 1x24 jam sebelum mengajukan lagi.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Upload Box Area */}
                          <div
                            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/10 p-5 hover:border-cyan-200/40 hover:bg-white/[0.01] transition-all min-h-[160px]"
                            onClick={() => inputRef.current?.click()}
                          >
                        {preview ? (
                          <div className="relative w-full flex flex-col items-center">
                            <img
                              src={preview}
                              className="w-full max-h-48 object-contain rounded-2xl border border-white/10"
                              alt="Bukti Transfer"
                            />
                            <p className="text-[10px] text-white/40 mt-2 text-center underline">
                              Tap area untuk mengganti foto
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-300">
                              <FiUpload size={22} />
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-bold text-white/70 block">
                                Klik / Tap untuk Upload Bukti
                              </span>
                              <span className="text-[10px] text-white/30 block mt-1">
                                Format: JPG, PNG, WebP (Maks 5MB)
                              </span>
                            </div>
                          </>
                        )}
                        <input
                          ref={inputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            e.target.files?.[0] && handleFile(e.target.files[0])
                          }
                        />
                      </div>

                      {/* Image clean handler */}
                      {file && (
                        <div className="flex items-center justify-between px-2 py-1 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                          <span className="text-[11px] text-white/50 truncate max-w-[70%]">
                            📄 {file.name}
                          </span>
                          <button
                            onClick={() => {
                              if (preview) URL.revokeObjectURL(preview);
                              setFile(null);
                              setPreview(null);
                            }}
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 active:scale-95 transition-all p-1.5 cursor-pointer min-h-[36px] flex items-center"
                          >
                            Hapus File
                          </button>
                        </div>
                      )}

                      {error && (
                        <p className="text-xs text-red-400 font-medium px-1">
                          ⚠️ {error}
                        </p>
                      )}

                      {/* Navigation buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => { setError(""); setStep(1); }}
                          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] active:scale-95 transition-all text-sm font-bold text-white/70 px-4 min-h-[44px] cursor-pointer"
                        >
                          <FiChevronLeft size={16} />
                          Kembali
                        </button>
                        <Button
                          onClick={goToStep3}
                          disabled={hasPendingRequest}
                          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Lanjut Konfirmasi
                          <FiChevronRight size={16} />
                        </Button>
                      </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ──────────────── STEP 3: KONFIRMASI ──────────────── */}
                  {step === 3 && (
                    <div className="animate-fadeIn space-y-4">
                      {/* Summary details */}
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Paket Premium</span>
                          <span className="font-bold text-white">{selectedPlan.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Durasi Aktif</span>
                          <span className="font-bold text-white">{selectedPlan.durationDays} Hari</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Jumlah Bayar</span>
                          <span className="font-black text-cyan-200 text-sm">
                            {formatRupiah(selectedPlan.amount)}
                          </span>
                        </div>
                        {profile && (
                          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                            <span className="text-white/40">Akun Penerima</span>
                            <span className="font-bold text-white truncate max-w-[150px]">{profile.username}</span>
                          </div>
                        )}
                      </div>

                      {/* Small receipt preview */}
                      {preview && (
                        <div className="rounded-2xl border border-white/[0.06] overflow-hidden flex items-center gap-3 p-2 bg-white/[0.01]">
                          <img
                            src={preview}
                            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                            alt="Bukti"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                              Bukti Pembayaran
                            </p>
                            <p className="text-xs text-white/60 truncate font-mono mt-0.5">
                              {file?.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Terms & Conditions Checkbox - DIRECTLY VISIBLE */}
                      <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.02] p-4.5">
                        <label
                          htmlFor="sk-agree"
                          className="flex items-start gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            id="sk-agree"
                            checked={isSkAgreed}
                            onChange={(e) => setIsSkAgreed(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)] shrink-0 cursor-pointer"
                          />
                          <span className="text-xs text-white/50 leading-relaxed select-none">
                            Saya menyetujui seluruh{" "}
                            <button
                              type="button"
                              onClick={() => setShowSkModal(true)}
                              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200 font-bold inline"
                            >
                              Syarat &amp; Ketentuan Premium
                            </button>{" "}
                            yang berlaku di RyuKomik.
                          </span>
                        </label>
                      </div>

                      {error && (
                        <p className="text-xs text-red-400 font-medium px-1">
                          ⚠️ {error}
                        </p>
                      )}

                      {/* Hint centang */}
                      {!isSkAgreed && (
                        <div className="text-center bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[10px] font-bold rounded-xl py-1.5 px-3">
                          Silakan centang persetujuan Syarat &amp; Ketentuan untuk mengirim bukti.
                        </div>
                      )}

                      {/* Step 3 Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          disabled={loading}
                          onClick={() => { setError(""); setStep(2); }}
                          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] active:scale-95 transition-all text-sm font-bold text-white/70 px-4 min-h-[44px] cursor-pointer disabled:opacity-50"
                        >
                          <FiChevronLeft size={16} />
                          Kembali
                        </button>
                        <Button
                          onClick={handleSubmit}
                          disabled={loading || !isSkAgreed}
                          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 active:scale-[0.99] transition-all"
                        >
                          {loading ? (
                            <FiLoader size={16} className="animate-spin" />
                          ) : (
                            <HiOutlineSparkles size={16} />
                          )}
                          {loading ? "Mengirim..." : "Kirim Bukti Pembayaran"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DIALOG KONFIRMASI TUTUP MODAL (z-[70]) ── */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-6 backdrop-blur-xs"
          onClick={() => setShowCloseConfirm(false)}
        >
          <div
            className="rk-card rounded-[2rem] p-6 w-full max-w-[320px] animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400">
                <FiAlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Batalkan Pengajuan?</h3>
                <p className="text-[11px] text-white/40 mt-1 leading-normal">
                  Bukti transfer yang sudah diupload akan dihapus. Anda harus mengulangi proses dari awal.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/10 active:scale-95 transition-all text-white/70 min-h-[44px] cursor-pointer"
              >
                Lanjutkan
              </button>
              <button
                onClick={doClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95 transition-all min-h-[44px] cursor-pointer"
              >
                Ya, Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QRIS Fullscreen Preview (z-[70]) ── */}
      {showQrisPreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowQrisPreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowQrisPreview(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            aria-label="Tutup QRIS fullscreen"
          >
            <FiX size={20} />
          </button>
          <img
            src={selectedPlan.qrisSrc}
            alt="QRIS Fullscreen"
            className="max-h-[80vh] w-full max-w-[400px] rounded-3xl object-contain bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showSkModal && <SkPremiumModal close={() => setShowSkModal(false)} />}
      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </>
  );
}
