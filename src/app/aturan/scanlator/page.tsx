import type { Metadata } from "next";
import Link from "next/link";
import { FiAlertTriangle, FiCheckCircle, FiFileText, FiHeart, FiShield, FiUser, FiXCircle } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Scanlator — Ryukomik",
  description: "Aturan resmi untuk Scanlator di Ryukomik: akun, hak cipta, kualitas upload, konten 18+, sanksi, dan donate.",
};

/**
 * Halaman S&K Scanlator — satu-satunya sumber aturan publik.
 * PRD internal tidak memuat aturan (privasi & kejelasan).
 */
export default function ScanlatorTermsPage() {
  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="rk-card rounded-3xl p-6">
          <p className="rk-social-eyebrow"><FiFileText size={13} /> Aturan Resmi</p>
          <h1 className="mt-2 text-2xl font-black">Syarat &amp; Ketentuan Scanlator</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Berlaku untuk semua pemilik Akun Translation (Scanlator) di Ryukomik. Dengan mengajukan Akun Translation,
            kamu menyetujui seluruh aturan di halaman ini. Terakhir diperbarui: 5 November 2026.
          </p>
        </header>

        <div className="mt-4 space-y-4">
          <Section icon={<FiUser size={16} />} title="1. Akun & Identitas">
            <Li>Satu orang atau satu tim hanya boleh memiliki **satu Akun Translation** yang aktif. Akun ganda langsung ditolak saat review.</Li>
            <Li>Nama tim dan handle harus unik dan tidak meniru tim lain, penerbit resmi, atau nama "Ryukomik".</Li>
            <Li>Dilarang menjual, menyewakan, memindahkan, atau membagikan akun kepada pihak lain.</Li>
            <Li>Akun Translation hanya aktif setelah **ACC admin**. Sebelum itu, tidak ada hak upload apa pun.</Li>
          </Section>

          <Section icon={<FiShield size={16} />} title="2. Hak Cipta & Orisinalitas">
            <Li>Kamu hanya boleh mengunggah karya yang **kamu berhak untuk unggah** (hasil TL/bersih-bersih sendiri, atau karya orisinil timmu).</Li>
            <Li>Dilarang mengunggah ulang (re-upload) hasil TL scanlator lain, mentahan bajakan, atau materi tanpa izin pemiliknya.</Li>
            <Li>Scanlator bertanggung jawab penuh atas keaslian karya yang diunggah. Ryukomik hanya menyediakan platform.</Li>
            <Li>Pemegang hak atau pihak yang dirugikan dapat mengajukan takedown lewat form Report. Laporan yang terbukti akan diturunkan **maksimal 1×24 jam**.</Li>
            <Li>Pelanggaran hak cipta berulang mengakibatkan **pencabutan akses permanen** dan penghapusan seluruh karya.</Li>
          </Section>

          <Section icon={<FiFileText size={16} />} title="3. Kualitas & Upload">
            <Li>Setiap chapter wajib memuat **minimal 8 halaman** gambar yang terbaca, utuh, dan berurutan.</Li>
            <Li>Gambar harus bersih (tanpa watermark situs lain, tanpa iklan, tanpa banner promosi pihak ketiga).</Li>
            <Li>Halaman terakhir setiap chapter wajib memuat **watermark nama tim** kamu (dibuat otomatis oleh sistem).</Li>
            <Li>Judul chapter harus sopan dan tidak mengandung kata kasar, SARA, atau spam.</Li>
            <Li>Chapter yang sudah terbit tidak boleh diganti isinya. Perbaikan dilakukan lewat chapter berikutnya atau pengajuan ke admin.</Li>
            <Li>Batas teknis: maks 30 MB per gambar, maks 60 gambar per chapter, kuota tim 2 GB (Fase F).</Li>
          </Section>

          <Section icon={<FiAlertTriangle size={16} />} title="4. Konten Terlarang">
            <Li>Konten ilegal, SARA, ujaran kebencian, malware, dan spam dalam bentuk apa pun.</Li>
            <Li>Drama antar-tim, saling serang di komentar, atau memancing keributan di komunitas.</Li>
            <Li>Meminta transfer dana di kolom komentar atau menggiring pembaca keluar platform untuk transaksi.</Li>
            <Li>Judul, deskripsi, atau gambar sampul yang menipu (clickbait menyesatkan).</Li>
          </Section>

          <Section icon={<FiXCircle size={16} />} title="5. Konten 18+">
            <Li>Seri dengan konten 18+ **wajib** ditandai lewat toggle 18+ saat upload. Ini satu-satunya penentu filter — genre tidak berpengaruh.</Li>
            <Li>Seri 18+ tidak boleh dimasukkan ke daftar rekomendasi umum dan hanya tampil bagi pengguna yang mematikan filter? Sebaliknya: seri 18+ disembunyikan bagi pengguna yang mengaktifkan "Sembunyikan konten 18+" di Setting.</Li>
            <Li>Salah menandai (menyembunyikan status 18+ dari konten dewasa) adalah pelanggaran berat dan langsung dikenai sanksi.</Li>
          </Section>

          <Section icon={<FiCheckCircle size={16} />} title="6. Sanksi">
            <Li><strong className="text-white">Peringatan</strong> — pelanggaran ringan; karya terkait diturunkan sementara.</Li>
            <Li><strong className="text-white">Suspend 7 hari</strong> — pelanggaran berulang atau sedang; akses upload dibekukan.</Li>
            <Li><strong className="text-white">Pencabutan akses</strong> — pelanggaran berat (hak cipta, SARA, ilegal, penipuan) atau pelanggaran berulang; seluruh karya dapat dihapus.</Li>
            <Li>Keputusan admin bersifat final. Banding dapat diajukan lewat kontak resmi Ryukomik.</Li>
          </Section>

          <Section icon={<FiHeart size={16} />} title="7. Donate & Keuangan">
            <Li>Monetisasi di masa BETA hanya melalui **tautan donate eksternal milik Scanlator sendiri** (DANA/GoPay, Trakteer, Tako, dan sejenisnya).</Li>
            <Li>Ryukomik tidak menerima, menahan, atau meneruskan dana donasi dalam bentuk apa pun.</Li>
            <Li>Dilarang memungut pembayaran untuk membuka chapter di luar mekanisme resmi platform.</Li>
          </Section>

          <Section icon={<FiShield size={16} />} title="8. Data & Perubahan">
            <Li>Data yang kamu berikan (email, file upload, alamat IP saat upload) dicatat untuk keamanan dan audit.</Li>
            <Li>Ryukomik dapat mengubah S&K ini sewaktu-waktu. Perubahan penting diumumkan di halaman ini; penggunaan berkelanjutan berarti menerima versi terbaru.</Li>
          </Section>
        </div>

        <div className="rk-card-soft mt-4 rounded-3xl p-5 text-center">
          <p className="text-sm text-white/55">Sudah paham aturannya?</p>
          <Link href="/scanlator/daftar" className="rk-btn-primary mt-3 inline-block rounded-full px-6 py-2.5 text-sm font-bold">Ajukan Akun Translation</Link>
          <p className="mt-3 text-[11px] text-white/35">Dokumen PRD internal tidak dipublikasikan di halaman ini.</p>
        </div>
      </div>
    </main>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rk-card-soft rounded-3xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-black text-white">
        <span className="text-[var(--accent-2)]">{icon}</span> {title}
      </h2>
      <ul className="mt-3 space-y-2.5">{children}</ul>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-white/60">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
      <span>{children}</span>
    </li>
  );
}
