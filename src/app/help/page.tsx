import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help - Ryukomik",
};

export default function HelpPage() {
  return (
    <main className="rk-page px-4 pb-24 pt-20 text-white">
      <div className="rk-card mx-auto max-w-2xl rounded-3xl p-5">
        <h1 className="mb-4 text-2xl font-black">❓ Help (Bantuan)</h1>

        <div className="space-y-5 text-sm leading-relaxed text-white/72">
          {/* ================= CARA MEMBACA ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">
              📖 Cara Membaca Komik
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pilih komik dari halaman utama</li>
              <li>Klik chapter yang ingin dibaca</li>
              <li>Gunakan scroll atau tap untuk navigasi halaman</li>
            </ul>
          </div>

          {/* ================= MODE OFFLINE ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">📥 Mode Offline</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Gunakan tombol <strong>Download</strong> pada chapter
              </li>
              <li>
                Komik yang sudah diunduh dapat dibaca tanpa koneksi internet
              </li>
              <li>
                Akses melalui menu <strong>Download / Offline</strong>
              </li>
            </ul>
          </div>

          {/* ================= MASALAH UMUM ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">⚠️ Masalah Umum</h2>

            <p className="font-medium text-white mt-2">
              Komik tidak bisa dibuka?
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pastikan koneksi internet aktif (untuk mode online)</li>
              <li>Coba refresh halaman</li>
            </ul>

            <p className="font-medium text-white mt-3">
              Mode offline tidak muncul?
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pastikan chapter sudah berhasil diunduh</li>
              <li>Gunakan browser yang mendukung PWA (Chrome, Edge)</li>
            </ul>
          </div>

          {/* ================= HAPUS OFFLINE ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">
              🗑 Hapus Konten Offline
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Masuk ke halaman <strong>Download</strong>
              </li>
              <li>Tekan ikon hapus pada komik atau chapter</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
