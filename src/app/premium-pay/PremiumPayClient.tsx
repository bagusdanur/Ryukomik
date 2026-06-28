"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FiCheck,
  FiX,
  FiZap,
  FiLoader,
  FiRefreshCw,
  FiMessageSquare,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { TbLayersLinked, TbBadge } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlineDownloadForOffline, MdOutlineOndemandVideo } from "react-icons/md";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";
import LoginModal from "@/components/LoginModal";
import SkPremiumModal from "@/components/SkPremiumModal";
import QRCode from "qrcode";
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

const premiumPlans = [
  {
    id: "1m",
    name: "1 Bulan",
    durationDays: 30,
    amount: 10000,
    badge: "Harga Normal",
    badgeClass: "bg-white/[0.06] text-white/40 border border-white/[0.08]",
    note: "Coba Premium",
  },
  {
    id: "3m",
    name: "3 Bulan",
    durationDays: 90,
    amount: 25000,
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
    badge: "Hemat 25%",
    badgeClass: "bg-cyan-400/12 text-cyan-200 border border-cyan-400/20",
    note: "Aktif lebih lama",
    subtext: "≈ Rp 7.500/bulan",
  },
];

const paymentMethods = [
  { id: "qris", name: "QRIS", type: "qris" },
  { id: "bni_va", name: "BNI Virtual Account", type: "va" },
  { id: "bri_va", name: "BRI Virtual Account", type: "va" },
  { id: "cimb_niaga_va", name: "CIMB Niaga VA", type: "va" },
  { id: "permata_va", name: "Permata VA", type: "va" },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function StepIndicator({ step }: { step: number }) {
  const steps = ["Pilih Paket", "Pembayaran", "Selesai"];
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
  const [selectedPlanId, setSelectedPlanId] = useState(premiumPlans[0].id);
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

  const handleActivatePremium = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setStep(1);
    setShowModal(true);
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
    if (step === 2 && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft]);

  // Polling status effect
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;

    if (step === 2 && paymentData?.order_id) {
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
  }, [step, paymentData]);

  const handleSimulatePayment = async () => {
    if (!paymentData?.order_id) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch("/api/payment/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          order_id: paymentData.order_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simulasi");
      
      // We don't change step here immediately, the polling will detect the status change
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulasi gagal");
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Disalin ke clipboard!");
  };

  return (
    <>
      <div className="rk-page px-4 pb-24 pt-20 text-white relative">
        {/* Sandbox Badge */}
        <div className="absolute top-24 right-4 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 z-10 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          Sandbox Mode
        </div>

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
                <RiVipCrownLine size={13} className="text-cyan-200" />
                <div className="text-xs font-bold text-cyan-200 uppercase tracking-widest">
                  Premium
                </div>
              </div>
              <div className="text-2xl font-black text-white">Premium Akses</div>
              <div className="text-xs text-white/30 mt-1 font-medium">
                Otomatis via Payment Gateway
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
                <button
                  onClick={handleActivatePremium}
                  className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold min-h-[44px] cursor-pointer"
                >
                  <HiOutlineSparkles size={15} />
                  Bayar Sekarang
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
          onClick={() => {
            if (step === 2 && !success) {
              if (window.confirm("Yakin ingin membatalkan pembayaran ini?")) {
                setShowModal(false);
              }
            } else {
              setShowModal(false);
            }
          }}
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
              onClick={() => setShowModal(false)}
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
                    Pembayaran Berhasil!
                  </h2>
                  <p className="text-sm text-white/40 leading-relaxed mb-1">
                    Premium kamu sudah aktif secara otomatis. Selamat menikmati fitur tanpa batas!
                  </p>
                  <div className="w-full flex flex-col gap-2 mt-6">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        window.location.reload();
                      }}
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-[var(--accent)] hover:brightness-110 active:scale-[0.99] transition-all text-white min-h-[44px] cursor-pointer"
                    >
                      Kembali & Refresh
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
                      {step === 1 ? "Pilih Metode Pembayaran" : step === 2 ? "Selesaikan Pembayaran" : "Menunggu Konfirmasi"}
                    </h2>
                  </div>

                  {/* Stepper indicator */}
                  <StepIndicator step={step} />

                  {/* ──────────────── STEP 1: PILIH PAKET & METODE ──────────────── */}
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
                                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black">VA</span>
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
                        <button
                          onClick={handleCreateTransaction}
                          disabled={loading || !isSkAgreed}
                          className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-[44px] cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <FiLoader size={16} className="animate-spin" />
                          ) : (
                            "Lanjut Pembayaran"
                          )}
                          {!loading && <FiChevronRight size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── STEP 2: PEMBAYARAN ──────────────── */}
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
                          <p className="mt-3 text-[10px] text-gray-500 font-mono select-all bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full text-center truncate">
                            {paymentData.payment_number}
                          </p>
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

                      {/* SANDBOX SIMULATION BUTTON */}
                      <div className="pt-4 border-t border-dashed border-white/10">
                        <button
                          onClick={handleSimulatePayment}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold min-h-[44px] cursor-pointer bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                        >
                          {loading ? <FiLoader size={16} className="animate-spin" /> : "Simulasi Pembayaran (Sandbox)"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── QRIS Fullscreen Preview ── */}
      {showQrisPreview && qrCodeUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowQrisPreview(false)}
        >
          <img
            src={qrCodeUrl}
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
