import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiDisc,
  FiExternalLink,
  FiFileText,
  FiFolder,
  FiHardDrive,
  FiHelpCircle,
  FiImage,
  FiLayers,
  FiSend,
  FiShield,
  FiUploadCloud,
  FiUser,
  FiUsers,
} from "react-icons/fi";

export const metadata: Metadata = {
  title: "Panduan Scanlator — Cara Upload Seri & Chapter",
  description:
    "Panduan lengkap untuk scanlator Ryukomik: cara mengajukan akun, membuat seri, mengunggah chapter, sampai chapter terbit dan tampil di situs.",
  alternates: { canonical: "https://ryukomik.com/scanlator/panduan" },
};

const STEPS = [
  { id: "ajukan", title: "Ajukan akun", icon: FiUser, time: "±5 menit" },
  { id: "studio", title: "Kenali studio", icon: FiLayers, time: "2 menit" },
  { id: "seri", title: "Buat seri", icon: FiBookOpen, time: "3 menit" },
  { id: "chapter", title: "Upload chapter", icon: FiUploadCloud, time: "5 menit" },
  { id: "review", title: "Tunggu review", icon: FiShield, time: "maks 1×24 jam" },
  { id: "kuota", title: "Jaga kuota", icon: FiHardDrive, time: "rutin" },
];

const SERIES_FIELDS = [
  ["Judul seri", "Wajib", "Maksimal 200 karakter. Tulis judul yang dipakai pembaca, bukan judul file."],
  ["Author", "Opsional", "Nama kreator asli, bukan nama tim kamu."],
  ["Cover", "Wajib", "JPG/PNG/WebP, otomatis jadi WebP kualitas 95, maksimal 30 MB."],
  ["Deskripsi", "Wajib", "Maksimal 3.000 karakter. Ceritakan premis tanpa spoiler besar."],
  ["Tipe", "Wajib", "Manhwa, Manhua, Manga, atau Novel."],
  ["Genre", "Wajib", "Pisahkan dengan koma, contoh: Aksi, Fantasi, Romansa."],
  ["Tanda 18+", "Sesuai isi", "Centang kalau seri memuat konten dewasa. Cover akan diblur di daftar."],
  ["Hak terjemahan", "Wajib", "Konfirmasi bahwa kamu berhak menerjemahkan dan menerbitkan seri ini."],
];

const FAQ = [
  {
    q: "Berapa lama pengajuan akun diproses?",
    a: "Maksimal 1×24 jam kerja. Status bisa kamu lihat di halaman /scanlator/daftar — akan berubah dari “Menunggu review” menjadi “Akun Translation aktif”. Kalau lebih dari itu, tanyakan di Discord dengan menyebut handle kamu.",
  },
  {
    q: "Berapa lama chapter masuk review?",
    a: "Biasanya di hari yang sama. Admin memeriksa urutan halaman, kualitas gambar, dan kelengkapan data. Kalau ada yang perlu diperbaiki, statusnya jadi “Perlu revisi” dan catatan admin muncul di studio.",
  },
  {
    q: "Upload berhenti di tengah, apakah harus ulang dari awal?",
    a: "Tidak. Sistem mencoba mengirim ulang otomatis sampai 3 kali. Kalau tetap gagal, buka studio lagi — chapter yang sudah terkirim tidak akan terkirim dua kali. Penyebab paling umum adalah koneksi terputus saat mengunggah banyak gambar sekaligus; coba unggah 10–20 gambar per batch.",
  },
  {
    q: "Kenapa gambar hasil upload terlihat lebih buram?",
    a: "Sistem mengubah gambar ke WebP kualitas 95 tanpa mengubah ukuran. Kalau sumbernya sudah kecil, hasilnya ikut kecil. Jangan menaikkan resolusi dengan upscale — hasilnya tetap buram dan ukuran file membengkak. Pakai gambar asli dari RAW.",
  },
  {
    q: "Bisa mengubah judul, cover, atau deskripsi setelah terbit?",
    a: "Bisa, lewat tab Project → pilih seri → Edit. Perubahan metadata tidak memicu review ulang. Yang memicu review ulang hanya perubahan isi chapter yang sudah terbit.",
  },
  {
    q: "Bisa menghapus chapter yang sudah terbit?",
    a: "Bisa, dari tab Project. Tapi chapter yang sudah terlanjur dibaca pembaca sebaiknya diganti, bukan dihapus — supaya riwayat baca mereka tidak rusak.",
  },
  {
    q: "Handle saya bisa diubah?",
    a: "Tidak. Handle dipakai di URL profil publik dan tautan seri, jadi sifatnya permanen. Pilih dengan hati-hati saat mengajukan.",
  },
  {
    q: "Kenapa kuota penuh padahal file saya sedikit?",
    a: "Kuota menghitung seluruh file di folder akun kamu, termasuk gambar yang sudah tidak dipakai chapter mana pun. Pakai tombol “Bersihkan file tak terpakai” di tab Ringkasan untuk membuang sisa file lama.",
  },
  {
    q: "Apakah scanlator dapat premium?",
    a: "Ya, gratis selama status akun aktif. Iklan juga tidak muncul di halaman baca kamu.",
  },
  {
    q: "Boleh memasang tautan donasi?",
    a: "Boleh. Isi di tab Profil (DANA/GoPay, Trakteer, Tako). Tautannya tampil di halaman seri yang kamu unggah.",
  },
];

