"use client";


import { useState, useRef, useEffect, useMemo } from "react";
import type { ChangeEvent } from "react";
import { FiCheck, FiX, FiZap, FiUpload, FiLoader, FiRefreshCw, FiMessageSquare } from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { TbLayersLinked, TbBadge } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";

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

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

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

export default function PremiumPage() {
  const { user } = useSupabaseUser();
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showQrisPreview, setShowQrisPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // hitung sisa hari premium
  const premiumDaysLeft = useMemo(() => {
    if (!profile?.premium_until) return null;
    const diff = new Date(profile.premium_until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile?.premium_until]);
  const isActivePremium = isActivePremiumProfile(profile);

  const closeModal = () => {
    if (preview) URL.revokeObjectURL(preview);
    setShowModal(false);
    setShowQrisPreview(false);
    setFile(null);
    setPreview(null);
    setError("");
    setSuccess(false);
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
    if (preview) URL.revokeObjectURL(preview); // cleanup URL lama
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Upload bukti transfer dulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const imgRes = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`,
        { method: "POST", body: formData },
      );
      const imgData = (await imgRes.json()) as ImgBbResponse;
      if (!imgData.success || !imgData.data?.url) throw new Error("Upload gambar gagal");

      if (!user) throw new Error("Kamu belum login");

      const { error: dbErr } = await supabase.from("premium_requests").insert({
        user_id: user.id,
        name: profile?.username || user.email || "User",
        proof_url: imgData.data.url,
      });
      if (dbErr) throw new Error(dbErr.message);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
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
              {/* Avatar */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
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
              <div className="text-xs text-white/30 mt-1">
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
                    <div className="text-xs text-white/25 mt-0.5">
                      {f.basic === null ? f.desc : f.basic}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled
              className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-white/30 cursor-not-allowed border border-white/[0.06]"
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
              <div className="text-xs text-white/30 mt-1">
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
                    <div className="text-xs text-white/35 mt-0.5">
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
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-xs text-white/30 mb-1">
                    Harga per bulan
                  </div>
                  <div className="text-3xl font-black text-white">Rp 10.000</div>
                  <div className="text-xs text-white/30 mt-1">
                    bayar via QRIS
                  </div>
                </div>
                <div className="text-[10px] bg-cyan-400/12 text-cyan-200 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                  Terjangkau
                </div>
              </div>
              {isActivePremium ? (
                <div className="w-full py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center gap-2">
                  <RiVipCrownLine size={15} />
                  Aktif
                  {premiumDaysLeft !== null
                    ? ` · ${premiumDaysLeft} hari lagi`
                    : " · Premium"}
                </div>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold"
                >
                  <HiOutlineSparkles size={15} />
                  Aktifkan Premium
                </button>
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

      {/* ── MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 pb-24 pt-4 sm:p-4 bg-black/70"
          onClick={closeModal}
        >
          <div
            className="rk-card relative max-h-[calc(100dvh-7rem)] w-full max-w-[340px] overflow-y-auto rounded-3xl sm:max-w-sm sm:max-h-[84vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Tombol close */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <FiX size={14} className="text-white/50" />
            </button>

            <div className="px-4 pb-3 pt-3">
              {success ? (
                /* ── Sukses ── */
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[#5DCAA5]/15 flex items-center justify-center mb-4">
                    <FiCheck size={24} className="text-[#5DCAA5]" />
                  </div>
                  <h2 className="text-lg font-black text-white mb-2">
                    Bukti Terkirim!
                  </h2>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Admin akan verifikasi dalam 1×24 jam. Setelah disetujui akun
                    kamu otomatis aktif Premium.
                  </p>
                  <button
                    onClick={closeModal}
                    className="mt-5 w-full py-2.5 rounded-xl text-sm font-bold bg-[var(--accent)] text-white"
                  >
                    Oke, Tutup
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Header modal ── */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <RiVipCrownLine size={13} className="text-cyan-200" />
                      <span className="text-xs font-bold text-cyan-200 uppercase tracking-widest">
                        Premium
                      </span>
                    </div>
                    <h2 className="text-[17px] font-black text-white">
                      Bayar & Upload Bukti
                    </h2>
                    <p className="text-xs text-white/35 mt-0.5">
                      Scan QR lalu kirim screenshot transferan kamu
                    </p>
                  </div>

                  {/* ── User info (dari login) ── */}
                  {profile && (
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 mb-3">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[11px] font-bold text-[var(--accent)]">
                          {profile.username?.slice(0, 2)?.toUpperCase() || "??"}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-white">
                          {profile.username}
                        </p>
                        <p className="text-[10px] text-white/30">
                          Akun yang akan diaktifkan
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── QR QRIS ── */}
                  <div className="bg-white rounded-2xl p-2.5 flex flex-col items-center mb-2.5">
                    <button
                      type="button"
                      onClick={() => setShowQrisPreview(true)}
                      className="rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60"
                      aria-label="Buka QRIS fullscreen"
                    >
                      <img
                        src="/qris10k.jpeg"
                        alt="QR QRIS RyuDev"
                        className="w-36 h-36 object-contain rounded-lg"
                      />
                    </button>
                    <div className="mt-1.5 text-center">
                      <p className="text-[11px] font-bold text-gray-700">
                        RyuDev · QRIS
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        NMID: ID1026514213762
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-gray-400">
                        Tap QR untuk memperbesar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center mb-3">
                    <div className="text-[22px] font-black text-white">
                      Rp 10.000
                    </div>
                    <span className="ml-2 text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] px-2 py-0.5 rounded-full font-bold uppercase">
                      / bulan
                    </span>
                  </div>

                  {/* ── Upload bukti ── */}
                  <div
                    className="mb-2 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/10 p-2.5 hover:border-cyan-200/40"
                    onClick={() => inputRef.current?.click()}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        className="w-full max-h-20 object-cover rounded-lg sm:max-h-24"
                        alt="preview"
                      />
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                          <FiUpload size={16} className="text-cyan-200" />
                        </div>
                        <span className="text-xs text-white/40 text-center">
                          Upload screenshot bukti transfer
                          <br />
                          <span className="text-white/20">
                            JPG / PNG / WebP · max 5MB
                          </span>
                        </span>
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

                  {preview && (
                    <button
                      onClick={() => {
                        if (preview) URL.revokeObjectURL(preview);
                        setFile(null);
                        setPreview(null);
                      }}
                      className="text-[11px] text-white/25 hover:text-white/50 mb-2 block transition-colors"
                    >
                      × Hapus foto
                    </button>
                  )}

                  {error && (
                    <p className="text-xs text-red-400 mb-2">{error}</p>
                  )}

                  {/* ── Tombol kirim ── */}
                  <div className="sticky bottom-0 z-10 -mx-4 mt-2 bg-[var(--surface-1)] px-4 pb-3 pt-2">
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <FiLoader size={14} />
                      ) : (
                        <HiOutlineSparkles size={14} />
                      )}
                      {loading ? "Mengirim..." : "Kirim Bukti Pembayaran"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showQrisPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowQrisPreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowQrisPreview(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Tutup QRIS fullscreen"
          >
            <FiX size={18} />
          </button>
          <img
            src="/qris10k.jpeg"
            alt="QR QRIS RyuDev fullscreen"
            className="max-h-[86vh] w-full max-w-[420px] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
