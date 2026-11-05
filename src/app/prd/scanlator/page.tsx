import type { Metadata } from "next";
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
          <h2 className={h2Class}><FiShield className="text-[var(--accent-2)]" /> 5. Keamanan & Anti-Penyalahgunaan</h2>
          <ul className="mt-3 space-y-2">
            <Li>Hak cipta: pernyataan orisinalitas saat apply + form Report sebagai jalur takedown (hapus &lt; 24 jam).</Li>
            <Li>Upload: validasi magic bytes gambar, tolak SVG/script, presigned URL 15 menit, simpan di prefix <code className="text-white/80">scanlator/&lt;user_id&gt;/</code>.</Li>
            <Li>Anti bajakan: cek duplikat slug/judul mirip, rate-limit 5 chapter/jam, chapter terbit tidak bisa diganti isinya.</Li>
            <Li>Admin bisa mencabut akses Scanlator tanpa menghapus karyanya.</Li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiBookOpen className="text-[var(--accent-2)]" /> 6. Data & Fase Pengerjaan</h2>
          <div className="mt-3">
            <Table
              head={["Fase", "Isi", "Hasil"]}
              rows={[
                ["A", "Akun Translation (apply request + ACC admin), role scanlator, badge profil", "Hanya Translation terverifikasi yang bisa jadi Scanlator"],
                ["B", "Upload seri/chapter, review, atribusi publik, watermark", "Karya terbit dengan atribusi"],
                ["C", "Link donate eksternal di profil + detail", "Monetisasi pertama (tanpa pegang uang)"],
                ["Later", "Saldo, tips, share premium 70/30, pencairan", "Backlog — jangan dibangun sekarang"],
                ["F", "Kuota, anti-duplikat, takedown, audit log", "Pengerasan"],
              ]}
            />
          </div>
          <p className={`${muted} mt-3`}>
            Tabel baru: <code className="text-white/80">scanlator_applications</code>, <code className="text-white/80">scanlator_profiles</code>,
            kolom <code className="text-white/80">owner_user_id</code> + <code className="text-white/80">review_status</code> di project.
            Tabel saldo/transaksi adalah backlog Fase Later.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiCreditCard className="text-[var(--accent-2)]" /> 7. Definisi Selesai (MVP)</h2>
          <ul className="mt-3 space-y-2">
            <Li>Apply Request Akun Translation → ACC admin → upload → review → terbit berjalan end-to-end (staging build terpisah, commit + push). User tanpa Akun Translation tidak bisa upload.</Li>
            <Li>Atribusi Scanlator tampil di kartu, detail, dan tiap chapter; klik membuka profil Scanlator.</Li>
            <Li>Tautan donate bisa diklik dan hanya https + host terdaftar yang diterima.</Li>
            <Li>Tidak ada regresi: source lain, premium, filter 18+ tetap jalan seperti sekarang.</Li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}><FiShield className="text-[var(--accent-2)]" /> 8. Syarat & Ketentuan Scanlator (S&K)</h2>
          <p className={muted + " mt-2"}>
            Catatan: HoloToon tidak mempublikasikan S&K (sudah dicek: footer, /terms, /rules — tidak ada).
            S&K berikut ditulis sendiri untuk Ryukomik mengikuti norma komunitas scanlation Indonesia.
            Teks ini wajib disetujui saat Apply Request Akun Translation.
          </p>

          <h3 className="mt-4 text-sm font-black text-white">8.1 Akun & Identitas</h3>
          <ul className="mt-2 space-y-2">
            <Li>Satu orang/tim = satu akun Translation. Dilarang membuat akun ganda untuk menghindari sanksi.</Li>
            <Li>Dilarang menjual, menyewakan, atau memindahtangankan akun Translation.</Li>
            <Li>Nama tim/handle harus unik dan tidak meniru tim lain (termasuk tidak memakai nama &quot;Ryukomik&quot; atau nama tim resmi).</Li>
            <Li>Akun Translation bisa dicabut kapan saja oleh admin bila melanggar S&K ini.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.2 Hak Cipta & Orisinalitas (paling penting)</h3>
          <ul className="mt-2 space-y-2">
            <Li>Scanlator hanya boleh mengunggah karya yang <strong className="text-white">berhak diunggah</strong>: terjemahan dari sumber yang sah, karya orisinal, atau atas izin pemilik hak.</Li>
            <Li>Dilarang mengunggah ulang (re-upload) hasil TL tim lain, mentahan bajakan tanpa proses TL, atau chapter yang sudah ada di Ryukomik dari Scanlator lain.</Li>
            <Li>Scanlator bertanggung jawab penuh atas legalitas kontennya. Ryukomik bertindak sebagai platform penyalur, bukan pemilik konten.</Li>
            <Li>Setiap orang berhak mengajukan takedown lewat form Report (sertakan bukti kepemilikan). Konten dilaporkan akan diturunkan <strong className="text-white">maksimal 1×24 jam</strong> untuk diverifikasi, dan dihapus permanen bila terbukti melanggar.</Li>
            <Li>Pelanggaran hak cipta berulang = pencabutan akses permanen, tanpa peringatan.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.3 Kualitas & Tata Cara Upload</h3>
          <ul className="mt-2 space-y-2">
            <Li>Minimal 8 halaman per chapter; dilarang chapter kosong, spam chapter, atau upload bertahap untuk menaikkan angka.</Li>
            <Li>Gambar harus terbaca (resolusi wajar, tidak buram), urutan halaman benar, tidak ada halaman duplikat/ganda.</Li>
            <Li>Judul chapter sopan dan jelas — dilarang judul spam/promosi akun lain.</Li>
            <Li>Watermark nama tim wajib di halaman terakhir; dilarang watermark menyesatkan (mis. “Ryukomik Official”) bila bukan tim resmi.</Li>
            <Li>Chapter yang sudah terbit tidak boleh diganti isinya. Koreksi hanya lewat admin.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.4 Konten Terlarang</h3>
          <ul className="mt-2 space-y-2">
            <Li>Dilarang: konten ilegal, SARA, ujaran kebencian, malware/phishing di file, spam iklan, dan ajakan pindah platform secara kasar.</Li>
            <Li>Dilarang: drama antar-tim di komentar (provokasi, doxxing, sebar data pribadi siapa pun).</Li>
            <Li>Dilarang: meminta transfer/donasi di kolom komentar — dukungan hanya lewat tautan donate di profil.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.5 Konten 18+</h3>
          <ul className="mt-2 space-y-2">
            <Li>Konten dewasa <strong className="text-white">wajib</strong> ditandai lewat toggle 18+ di form seri (satu-satunya penentu filter — genre tidak berpengaruh).</Li>
            <Li>Konten 18+ hanya tampil untuk user yang toggle filter 18+-nya aktif dan sudah lewat gate umur.</Li>
            <Li>Salah tandai (dewasa dibiarkan non-18+) = sanksi langsung, karena membahayakan pembaca di bawah umur.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.6 Review, Sanksi & Pencabutan</h3>
          <ul className="mt-2 space-y-2">
            <Li>Semua upload melewati review admin sebelum terbit. Admin boleh menolak dengan catatan; Scanlator boleh perbaiki & ajukan ulang.</Li>
            <Li>Sanksi bertingkat: peringatan → penangguhan upload 7 hari → pencabutan akses. Pelanggaran hak cipta/SARA/keamanan langsung ke pencabutan.</Li>
            <Li>Pencabutan akses tidak otomatis menghapus karya yang sudah terbit; admin memutuskan per kasus.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.7 Donate & Keuangan</h3>
          <ul className="mt-2 space-y-2">
            <Li>Di MVP, dukungan finansial hanya lewat tautan donate eksternal milik Scanlator sendiri (DANA/GOPAY, Trakteer, Tako). Ryukomik tidak memungut, tidak menyimpan, dan tidak bertanggung jawab atas transaksi di luar platform.</Li>
            <Li>Tautan donate wajib milik tim yang bersangkutan dan valid. Akun donate palsu/menyesatkan = pencabutan akses.</Li>
            <Li>Dilarang menjanjikan imbalan yang tidak bisa dipenuhi (mis. “donate untuk dapat chapter eksklusif”) bila tidak ditepati.</Li>
          </ul>

          <h3 className="mt-4 text-sm font-black text-white">8.8 Data, Privasi & Perubahan</h3>
          <ul className="mt-2 space-y-2">
            <Li>Data yang dicatat: email akun, file yang diunggah, alamat IP saat upload, dan riwayat review. Dipakai hanya untuk keamanan & anti-penyalahgunaan.</Li>
            <Li>Dilarang menyebar data pribadi Scanlator lain yang kamu ketahui dari proses upload.</Li>
            <Li>S&K dapat berubah; perubahan penting diumumkan di halaman ini. Terus mengunggah setelah perubahan = menyetujui S&K terbaru.</Li>
            <Li>Kontak: lewat form Report di situs, atau Telegram admin.</Li>
          </ul>
        </section>

      </div>
    </main>
  );
}