const RULES = [
  ["Hak terjemahan", "Hanya unggah seri yang boleh kamu terjemahkan. Jangan mengambil alih seri yang sudah dikerjakan tim lain tanpa izin."],
  ["Kualitas", "Gunakan RAW dengan resolusi wajar. Jangan upscale, jangan memberi filter yang merusak detail."],
  ["Kerapian", "Bersihkan teks asli sebelum menaruh terjemahan. Urutan halaman harus benar dari atas ke bawah."],
  ["Watermark", "Watermark tim kamu sendiri boleh. Jangan menutupi panel penting atau menaruh watermark pihak lain."],
  ["Konten 18+", "Wajib menandai seri dengan centang 18+. Tanpa tanda, seri tampil ke semua pembaca dan bisa diturunkan admin."],
  ["Judul", "Jangan menambahkan kata seperti “Update”, “New”, atau emoji ke judul seri."],
];

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-black text-white">
      {n}
    </span>
  );
}

function Screenshot({ src, alt, caption, height = 420 }: { src: string; alt: string; caption: string; height?: number }) {
  return (
    <figure className="mt-4 overflow-hidden rounded-2xl border border-white/[.08] bg-[#0d0d12]">
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover object-top" />
      </div>
      <figcaption className="flex items-center justify-between gap-3 border-t border-white/[.06] px-3 py-2 text-[11px] text-white/40">
        <span>{caption}</span>
        <a href={src} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-[var(--accent-2)] hover:underline">
          Buka penuh <FiExternalLink size={10} />
        </a>
      </figcaption>
    </figure>
  );
}

