import type { Metadata } from "next";
import Link from "next/link";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiFileText, FiShield, FiUserX } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Kebijakan Hak Cipta & Takedown (DMCA) — Ryukomik",
  description:
    "Cara melaporkan konten yang melanggar hak cipta di Ryukomik, data yang perlu disertakan, alur penanganan, dan kebijakan pelanggaran berulang.",
};

const STEPS = [
  "Isi laporan lewat formulir resmi (tautan di bawah). Pilih jenis laporan Hak Cipta.",
  "Sertakan judul seri/chapter, tautan halaman, dan bukti bahwa kamu pemegang hak atau kuasanya.",
  "Tim kami memverifikasi laporan maksimal 2×24 jam kerja.",
  "Kalau valid, konten disembunyikan/dihapus dan pengunggah menerima surat peringatan atau suspend.",
  "Kamu menerima balasan berisi hasil penanganan lewat kontak yang kamu isi.",
];

export default function DmcaPage() {
  return (
    <main className="rk-page min-h-screen px-4 pb-24 pt-20 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.03] text-[var(--accent-2)]">
            <FiShield size={18} />
          </span>
          <div>
            <h1 className="text-[19px] font-bold leading-tight">Kebijakan Hak Cipta &amp; Takedown</h1>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Berlaku untuk seluruh konten di Ryukomik, termasuk karya yang diunggah tim Scanlator.
              <span className="text-white/25"> Diperbarui 6 November 2026.</span>
            </p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-white/[.06] border-y border-white/[.06]">
          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FiFileText size={13} className="text-[var(--accent-2)]" /> 1. Komitmen kami
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
              Ryukomik adalah platform yang menampilkan karya terjemahan dari komunitas. Kami tidak
              mengklaim kepemilikan atas karya asli. Setiap pemegang hak dapat meminta konten
              dihapus, dan kami memproses permintaan yang valid tanpa perlu proses pengadilan.
            </p>
          </section>

          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FiAlertTriangle size={13} className="text-[var(--accent-2)]" /> 2. Cara melaporkan
            </h2>
            <ol className="mt-2 space-y-1.5 pl-5 text-[12px] leading-relaxed text-white/60">
              {STEPS.map((step) => (
                <li key={step} className="list-decimal">{step}</li>
              ))}
            </ol>
            <Link
              href="/scanlator/lapor"
              className="mt-3 inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-4 text-[12px] font-bold text-white"
            >
              Buka formulir laporan
            </Link>
          </section>

          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FiCheckCircle size={13} className="text-[var(--accent-2)]" /> 3. Data yang perlu disertakan
            </h2>
            <ul className="mt-2 space-y-1.5 pl-5 text-[12px] leading-relaxed text-white/60">
              <li className="list-disc">Nama lengkap dan kontak yang bisa dibalas (email/Telegram).</li>
              <li className="list-disc">Judul karya asli, penerbit/pemegang hak, dan negara terbit.</li>
              <li className="list-disc">Tautan halaman Ryukomik yang memuat konten tersebut.</li>
              <li className="list-disc">Bukti kepemilikan atau surat kuasa (screenshot kontrak, halaman resmi penerbit, dsb.).</li>
              <li className="list-disc">Pernyataan bahwa laporan dibuat dengan itikad baik dan informasinya benar.</li>
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              Laporan tanpa bukti kepemilikan tetap kami terima, tetapi prosesnya lebih lama karena
              perlu verifikasi tambahan.
            </p>
          </section>

          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FiClock size={13} className="text-[var(--accent-2)]" /> 4. Waktu penanganan
            </h2>
            <ul className="mt-2 space-y-1.5 pl-5 text-[12px] leading-relaxed text-white/60">
              <li className="list-disc">Verifikasi awal: maksimal <b className="text-white/80">2×24 jam kerja</b>.</li>
              <li className="list-disc">Konten yang jelas melanggar langsung disembunyikan saat verifikasi.</li>
              <li className="list-disc">Laporan yang kompleks (sengketa kepemilikan) bisa butuh sampai 7 hari kerja.</li>
            </ul>
          </section>

          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FiUserX size={13} className="text-[var(--accent-2)]" /> 5. Sanksi &amp; pelanggaran berulang
            </h2>
            <ul className="mt-2 space-y-1.5 pl-5 text-[12px] leading-relaxed text-white/60">
              <li className="list-disc">Pelanggaran pertama: konten dihapus + surat peringatan (SP1).</li>
              <li className="list-disc">Pelanggaran kedua: suspend upload 7 hari dan konten terkait disembunyikan.</li>
              <li className="list-disc">Pelanggaran ketiga: akses Scanlator dicabut permanen.</li>
              <li className="list-disc">Tim yang mengunggah ulang konten yang sudah dihapus langsung dicabut aksesnya.</li>
            </ul>
          </section>

          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">6. Banding</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
              Pengunggah yang merasa kontennya dihapus secara keliru dapat mengajukan banding lewat
              formulir yang sama (jenis laporan <b className="text-white/80">Banding</b>) dalam 14 hari.
              Sertakan bukti izin atau hak untuk menampilkan karya. Selama banding diproses, konten
              tetap tersembunyi.
            </p>
          </section>

          <section className="py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-white">7. Tanggung jawab pengunggah</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
              Setiap tim Scanlator wajib mencentang pernyataan bahwa karya yang diunggah adalah hasil
              terjemahan sendiri atau sudah mendapat izin. Pernyataan itu tersimpan sebagai bukti dan
              bisa kami tunjukkan bila terjadi sengketa.
            </p>
          </section>
        </div>

        <div className="mt-5 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
          <p className="text-[12px] font-bold text-white">Butuh kontak langsung?</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
            Kirim laporan lewat formulir di atas — semua laporan masuk ke antrean admin dan dibalas
            melalui kontak yang kamu isi. Untuk urusan hukum, tulis pada bagian detail laporan dengan
            subjek &quot;DMCA&quot;.
          </p>
          <Link href="/scanlator/lapor" className="mt-2 inline-block text-[11px] font-bold text-[var(--accent-2)]">
            Laporkan konten
          </Link>
        </div>
      </div>
    </main>
  );
}
