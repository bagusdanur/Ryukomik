import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Scanlator — Ryukomik",
  description: "Aturan resmi Scanlator Ryukomik: akun, hak cipta, kualitas upload, konten 18+, sanksi, donate.",
};

const SECTIONS: Array<{ title: string; items: React.ReactNode[] }> = [
  {
    title: "Akun & identitas",
    items: [
      <>Satu orang atau tim hanya boleh punya <b>satu Akun Translation</b> aktif. Akun ganda ditolak.</>,
      <>Nama tim dan handle harus unik, tidak meniru tim lain atau nama &quot;Ryukomik&quot;.</>,
      <>Akun tidak boleh dijual, disewakan, atau dipindahkan.</>,
      <>Akun baru aktif setelah <b>ACC admin</b>; sebelum itu tidak ada hak upload.</>,
    ],
  },
  {
    title: "Hak cipta",
    items: [
      <>Unggah hanya karya yang <b>berhak kamu unggah</b>: hasil TL sendiri atau karya orisinil timmu.</>,
      <>Dilarang re-upload hasil TL tim lain, mentahan bajakan, atau materi tanpa izin.</>,
      <>Scanlator bertanggung jawab penuh atas keaslian karya. Ryukomik hanya platform.</>,
      <>Takedown lewat form Report diproses <b>maksimal 1×24 jam</b> bila terbukti.</>,
      <>Pelanggaran hak cipta berulang = pencabutan akses permanen.</>,
    ],
  },
  {
    title: "Kualitas upload",
    items: [
      <>Gambar harus terbaca, utuh, dan berurutan.</>,
      <>Tanpa watermark situs lain, iklan, atau banner pihak ketiga.</>,
      <>Halaman terakhir wajib memuat <b>watermark nama tim</b> (dibuat otomatis).</>,
      <>Judul chapter sopan, tanpa kata kasar atau spam.</>,
      <>Chapter terbit tidak bisa diganti isinya.</>,
      <>Batas teknis: maks 30 MB per gambar, maks 60 gambar per chapter, kuota storage 2 GB per tim.</>,
    ],
  },
  {
    title: "Konten terlarang",
    items: [
      <>Konten ilegal, SARA, ujaran kebencian, malware, dan spam.</>,
      <>Drama antar-tim atau memancing keributan di komunitas.</>,
      <>Meminta transfer dana di komentar atau menggiring pembaca bertransaksi di luar platform.</>,
      <>Judul, deskripsi, atau sampul yang menyesatkan.</>,
    ],
  },
  {
    title: "Konten 18+",
    items: [
      <>Wajib ditandai lewat <b>toggle 18+</b> saat upload. Genre tidak berpengaruh.</>,
      <>Seri 18+ disembunyikan dari pengguna yang mengaktifkan filter 18+ di Setting.</>,
      <>Salah menandai konten dewasa termasuk pelanggaran berat.</>,
    ],
  },
  {
    title: "Sanksi",
    items: [
      <><b>Peringatan (SP)</b> — pelanggaran ringan, karya terkait diturunkan sementara.</>,
      <><b>Suspend</b> — akses upload dibekukan sementara (default 7 hari).</>,
      <><b>Pencabutan akses</b> — pelanggaran berat atau berulang; karya dapat dihapus.</>,
      <>Keputusan admin final. Banding lewat kontak resmi Ryukomik.</>,
    ],
  },
  {
    title: "Donate",
    items: [
      <>Monetisasi masa beta hanya lewat <b>tautan donate eksternal</b> milik Scanlator.</>,
      <>Ryukomik tidak menerima, menahan, atau meneruskan dana donasi.</>,
      <>Dilarang memungut bayaran untuk membuka chapter di luar mekanisme platform.</>,
    ],
  },
  {
    title: "Data",
    items: [
      <>Email, file upload, dan IP saat upload dicatat untuk keamanan dan audit.</>,
      <>S&amp;K dapat berubah; perubahan penting diumumkan di halaman ini.</>,
    ],
  },
];

export default function ScanlatorTermsPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/scanlator/daftar" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40 transition-colors hover:text-white/70">
          <FiArrowLeft size={12} /> Kembali ke pengajuan
        </Link>

        <h1 className="mt-3 text-[19px] font-bold leading-tight">Syarat &amp; Ketentuan Scanlator</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          Berlaku untuk semua pemilik Akun Translation. Dengan mengajukan, kamu menyetujui seluruh aturan ini.
          <span className="text-white/25"> Diperbarui 5 November 2026.</span>
        </p>

        <div className="mt-5 divide-y divide-white/[.06] border-y border-white/[.06]">
          {SECTIONS.map((s, i) => (
            <section key={s.title} className="py-4">
              <h2 className="flex items-baseline gap-2 text-[13px] font-bold text-white">
                <span className="text-[11px] font-semibold text-white/25">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <ul className="mt-2 space-y-1.5 pl-6">
                {s.items.map((item, j) => (
                  <li key={j} className="relative text-[12px] leading-relaxed text-white/55 before:absolute before:-left-3 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-white/20">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <Link href="/scanlator/daftar" className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--accent)] text-[12px] font-bold">
          Setuju &amp; ajukan Akun Translation
        </Link>
      </div>
    </main>
  );
}