export default function PanduanScanlatorPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      {/* Header */}
      <header className="rounded-3xl border border-emerald-400/12 bg-gradient-to-br from-emerald-500/[.10] via-[#13131a] to-[#13131a] p-5 sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/70">Panduan Scanlator</p>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
          Dari pengajuan sampai chapter terbit
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
          Semua langkah mengunggah seri dan chapter di Ryukomik, ditulis urut. Ikuti dari atas ke bawah,
          sekali jalan langsung paham.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/scanlator/daftar" className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110">
            Ajukan akun <FiArrowRight size={13} />
          </Link>
          <Link href="/scanlator" className="rounded-xl border border-white/12 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[.05]">
            Buka studio
          </Link>
          <a href="https://discord.gg/Sf8pPRq4aj" target="_blank" rel="noreferrer" className="rounded-xl border border-white/12 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[.05]">
            Tanya di Discord
          </a>
        </div>
      </header>

      {/* Daftar isi */}
      <nav className="sticky top-2 z-10 mt-4 -mx-1 overflow-x-auto rounded-2xl border border-white/[.07] bg-[#13131a]/95 px-1.5 py-1.5 backdrop-blur">
        <ul className="flex items-center gap-1 whitespace-nowrap">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white/55 transition hover:bg-white/[.06] hover:text-white">
                <span className="text-[10px] text-white/30">{i + 1}</span>
                {s.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#faq" className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white/55 transition hover:bg-white/[.06] hover:text-white">
              <FiHelpCircle size={11} /> FAQ
            </a>
          </li>
        </ul>
      </nav>

      {/* 1. Ajukan akun */}
      <section id="ajukan" className="mt-8 scroll-mt-16">
        <div className="flex items-center gap-2">
          <StepBadge n={1} />
          <h2 className="text-lg font-black">Ajukan akun Translation</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Akun scanlator tidak dibuat otomatis — kamu mengajukan, lalu admin memeriksa. Sebelum mengajukan,
          <strong className="text-white/80"> login dulu dengan Google</strong>, karena formulirnya butuh akun.
        </p>
        <ol className="mt-3 space-y-2 text-sm text-white/65">
          <li className="flex gap-2"><span className="text-white/30">1.</span> Buka <code className="rounded bg-white/[.07] px-1.5 py-0.5 text-[12px]">ryukomik.com/scanlator/daftar</code></li>
          <li className="flex gap-2"><span className="text-white/30">2.</span> Isi nama tim, handle, pengalaman, dan username Discord</li>
          <li className="flex gap-2"><span className="text-white/30">3.</span> Centang Syarat &amp; Ketentuan, lalu kirim</li>
          <li className="flex gap-2"><span className="text-white/30">4.</span> Tunggu maksimal 1×24 jam — status berubah jadi “Akun Translation aktif”</li>
        </ol>
        <Screenshot
          src="/docs/scanlator/01-daftar.png"
          alt="Halaman pengajuan akun Translation di Ryukomik"
          caption="Halaman pengajuan. Login Google dulu, lalu formulir terbuka."
        />
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-[12px] leading-relaxed text-amber-100/80">
          <strong>Handle tidak bisa diubah</strong> setelah akun aktif — dipakai di URL publik dan tautan seri.
        </div>
      </section>

      {/* 2. Studio */}
      <section id="studio" className="mt-9 scroll-mt-16">
        <div className="flex items-center gap-2">
          <StepBadge n={2} />
          <h2 className="text-lg font-black">Kenali tiga tab studio</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Setelah akun aktif, buka <code className="rounded bg-white/[.07] px-1.5 py-0.5 text-[12px]">/scanlator</code>. Studio
          punya tiga tab inti, plus tombol upload di dalamnya.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { icon: FiFolder, title: "Ringkasan", desc: "Statistik tayangan, kuota storage, dan project terpopuler." },
            { icon: FiBookOpen, title: "Project", desc: "Daftar seri dan chapter. Dari sini juga edit dan pratinjau." },
            { icon: FiUser, title: "Profil", desc: "Nama tim, kontak Discord, banner, avatar, tautan donasi." },
          ].map((t) => (
            <div key={t.title} className="rounded-2xl border border-white/[.07] bg-[#13131a] p-4">
              <t.icon className="text-emerald-300" size={17} />
              <p className="mt-2 text-sm font-black">{t.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">{t.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Tombol <strong className="text-white/80">Upload seri</strong> dan <strong className="text-white/80">Upload chapter</strong> ada
          di tab Project. Keduanya membuka formulir di halaman yang sama.
        </p>
      </section>

      {/* 3. Buat seri */}
      <section id="seri" className="mt-9 scroll-mt-16">
        <div className="flex items-center gap-2">
          <StepBadge n={3} />
          <h2 className="text-lg font-black">Buat seri baru</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Seri dibuat sekali, chapter bisa ditambah kapan saja. Isi formulir <em>Upload seri</em> dengan lengkap:
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/[.07]">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-white/[.04] text-[10px] uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-3 py-2 font-bold">Kolom</th>
                <th className="px-3 py-2 font-bold">Wajib</th>
                <th className="px-3 py-2 font-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.05]">
              {SERIES_FIELDS.map(([label, req, desc]) => (
                <tr key={label} className="align-top">
                  <td className="px-3 py-2.5 font-bold text-white/80">{label}</td>
                  <td className="px-3 py-2.5 text-white/45">{req}</td>
                  <td className="px-3 py-2.5 text-white/55">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 rounded-xl border border-sky-300/15 bg-sky-400/[.06] p-3 text-[12px] leading-relaxed text-sky-100/80">
          <strong>Tips cover:</strong> pakai rasio 3:4 (contoh 600×800 px), jangan taruh teks penting di bagian bawah —
          kartu cover dipotong mengikuti layar.
        </div>
        <p className="mt-3 text-sm text-white/55">
          Setelah dikirim, seri berstatus <strong className="text-white/80">menunggu review</strong>. Kamu masih bisa
          memperbaiki metadata sambil menunggu.
        </p>
      </section>

      {/* 4. Chapter */}
      <section id="chapter" className="mt-9 scroll-mt-16">
        <div className="flex items-center gap-2">
          <StepBadge n={4} />
          <h2 className="text-lg font-black">Upload chapter</h2>
        </div>
        <ol className="mt-3 space-y-2 text-sm text-white/65">
          <li className="flex gap-2"><span className="text-white/30">1.</span> Tab <strong className="text-white/80">Project</strong> → pilih seri → <strong className="text-white/80">Upload chapter</strong></li>
          <li className="flex gap-2"><span className="text-white/30">2.</span> Isi nomor chapter (boleh desimal, misal <code className="rounded bg-white/[.07] px-1.5 py-0.5 text-[12px]">12.5</code>)</li>
          <li className="flex gap-2"><span className="text-white/30">3.</span> Pilih semua gambar halaman sekaligus</li>
          <li className="flex gap-2"><span className="text-white/30">4.</span> Urutkan dengan drag, atau pakai tombol panah</li>
          <li className="flex gap-2"><span className="text-white/30">5.</span> Kirim — masuk antrean review</li>
        </ol>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[.07] bg-[#13131a] p-4">
            <FiImage className="text-emerald-300" size={16} />
            <p className="mt-2 text-[12px] font-bold">Format gambar</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
              JPG, PNG, atau WebP. Sistem otomatis mengubah ke WebP kualitas 95. Maksimal 30 MB per file.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[.07] bg-[#13131a] p-4">
            <FiLayers className="text-emerald-300" size={16} />
            <p className="mt-2 text-[12px] font-bold">Urutan halaman</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
              Nama file <code className="text-white/60">001</code>, <code className="text-white/60">002</code>, … membuat urutan otomatis benar saat dipilih.
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-[12px] leading-relaxed text-amber-100/80">
          <strong>Strip panjang:</strong> gambar yang tingginya melebihi 12.000 px tidak ikut dikonversi dan
          tetap berukuran besar — pembaca akan terasa berat. Potong jadi beberapa bagian (misal tiap 8.000 px)
          sebelum diunggah.
        </div>
        <p className="mt-3 text-sm text-white/55">
          Pratinjau di studio <strong className="text-white/80">tidak dihitung</strong> sebagai tayangan, jadi
          aman dipakai untuk mengecek hasil sebelum terbit.
        </p>
      </section>

      {/* 5. Review */}
      <section id="review" className="mt-9 scroll-mt-16">
        <div className="flex items-center gap-2">
          <StepBadge n={5} />
          <h2 className="text-lg font-black">Review dan terbit</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Semua chapter dan seri baru melewati review admin sebelum tampil di situs.
        </p>
        <div className="mt-3 space-y-2">
          {[
            { icon: FiClock, tone: "amber", title: "Menunggu review", desc: "Sudah masuk antrean. Belum tampil ke pembaca." },
            { icon: FiAlertTriangle, tone: "rose", title: "Perlu revisi", desc: "Ada catatan admin di studio. Perbaiki, lalu kirim ulang." },
            { icon: FiCheckCircle, tone: "emerald", title: "Disetujui", desc: "Chapter terbit dan notifikasi otomatis dikirim ke channel Discord scanlator." },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-white/[.07] bg-[#13131a] p-3.5">
              <s.icon size={16} className={s.tone === "amber" ? "mt-0.5 text-amber-300" : s.tone === "rose" ? "mt-0.5 text-rose-300" : "mt-0.5 text-emerald-300"} />
              <div>
                <p className="text-[12.5px] font-bold">{s.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/45">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Kuota */}
      <section id="kuota" className="mt-9 scroll-mt-16">
        <div className="flex items-center gap-2">
          <StepBadge n={6} />
          <h2 className="text-lg font-black">Jaga kuota storage</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Setiap akun punya kuota <strong className="text-white/80">10 GB</strong>. Indikatornya ada di tab
          Ringkasan, di bawah tombol upload.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-white/65">
          <li className="flex gap-2"><FiCheckCircle className="mt-0.5 shrink-0 text-emerald-300" size={14} /> Di bawah 70% — aman, lanjut upload seperti biasa.</li>
          <li className="flex gap-2"><FiAlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={14} /> 70–90% — mulai rapikan chapter lama yang sudah tidak dibaca.</li>
          <li className="flex gap-2"><FiAlertTriangle className="mt-0.5 shrink-0 text-rose-300" size={14} /> Di atas 90% — upload bisa ditolak sampai ada ruang.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Ada tombol <strong className="text-white/80">Bersihkan file tak terpakai</strong> di tab Ringkasan.
          Tombol itu hanya menghapus gambar yang tidak dipakai chapter mana pun — isi chapter yang masih terbit
          tidak disentuh.
        </p>
        <Screenshot
          src="/docs/scanlator/03-direktori.png"
          alt="Direktori scanlator Ryukomik"
          caption="Profil tim kamu muncul di direktori scanlator setelah akun aktif."
          height={360}
        />
      </section>

      {/* Aturan */}
      <section id="aturan" className="mt-9 scroll-mt-16">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <FiFileText className="text-emerald-300" size={17} /> Aturan konten
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/[.07]">
          {RULES.map(([label, desc], i) => (
            <div key={label} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4 ${i % 2 ? "bg-white/[.02]" : ""}`}>
              <p className="w-40 shrink-0 text-[12.5px] font-bold text-white/80">{label}</p>
              <p className="text-[12px] leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contoh hasil */}
      <section id="hasil" className="mt-9 scroll-mt-16">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <FiUsers className="text-emerald-300" size={17} /> Hasilnya seperti apa
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Seri yang kamu unggah tampil di halaman profil tim, lengkap dengan badge Scanlator dan tautan donasi
          kalau kamu mengisinya.
        </p>
        <Screenshot
          src="/docs/scanlator/02-profil.png"
          alt="Contoh halaman profil publik scanlator"
          caption="Contoh halaman publik: daftar seri, jumlah chapter, dan info tim."
          height={460}
        />
      </section>

      {/* FAQ */}
      <section id="faq" className="mt-10 scroll-mt-16">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <FiHelpCircle className="text-emerald-300" size={17} /> Pertanyaan yang sering muncul
        </h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-white/[.07] bg-[#13131a] px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-white/85">
                {item.q}
                <FiArrowRight size={13} className="shrink-0 text-white/30 transition group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-[12px] leading-relaxed text-white/50">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Bantuan */}
      <section className="mt-10 rounded-3xl border border-white/[.08] bg-[#13131a] p-5 text-center">
        <FiSend className="mx-auto text-emerald-300" size={20} />
        <h2 className="mt-2 text-base font-black">Masih bingung?</h2>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-white/50">
          Tanya di Discord dengan menyebut handle kamu. Sertakan tangkapan layar dan nama seri supaya
          admin bisa langsung memeriksa.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a href="https://discord.gg/Sf8pPRq4aj" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110">
            <FiDisc size={13} /> Discord Scanlator
          </a>
          <Link href="/scanlator" className="rounded-xl border border-white/12 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[.05]">
            Kembali ke studio
          </Link>
        </div>
      </section>
    </div>
  );
}
