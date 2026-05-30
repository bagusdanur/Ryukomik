import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Ryukomik",
};

export default function TermsPage() {
  return (
    <main className="rk-page px-4 pb-24 pt-20 text-white">
      <div className="rk-card mx-auto max-w-2xl rounded-3xl p-5">
        <h1 className="mb-4 text-2xl font-black">
          📜 Terms of Service (Syarat & Ketentuan)
        </h1>

        <div className="space-y-5 text-sm leading-relaxed text-white/72">
          <p>
            Dengan mengakses Ryukomik, Anda setuju terhadap ketentuan berikut:
          </p>

          {/* ================= 1 ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">
              1️⃣ Penggunaan Layanan
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ryukomik hanya untuk penggunaan pribadi dan non-komersial</li>
              <li>Dilarang menggunakan layanan untuk tujuan ilegal</li>
            </ul>
          </div>

          {/* ================= 2 ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">2️⃣ Hak Cipta</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Semua komik adalah milik pemegang hak cipta masing-masing</li>
              <li>Ryukomik tidak mengklaim kepemilikan konten</li>
              <li>
                Jika Anda adalah pemilik hak cipta dan keberatan, silakan
                hubungi kami untuk penghapusan konten
              </li>
            </ul>
          </div>

          {/* ================= 3 ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">3️⃣ Mode Offline</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fitur offline hanya menyimpan cache lokal</li>
              <li>Konten offline dapat dihapus sewaktu-waktu oleh pengguna</li>
            </ul>
          </div>

          {/* ================= 4 ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">
              4️⃣ Batasan Tanggung Jawab
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kerugian akibat penggunaan layanan</li>
              <li>Konten dari sumber eksternal</li>
              <li>Gangguan teknis di luar kendali kami</li>
            </ul>
          </div>

          {/* ================= 5 ================= */}
          <div>
            <h2 className="font-semibold text-white mb-1">
              5️⃣ Perubahan Layanan
            </h2>
            <p>
              Kami berhak mengubah, menambah, atau menghentikan layanan kapan
              saja tanpa pemberitahuan terlebih dahulu.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
