import type { Metadata } from "next";
import Link from "next/link";
import { FiBookOpen, FiCheckCircle, FiCreditCard, FiFileText, FiHeart, FiShield, FiUploadCloud, FiUsers } from "react-icons/fi";

export const metadata: Metadata = {
  title: "PRD Scanlator — Ryukomik",
  description: "Product Requirement Document fitur Scanlator: user upload hasil TL di Ryukomik.",
  robots: { index: false, follow: false },
};

const sectionClass = "rk-card-soft rounded-3xl p-5 sm:p-6";
const h2Class = "flex items-center gap-2 text-lg font-black text-white";
const muted = "text-sm leading-relaxed text-white/65";
const liClass = "flex gap-2 text-sm leading-relaxed text-white/70";

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className={liClass}>
      <FiCheckCircle className="mt-0.5 shrink-0 text-[var(--accent-2)]" size={14} />
      <span>{children}</span>
    </li>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[.06]">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="bg-white/[.04] text-white/80">
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[.04]">
          {rows.map((r, i) => (
            <tr key={i} className="text-white/65">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2.5 align-top ${j === 0 ? "font-semibold text-white/85" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrdScanlatorPage() {
  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rk-card rounded-3xl p-5 sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">Product Requirement Document</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Scanlator — User Upload Hasil TL</h1>
          <p className={`${muted} mt-2`}>
            versi 1.0 · 5 Nov 2026 · Status: rencana (belum dikerjakan)
          </p>
          <p className={`${muted} mt-3`}>
            Platform komik terbuka seperti HoloToon: pengguna tidak hanya membaca, tetapi dapat
            mengunggah hasil terjemahan mereka sendiri. Setiap seri menampilkan atribusi
            <strong className="text-white"> “Diunggah oleh &lt;Scanlator&gt;”</strong> beserta tautan ke profil Scanlator-nya.
            Keputusan monetisasi: <strong className="text-white">sistem dulu, uang sementara lewat link donate eksternal</strong> —
            tanpa saldo, tanpa tips di platform, tanpa revenue share.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rk-chip rounded-full px-3 py-1">MVP: Fase A–C</span>
            <span className="rk-chip rounded-full px-3 py-1">Monetisasi: link donate</span>
            <span className="rk-chip rounded-full px-3 py-1">Backlog: saldo & share</span>
          </div>
        </header>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiFileText className="text-[var(--accent-2)]" /> 1. Masalah & Tujuan</h2>
          <ul className="mt-3 space-y-2">
            <Li>Scanlator (penerjemah/pengunggah) tidak punya tempat resmi untuk mempublikasikan hasil TL di Ryukomik.</Li>
            <Li>Tujuan: user bisa apply → upload seri & chapter → review admin → terbit dengan atribusi jelas.</Li>
            <Li>Platform tidak memegang uang di MVP: dukungan finansial lewat tautan donate eksternal milik Scanlator (DANA/GOPAY, Trakteer, Tako).</Li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiUsers className="text-[var(--accent-2)]" /> 2. Peran & Hak Akses</h2>
          <div className="mt-3">
            <Table
              head={["Peran", "Cara dapat", "Hak"]}
              rows={[
                ["User biasa", "Default (login)", "Baca, bookmark, komentar"],
                ["Akun Translation", "Apply Request → admin setujui", "Prasyarat wajib sebelum bisa jadi Scanlator; belum bisa upload sebelum aktif"],
                ["Scanlator", "Punya Akun Translation aktif", "Upload seri/chapter (status review), atur tautan donate, lihat statistik karya"],
                ["Admin", "Existing", "Review semua upload, edit/hapus paksa, flag 18+, cabut akses Scanlator"],
              ]}
            />
          </div>
          <p className={`${muted} mt-3`}>Role disimpan di <code className="text-white/80">social_profiles.role = 'scanlator'</code> (nilai baru di samping user/admin/staff).</p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiUploadCloud className="text-[var(--accent-2)]" /> 3. Alur Kerja</h2>
          <ol className="mt-3 space-y-2">
            <Li><strong className="text-white">Tahap 0 — Buat Akun Translation dulu</strong> — user wajib mengajukan <strong className="text-white">Apply Request Akun Translation</strong> (nama tim/handle, deskripsi, contoh hasil TL, pernyataan orisinalitas). Tanpa akun Translation yang disetujui, tidak ada akses upload — tidak sembarangan user.</Li>
            <Li><strong className="text-white">ACC Translation</strong> — admin menyetujui/menolak pengajuan di dashboard. Yang ditolak tidak bisa upload apa pun.</Li>
            <Li><strong className="text-white">Jadi Scanlator</strong> — setelah Akun Translation aktif, Scanlator bisa upload seri & chapter (tetap lewat review per upload).</Li>
            <Li><strong className="text-white">Review apply</strong> — admin ACC/Tolak di dashboard; notifikasi Telegram ke admin dan ke user.</Li>
            <Li><strong className="text-white">Upload seri</strong> — judul, cover, deskripsi, genre, type, status, toggle 18+ (satu-satunya penentu filter).</Li>
            <Li><strong className="text-white">Upload chapter</strong> — nomor, judul bebas, gambar (maks 30 MB/chapter, kuota 2 GB/Scanlator), kompresi otomatis + watermark.</Li>
            <Li><strong className="text-white">Review chapter</strong> — ACC → terbit + notifikasi Telegram; Tolak → catatan, bisa ajukan ulang.</Li>
            <Li><strong className="text-white">Tampil publik</strong> — atribusi “Diunggah oleh” di kartu, detail, tiap chapter, dan halaman profil Scanlator.</Li>
          </ol>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiHeart className="text-[var(--accent-2)]" /> 4. Monetisasi (diputuskan)</h2>
          <ul className="mt-3 space-y-2">
            <Li><strong className="text-white">MVP:</strong> tautan donate eksternal per Scanlator (DANA/GOPAY, Trakteer, Tako) di profil + blok “Dukung kami!” di detail seri.</Li>
            <Li><strong className="text-white">Tidak di MVP:</strong> saldo Scanlator, tombol tips di platform, revenue share premium, pencairan — semua backlog Fase Later.</Li>
            <Li>Alasan: uang tidak lewat platform = tidak ada kewajiban audit/pencairan/sengketa di tahap awal.</Li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiShield className="text-[var(--accent-2)]" /> 8. S&K (halaman publik terpisah)</h2>
          <p className={muted + " mt-2"}>
            Seluruh Syarat &amp; Ketentuan Scanlator dipublikasikan di halaman publik
            <Link href="/aturan/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2"> /aturan/scanlator</Link> —
            bukan di dokumen PRD internal ini. Isi PRD tidak lagi memuat aturan untuk menjaga privasi internal.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiCheckCircle className="text-[var(--accent-2)]" /> 9. Task List (urutan kerjakan)</h2>
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white/50">Fase A — Identitas & Akun Translation</p>
              <ul className="mt-2 space-y-1.5">
                <Li>A1. Migrasi DB: tabel apply request + kolom review/owner di project</Li>
                <Li>A2. Halaman Apply Request Akun Translation (handle, contoh TL, checkbox S&K)</Li>
                <Li>A3. API apply + validasi anti-duplikat handle + rate-limit</Li>
                <Li>A4. Antrean ACC di dashboard admin + notifikasi Telegram</Li>
                <Li>A5. Role scanlator aktif setelah ACC; badge di profil; tanpa itu tidak bisa upload</Li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white/50">Fase B — Upload + Review</p>
              <ul className="mt-2 space-y-1.5">
                <Li>B1. Form upload seri (judul, cover, deskripsi, genre, toggle 18+)</Li>
                <Li>B2. Form upload chapter (nomor, judul bebas, gambar, maks 30 MB, kuota 2 GB)</Li>
                <Li>B3. Kompresi otomatis + watermark nama tim di halaman terakhir</Li>
                <Li>B4. Status review per seri/chapter + catatan admin</Li>
                <Li>B5. Atribusi “Diunggah oleh” di kartu, detail, tiap chapter</Li>
                <Li>B6. Halaman profil Scanlator (karya, views, rating)</Li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white/50">Fase C — Link Donate (monetisasi MVP)</p>
              <ul className="mt-2 space-y-1.5">
                <Li>C1. Field tautan donate di profil Scanlator + validasi https/host</Li>
                <Li>C2. Blok “Dukung kami!” di halaman detail seri</Li>
                <Li>C3. Uji end-to-end: apply → ACC → upload → review → terbit → klik donate</Li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white/50">Fase F — Pengerasan (setelah MVP)</p>
              <ul className="mt-2 space-y-1.5">
                <Li>F1. Kuota storage & rate-limit upload</Li>
                <Li>F2. Anti-duplikat slug/judul + anti re-upload</Li>
                <Li>F3. Jalur takedown/DMCA (turunkan &lt; 1×24 jam)</Li>
                <Li>F4. Audit log upload/review</Li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-white/50">Fase Later — Backlog (jangan dibangun sebelum MVP)</p>
              <ul className="mt-2 space-y-1.5">
                <Li>L1. Saldo Scanlator + tabel transaksi</Li>
                <Li>L2. Tombol tips di platform + ACC bukti TF</Li>
                <Li>L3. Revenue share premium 70/30 + laporan per seri</Li>
                <Li>L4. Pencairan saldo manual</Li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
