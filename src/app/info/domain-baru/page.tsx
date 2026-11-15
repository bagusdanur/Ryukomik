import type { Metadata } from "next";
import Link from "next/link";
import { FiAlertCircle, FiArrowRight, FiBookmark, FiCheckCircle, FiGlobe, FiMessageCircle, FiRefreshCw } from "react-icons/fi";

export const metadata: Metadata = {
  title: { absolute: "Ryukomik Pindah ke ryukomik.com — Alamat Baru & Cara Update Bookmark" },
  description:
    "Ryukomik pindah domain ke ryukomik.com. Alamat lama sudah tidak aktif. Simpan alamat baru, perbarui bookmark, dan aktifkan notifikasi supaya tidak kehilangan update chapter.",
  alternates: { canonical: "https://ryukomik.com/info/domain-baru" },
  openGraph: {
    title: "Ryukomik pindah ke ryukomik.com",
    description: "Alamat lama sudah tidak aktif. Simpan alamat baru dan perbarui bookmark kamu.",
    url: "https://ryukomik.com/info/domain-baru",
    type: "article",
  },
};

const STEPS = [
  {
    icon: FiBookmark,
    title: "Perbarui bookmark",
    body: "Bookmark lama masih menunjuk ke alamat yang sudah mati. Hapus, lalu simpan ulang dari alamat ryukomik.com.",
  },
  {
    icon: FiRefreshCw,
    title: "Muat ulang aplikasi (kalau dipasang)",
    body: "Kalau kamu memasang Ryukomik di layar utama, hapus ikonnya lalu pasang lagi dari ryukomik.com supaya terhubung ke alamat baru.",
  },
  {
    icon: FiMessageCircle,
    title: "Aktifkan notifikasi",
    body: "Notifikasi adalah satu-satunya cara kami menghubungimu kalau alamat berubah lagi. Aktifkan sekali, berlaku terus.",
  },
];

export default function DomainBaruPage() {
  return (
    <main className="rk-page rk-app-surface text-white">
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-24 sm:px-6">
        <div className="rk-card rounded-3xl border border-white/[.07] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">
            <FiGlobe size={14} /> Pengumuman
          </div>

          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
            Ryukomik pindah ke <span className="text-cyan-300">ryukomik.com</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Alamat lama <strong className="text-white/90">ryukomik.id</strong>,{" "}
            <strong className="text-white/90">ryukomik.my.id</strong>, dan{" "}
            <strong className="text-white/90">ryukomik.web.id</strong> sudah tidak aktif dan tidak bisa
            dipakai lagi. Semua chapter, bookmark, riwayat baca, dan akun tetap utuh — hanya alamatnya
            yang berpindah.
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[.07] p-4">
            <FiAlertCircle className="mt-0.5 shrink-0 text-amber-300" size={18} />
            <p className="text-xs leading-relaxed text-amber-100/85">
              Kalau kamu membuka Ryukomik dari bookmark lama dan muncul pesan{" "}
              <em>&ldquo;site can&rsquo;t be reached&rdquo;</em> atau{" "}
              <em>DNS_PROBE_FINISHED_NXDOMAIN</em>, itu bukan situsnya yang mati — alamat lamanya yang
              sudah tidak ada. Ketik langsung <strong>ryukomik.com</strong>.
            </p>
          </div>

          <h2 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-white/50">
            Tiga langkah supaya tidak ketinggalan
          </h2>

          <div className="mt-4 flex flex-col gap-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl border border-white/[.07] bg-white/[.03] p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 py-2.5 text-sm font-black text-black transition hover:brightness-110"
            >
              Mulai baca <FiArrowRight size={15} />
            </Link>
            <Link
              href="/terbaru"
              className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5"
            >
              Chapter terbaru
            </Link>
          </div>

          <div className="mt-8 border-t border-white/[.07] pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">Tetap terhubung</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
              <a className="flex items-center gap-2 hover:text-white" href="https://discord.gg/Sf8pPRq4aj" rel="noopener noreferrer" target="_blank">
                <FiCheckCircle size={14} className="text-cyan-300" /> Discord komunitas
              </a>
              <a className="flex items-center gap-2 hover:text-white" href="https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV" rel="noopener noreferrer" target="_blank">
                <FiCheckCircle size={14} className="text-cyan-300" /> Grup WhatsApp
              </a>
            </div>
          </div>
        </div>

        <section className="mt-8 rk-card rounded-3xl border border-white/[.07] p-6 sm:p-8">
          <h2 className="text-lg font-black">Pertanyaan yang sering muncul</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <div>
              <dt className="text-sm font-bold">Apakah data saya hilang?</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/60">
                Tidak. Bookmark, riwayat baca, XP, dan akun tersimpan di server — bukan di alamat domain.
                Setelah masuk di ryukomik.com, semuanya kembali.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold">Kenapa alamat lama tidak dialihkan otomatis?</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/60">
                Alamat lama sudah dilepas dari registry domain, jadi tidak bisa lagi mengarahkan ke mana
                pun. Karena itu kami pakai notifikasi dan halaman ini sebagai jalur pemberitahuan.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold">Apakah alamat ini akan berubah lagi?</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/60">
                Rencananya tidak. Kalau pun terjadi, notifikasi yang kamu aktifkan akan jadi cara pertama
                kami memberi tahu.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
