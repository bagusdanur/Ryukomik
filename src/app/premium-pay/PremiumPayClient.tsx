"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  FiCheck,
  FiX,
  FiZap,
  FiLoader,
  FiRefreshCw,
  FiMessageSquare,
  FiChevronRight,
  FiChevronLeft,
  FiDownload,
  FiUpload,
  FiAlertTriangle,
} from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { TbLayersLinked, TbBadge } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlineDownloadForOffline, MdOutlineOndemandVideo } from "react-icons/md";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";
import LoginModal from "@/components/LoginModal";
import SkPremiumModal from "@/components/SkPremiumModal";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabaseClient";

const features = [
  {
    icon: <MdOutlineDownloadForOffline size={16} />,
    title: "Download Komik",
    desc: "Simpan chapter favorit buat dibaca offline",
    basic: null,
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
    desc: "Ambil beberapa chapter dalam sekali jalan",
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

interface PremiumPlan {
  id: string;
  name: string;
  durationDays: number;
  amount: number;
  qrisSrc?: string;
  badge: string;
  badgeClass: string;
  note: string;
  subtext?: string;
}

const manualPlans: PremiumPlan[] = [
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

const autoPlans: PremiumPlan[] = [
  {
    id: "1m",
    name: "1 Bulan",
    durationDays: 30,
    amount: 12000,
    badge: "Harga Normal",
    badgeClass: "bg-white/[0.06] text-white/40 border border-white/[0.08]",
    note: "Coba Premium",
  },
  {
    id: "3m",
    name: "3 Bulan",
    durationDays: 90,
    amount: 30000,
    badge: "Hemat 17%",
    badgeClass: "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20",
    note: "Lebih praktis",
    subtext: "≈ Rp 10.000/bulan",
  },
  {
    id: "6m",
    name: "6 Bulan",
    durationDays: 180,
    amount: 50000,
    badge: "Hemat 30%",
    badgeClass: "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20",
    note: "Aktif lebih lama",
    subtext: "≈ Rp 8.333/bulan",
  },
];

const paymentMethods = [
  { id: "qris", name: "QRIS", type: "qris" },
  { id: "bni_va", name: "BNI Virtual Account", type: "va" },
  { id: "bri_va", name: "BRI Virtual Account", type: "va" },
  { id: "cimb_niaga_va", name: "CIMB Niaga VA", type: "va" },
  { id: "permata_va", name: "Permata VA", type: "va" },
];

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

type ImgBbResponse = {
  success?: boolean;
  data?: {
    url?: string;
  };
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function StepIndicator({ step, mode }: { step: number; mode: "auto" | "manual" }) {
  const steps = mode === "auto" ? ["Pilih Paket", "Pembayaran", "Selesai"] : ["Bayar", "Upload", "Konfirmasi"];
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

export default function PremiumPayClient() {
  const { user } = useSupabaseUser();
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [paymentMode, setPaymentMode] = useState<"auto" | "manual">("manual");
  const premiumPlans = paymentMode === "auto" ? autoPlans : manualPlans;

  const [selectedPlanId, setSelectedPlanId] = useState(manualPlans[0].id);
  const [selectedMethodId, setSelectedMethodId] = useState(paymentMethods[0].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isSkAgreed, setIsSkAgreed] = useState(false);
  const [showSkModal, setShowSkModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQrisPreview, setShowQrisPreview] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Manual payment upload states
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // Pending request states
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isCheckingPending, setIsCheckingPending] = useState(false);

  const handleDownloadQr = () => {
    if (!qrCodeUrl || !paymentData) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `qris-payment-${paymentData.order_id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // user profile state
  const [profile, setProfile] = useState<any>(null);
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
  const selectedMethod = 
    paymentMethods.find((method) => method.id === selectedMethodId) || paymentMethods[0];

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
    setPaymentData(null);
    setQrCodeUrl("");
  };

  const handleCloseRequest = () => {
    if (paymentMode === "manual") {
      if (file && !success) {
        setShowCloseConfirm(true);
        return;
      }
    } else {
      if (step === 2 && !success) {
        if (!window.confirm("Yakin ingin membatalkan pembayaran ini?")) {
          return;
        }
      }
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

  const handleSubmitManual = async () => {
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

  const goToStep2Manual = () => {
    setError("");
    setStep(2);
  };

  const goToStep3Manual = () => {
    if (!file) {
      setError("Upload bukti transfer dulu di Step 2!");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleCreateTransaction = async () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!isSkAgreed) {
      setError("Anda harus menyetujui Syarat & Ketentuan terlebih dahulu");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Setup token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          package_name: selectedPlan.name,
          duration_days: selectedPlan.durationDays,
          amount: selectedPlan.amount,
          payment_method: selectedMethodId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat transaksi");
      }

      setPaymentData(data.payment);

      if (data.payment.payment_method === "qris") {
        try {
          const { default: QRCode } = await import("qrcode");
          const url = await QRCode.toDataURL(data.payment.payment_number, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          setQrCodeUrl(url);
        } catch (e) {
          console.error("Failed to generate QR Code", e);
        }
      }

      // Start countdown
      const expDate = new Date(data.payment.expired_at).getTime();
      const now = new Date().getTime();
      setTimeLeft(Math.max(0, Math.floor((expDate - now) / 1000)));

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer effect
  useEffect(() => {
    if (paymentMode === "auto" && step === 2 && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft, paymentMode]);

  // Polling status effect
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;

    if (paymentMode === "auto" && step === 2 && paymentData?.order_id) {
      pollingInterval = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          const res = await fetch(`/api/payment/check-status?order_id=${paymentData.order_id}`, {
            headers: {
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
          });
          const data = await res.json();
          if (data.success && data.status === "completed") {
            setSuccess(true);
            setStep(3);
            clearInterval(pollingInterval);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000);
    }

    return () => clearInterval(pollingInterval);
  }, [step, paymentData, paymentMode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Disalin ke clipboard!");
  };

  return (
    <>
      <div className="rk-page px-4 pb-24 pt-20 text-white relative">

        {/* Heading */}
        <div className="max-w-xl mx-auto text-center mb-8 pt-4">
          <div className="rk-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest">
            <RiVipCrownLine size={13} />
            RyuPayment
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Pilih Paket Kamu
          </h1>
          <p className="text-sm text-white/40">
            Upgrade ke Premium melalui integrasi payment gateway otomatis
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
                <RiVipCrownLine size={13} className={paymentMode === "auto" ? "text-cyan-200" : "text-amber-300"} />
                <div className={`text-xs font-bold uppercase tracking-widest ${paymentMode === "auto" ? "text-cyan-200" : "text-amber-300"}`}>
                  Premium
                </div>
              </div>
              <div className="text-2xl font-black text-white mb-3">Premium Akses</div>

              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("auto");
                    setSelectedPlanId("1m");
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMode === "auto"
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <FiZap size={13} />
                  <span>Otomatis</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("manual");
                    setSelectedPlanId("1m");
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMode === "manual"
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <RiVipCrownLine size={13} />
                  <span>Manual</span>
                </button>
              </div>

              <div className="text-xs text-white/30 font-medium">
                {paymentMode === "auto" ? (
                  <span>
                    <span className="text-emerald-400 font-bold">⚡ Aktif Instan</span> · Otomatis via Payment Gateway
                  </span>
                ) : (
                  "Konfirmasi manual oleh Admin (1-24 Jam)"
                )}
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${paymentMode === "auto" ? "bg-cyan-400/15" : "bg-amber-500/15"}`}>
                      <FiCheck size={10} className={paymentMode === "auto" ? "text-cyan-200" : "text-amber-300"} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white leading-tight">
                      {f.title}
                    </div>
                    <div className="text-xs text-white/35 mt-0.5 font-normal leading-normal">
                      {f.desc}
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${paymentMode === "auto" ? "text-cyan-200/80" : "text-amber-300/80"}`}>
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
                            ? paymentMode === "auto"
                              ? "border-cyan-200/50 bg-cyan-400/10"
                              : "border-amber-300/50 bg-amber-500/10"
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
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  active
                                    ? paymentMode === "auto"
                                      ? "bg-cyan-400/12 text-cyan-200"
                                      : "bg-amber-400/12 text-amber-200"
                                    : plan.badgeClass || 'bg-cyan-400/12 text-cyan-200'
                                }`}>
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
                            {paymentMode === "manual" && (
                              <div className="text-[10px] text-white/35 mt-0.5 font-medium">
                                via QRIS
                              </div>
                            )}
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
                    : paymentMode === "auto"
                    ? "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20"
                    : "bg-amber-400/12 text-amber-200 border border-amber-500/20"
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
                <button
                  onClick={handleActivatePremium}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold min-h-[44px] cursor-pointer transition-all ${
                    paymentMode === "auto"
                      ? "rk-btn-primary"
                      : "bg-amber-500 text-black hover:bg-amber-400"
                  }`}
                >
                  {paymentMode === "auto" ? <HiOutlineSparkles size={15} /> : <RiVipCrownLine size={15} />}
                  {paymentMode === "auto" ? "Bayar Sekarang" : "Aktifkan Premium"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL UTAMA DENGAN STEPPER (z-[60]) ── */}
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

            {/* Tombol close */}
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
                    {paymentMode === "auto" ? "Pembayaran Berhasil!" : "Bukti Terkirim!"}
                  </h2>
                  <p className="text-sm text-white/40 leading-relaxed mb-1">
                    {paymentMode === "auto"
                      ? "Premium kamu sudah aktif secara otomatis. Selamat menikmati fitur tanpa batas!"
                      : "Admin akan memverifikasi pembayaran Anda dalam 1×24 jam. Akun kamu otomatis aktif setelah disetujui."}
                  </p>
                  {paymentMode === "manual" && (
                    <p className="text-xs text-cyan-300/80 font-bold mb-6">
                      Anda bisa mengecek status aktivasi di Halaman Profil.
                    </p>
                  )}
                  <div className="w-full flex flex-col gap-2 mt-6">
                    {paymentMode === "manual" && (
                      <a
                        href="/setting"
                        className="w-full py-3 rounded-2xl text-sm font-bold bg-cyan-400/15 border border-cyan-400/20 text-cyan-200 text-center block min-h-[44px] cursor-pointer hover:bg-cyan-400/25 active:scale-[0.99] transition-all"
                      >
                        Lihat Profil
                      </a>
                    )}
                    <button
                      onClick={() => {
                        doClose();
                        window.location.reload();
                      }}
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-[var(--accent)] hover:brightness-110 active:scale-[0.99] transition-all text-white min-h-[44px] cursor-pointer"
                    >
                      {paymentMode === "auto" ? "Kembali & Refresh" : "Oke, Tutup"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Title & Info */}
                  <div className="mb-4 pr-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <RiVipCrownLine size={14} className={paymentMode === "auto" ? "text-cyan-200" : "text-amber-300"} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                        Langkah {step} dari 3
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white leading-snug">
                      {paymentMode === "auto" ? (
                        step === 1 ? "Pilih Metode Pembayaran" : step === 2 ? "Selesaikan Pembayaran" : "Menunggu Konfirmasi"
                      ) : (
                        step === 1 ? "Scan QRIS & Transfer" : step === 2 ? "Upload Bukti Pembayaran" : "Konfirmasi Pembelian"
                      )}
                    </h2>
                  </div>

                  {/* Stepper indicator */}
                  <StepIndicator step={step} mode={paymentMode} />

                  {/* Render steps based on mode */}
                  {paymentMode === "auto" ? (
                    <>
                      {/* ──────────────── STEP 1: PILIH PAKET & METODE (AUTO) ──────────────── */}
                      {step === 1 && (
                        <div className="animate-fadeIn space-y-4">
                          {/* Selected Info Summary */}
                          <div className="rounded-2xl border border-cyan-200/15 bg-cyan-400/[0.05] p-3 flex justify-between items-center">
                            <div>
                              <p className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">
                                Paket {selectedPlan.name}
                              </p>
                              <p className="text-[10px] text-white/35 mt-0.5">
                                Durasi {selectedPlan.durationDays} Hari
                              </p>
                            </div>
                            <span className="text-base font-black text-white">
                              {formatRupiah(selectedPlan.amount)}
                            </span>
                          </div>

                          {/* Payment Methods Selector */}
                          <div>
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2">
                              Metode Pembayaran
                            </span>
                            <div className="grid gap-2">
                              {paymentMethods.map((method) => {
                                const active = selectedMethodId === method.id;
                                return (
                                  <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setSelectedMethodId(method.id)}
                                    className={`rounded-xl border px-3 py-3 text-left transition-all min-h-[44px] cursor-pointer flex items-center justify-between ${
                                      active
                                        ? "border-cyan-200/50 bg-cyan-400/10"
                                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/15"
                                    }`}
                                  >
                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                      {method.type === 'qris' ? (
                                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black">QRIS</span>
                                      ) : (
                                        <span className="bg-[var(--accent-2)] text-white text-[10px] px-1.5 py-0.5 rounded font-black">VA</span>
                                      )}
                                      {method.name}
                                    </div>
                                    {active && (
                                      <div className="w-4 h-4 rounded-full bg-cyan-400/20 flex items-center justify-center">
                                        <FiCheck size={10} className="text-cyan-200" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Terms & Conditions Checkbox */}
                          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 mt-2">
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

                          {/* Action buttons */}
                          <div className="pt-2">
                            <Button
                              onClick={handleCreateTransaction}
                              disabled={loading || !isSkAgreed}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <FiLoader size={16} className="animate-spin" />
                              ) : (
                                "Lanjut Pembayaran"
                              )}
                              {!loading && <FiChevronRight size={16} />}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ──────────────── STEP 2: PEMBAYARAN (AUTO) ──────────────── */}
                      {step === 2 && paymentData && (
                        <div className="animate-fadeIn space-y-5">
                          <div className="text-center space-y-1">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Pembayaran</p>
                            <h3 className="text-3xl font-black text-cyan-200">{formatRupiah(paymentData.total_payment)}</h3>
                            <p className="text-xs text-white/40">Batas Waktu: <span className="text-amber-400 font-bold font-mono">{formatTime(timeLeft)}</span></p>
                          </div>

                          {paymentData.payment_method === 'qris' && qrCodeUrl ? (
                            <div className="bg-white rounded-3xl p-4 flex flex-col items-center border border-white/10 relative overflow-hidden">
                              <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2 border-b border-gray-200 pb-2 w-full text-center">Scan QRIS Ini</p>
                              <img
                                src={qrCodeUrl}
                                alt="QRIS QR Code"
                                className="w-48 h-48 object-contain cursor-pointer"
                                onClick={() => setShowQrisPreview(true)}
                              />
                              <p className="mt-3 text-[10px] text-gray-500 font-mono select-all bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full text-center truncate mb-3">
                                {paymentData.payment_number}
                              </p>
                              <button
                                onClick={handleDownloadQr}
                                className="w-full text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                              >
                                <FiDownload size={14} /> Download QR Code
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/10 text-center">
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Nomor Virtual Account</p>
                              <p className="text-xl font-mono font-black text-white tracking-widest mb-3 select-all">
                                {paymentData.payment_number}
                              </p>
                              <button 
                                onClick={() => copyToClipboard(paymentData.payment_number)}
                                className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all"
                              >
                                Salin Nomor
                              </button>
                            </div>
                          )}

                          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-white/80 mb-2">
                              <FiLoader className="animate-spin text-cyan-400" /> Menunggu Pembayaran
                            </div>
                            <p className="text-xs text-white/40">Halaman ini akan otomatis terupdate setelah Anda melakukan pembayaran.</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* ──────────────── STEP 1: SCAN QRIS & TRANSFER (MANUAL) ──────────────── */}
                      {step === 1 && (
                        <div className="animate-fadeIn space-y-4">
                          {/* Compact Plan Selector inside Modal */}
                          <div>
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2">
                              Ganti Paket Pilihan
                            </span>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                              {manualPlans.map((plan) => {
                                const active = selectedPlan.id === plan.id;
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition-all min-h-[44px] cursor-pointer ${
                                      active
                                        ? "border-amber-300/50 bg-amber-500/10"
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
                          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-3 flex justify-between items-center">
                            <div>
                              <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
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
                              <p className="mt-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
                                Tap gambar untuk memperbesar
                              </p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="pt-2">
                            <button
                              onClick={goToStep2Manual}
                              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer bg-amber-500 text-black hover:brightness-110 active:scale-[0.99] transition-all"
                            >
                              Saya Sudah Transfer
                              <FiChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ──────────────── STEP 2: UPLOAD (MANUAL) ──────────────── */}
                      {step === 2 && (
                        <div className="animate-fadeIn space-y-4">
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
                            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/10 p-5 hover:border-amber-300/40 hover:bg-white/[0.01] transition-all min-h-[160px]"
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
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-300">
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
                          
                            </>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => { setError(""); setStep(1); }}
                              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] active:scale-95 transition-all text-sm font-bold text-white/70 px-4 min-h-[44px] cursor-pointer"
                            >
                              <FiChevronLeft size={16} />
                              Kembali
                            </button>
                            <button
                              onClick={goToStep3Manual}
                              disabled={hasPendingRequest}
                              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer bg-amber-500 text-black hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Lanjut Konfirmasi
                              <FiChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ──────────────── STEP 3: KONFIRMASI (MANUAL) ──────────────── */}
                      {step === 3 && (
                        <div className="animate-fadeIn space-y-4">
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
                              <span className="font-black text-amber-300 text-sm">
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

                          {/* Terms & Conditions Checkbox */}
                          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] p-4">
                            <label
                              htmlFor="sk-agree"
                              className="flex items-start gap-3 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                id="sk-agree"
                                checked={isSkAgreed}
                                onChange={(e) => setIsSkAgreed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 shrink-0 cursor-pointer"
                              />
                              <span className="text-xs text-white/50 leading-relaxed select-none">
                                Saya menyetujui seluruh{" "}
                                <button
                                  type="button"
                                  onClick={() => setShowSkModal(true)}
                                  className="text-amber-300 underline underline-offset-2 hover:text-amber-200 font-bold inline"
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

                          {!isSkAgreed && (
                            <div className="text-center bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[10px] font-bold rounded-xl py-1.5 px-3">
                              Silakan centang persetujuan Syarat &amp; Ketentuan untuk mengirim bukti.
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              disabled={loading}
                              onClick={() => { setError(""); setStep(2); }}
                              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] active:scale-95 transition-all text-sm font-bold text-white/70 px-4 min-h-[44px] cursor-pointer disabled:opacity-50"
                            >
                              <FiChevronLeft size={16} />
                              Kembali
                            </button>
                            <button
                              onClick={handleSubmitManual}
                              disabled={loading || !isSkAgreed}
                              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-amber-500 text-black hover:brightness-110 active:scale-[0.99] transition-all"
                            >
                              {loading ? (
                                <FiLoader size={16} className="animate-spin" />
                              ) : (
                                <HiOutlineSparkles size={16} />
                              )}
                              {loading ? "Mengirim..." : "Kirim Bukti Pembayaran"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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

      {/* ── QRIS Fullscreen Preview ── */}
      {showQrisPreview && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 p-4 gap-4"
          onClick={() => setShowQrisPreview(false)}
        >
          <div 
            className="relative w-full max-w-[400px] bg-white rounded-3xl p-4 flex flex-col items-center gap-3" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowQrisPreview(false)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-all p-1"
            >
              <FiX size={20} />
            </button>
            <p className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 w-full text-center">Scan QRIS</p>
            <img
              src={paymentMode === "manual" ? selectedPlan.qrisSrc : qrCodeUrl}
              alt="QRIS Fullscreen"
              className="max-h-[60vh] w-full object-contain"
            />
            {paymentMode === "auto" && (
              <button
                onClick={handleDownloadQr}
                className="w-full text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                <FiDownload size={14} /> Download QR Code
              </button>
            )}
          </div>
        </div>
      )}

      {showSkModal && <SkPremiumModal close={() => setShowSkModal(false)} />}
      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </>
  );
}
