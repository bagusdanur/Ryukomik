import type { Metadata } from "next";
import { FiLock, FiChevronRight } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Privacy Policy - Ryukomik",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="rk-page px-4 pb-24 pt-20 text-white">
      <div className="rk-card mx-auto max-w-2xl rounded-3xl p-5">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-black">
          <FiLock className="text-[var(--accent-2)]" /> Privacy Policy (Kebijakan Privasi)
        </h1>

        <p className="text-xs text-white/50 mb-4">
          Terakhir diperbarui: Februari 2026
        </p>

        <div className="space-y-5 text-sm leading-relaxed text-white/72">
          <p>
            Ryukomik menghargai dan melindungi privasi pengguna. Kebijakan ini
            menjelaskan bagaimana informasi dikelola saat Anda menggunakan
            aplikasi Ryukomik di perangkat Android maupun melalui situs web
            resmi kami.
          </p>

          <p>
            Aplikasi Ryukomik didistribusikan melalui Google Play dan
            menggunakan teknologi Trusted Web Activity (TWA) untuk menampilkan
            versi web resmi dari https://www.ryukomik.my.id.
          </p>

          {/* ================= INFO DATA ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 1. Informasi yang Kami Kumpulkan
            </h2>

            <p>
              Ryukomik tidak mengumpulkan data pribadi sensitif seperti:
            </p>

            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Nama lengkap</li>
              <li>Alamat rumah</li>
              <li>Nomor telepon</li>
              <li>Informasi pembayaran</li>
            </ul>

            <p className="mt-3">
              Namun, kami dapat memproses informasi non-pribadi secara otomatis
              seperti:
            </p>

            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Jenis perangkat</li>
              <li>Sistem operasi</li>
              <li>Jenis browser</li>
              <li>Statistik penggunaan anonim</li>
              <li>Log kesalahan (error logs)</li>
            </ul>
          </div>

          {/* ================= STORAGE ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 2. Penyimpanan Data
            </h2>

            <p>
              Ryukomik menggunakan LocalStorage, IndexedDB, Cache API, dan
              Service Worker Cache untuk mendukung fitur offline dan performa.
              Data ini disimpan secara lokal di perangkat pengguna dan tidak
              diunggah ke server kami.
            </p>
          </div>

          {/* ================= THIRD PARTY ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 3. Layanan & Konten Pihak Ketiga
            </h2>

            <p>
              Ryukomik dapat menggunakan layanan pihak ketiga seperti penyedia
              hosting atau infrastruktur server untuk menjalankan layanan.
            </p>

            <p className="mt-2">
              Konten komik yang tersedia di Ryukomik dapat berasal dari berbagai
              sumber eksternal. Kami tidak mengklaim kepemilikan atas konten
              tersebut kecuali dinyatakan secara tegas.
            </p>
          </div>

          {/* ================= COPYRIGHT ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 4. Kebijakan Hak Cipta (Copyright Policy)
            </h2>

            <p>
              Seluruh merek dagang, logo, gambar, dan konten komik adalah hak
              cipta milik pemegang hak masing-masing.
            </p>

            <p className="mt-2">
              Ryukomik tidak bermaksud melanggar hak cipta apa pun. Jika Anda
              adalah pemilik hak cipta dan menemukan konten yang perlu
              ditinjau atau dihapus, silakan hubungi kami dengan menyertakan:
            </p>

            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Identitas Anda sebagai pemegang hak</li>
              <li>URL atau detail konten yang dimaksud</li>
              <li>Bukti kepemilikan hak cipta</li>
            </ul>

            <p className="mt-2">
              Kami akan meninjau dan mengambil tindakan yang diperlukan sesuai
              hukum yang berlaku.
            </p>
          </div>

          {/* ================= SECURITY ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 5. Keamanan Data
            </h2>

            <p>
              Kami menerapkan langkah teknis yang wajar untuk menjaga keamanan
              layanan, namun tidak ada sistem yang sepenuhnya aman.
            </p>
          </div>

          {/* ================= CHILDREN ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 6. Perlindungan Anak
            </h2>

            <p>
              Ryukomik tidak secara khusus menargetkan anak di bawah usia 13
              tahun dan tidak secara sengaja mengumpulkan data pribadi dari
              anak-anak.
            </p>
          </div>

          {/* ================= CHANGES ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 7. Perubahan Kebijakan
            </h2>

            <p>
              Kebijakan ini dapat diperbarui dari waktu ke waktu. Perubahan akan
              ditampilkan pada halaman ini.
            </p>
          </div>

          {/* ================= CONTACT ================= */}
          <div>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <FiChevronRight className="text-[var(--accent-2)] shrink-0" /> 8. Kontak Kami
            </h2>

            <p>
              Untuk pertanyaan terkait privasi atau hak cipta, silakan hubungi:
            </p>

            <p className="mt-2">
              Email: ryuzunime17@gmail.com <br />
              Website: https://www.ryukomik.my.id
            </p>
          </div>

          <p className="pt-4 border-t border-white/10">
            Dengan menggunakan Ryukomik, Anda menyetujui Kebijakan Privasi ini.
          </p>
        </div>
      </div>
    </main>
  );
}
