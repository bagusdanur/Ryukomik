import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Ryukomik",
  description: "Tentang Ryukomik",
};

export default function AboutPage() {
  return (
    <main className="rk-page px-4 pb-24 pt-20 text-white">
      <div className="rk-card mx-auto max-w-2xl rounded-3xl p-5">
        <h1 className="mb-4 text-2xl font-black">
          📘 About (Tentang Ryukomik)
        </h1>

        <div className="space-y-4 text-sm leading-relaxed text-white/72">
          <p>
            Ryukomik adalah platform baca komik online yang menyediakan berbagai
            judul komik, manga, dan manhwa dengan tampilan ringan, cepat, dan
            ramah pengguna.
          </p>

          <p>
            Ryukomik dirancang sebagai{" "}
            <strong className="text-white">Progressive Web App (PWA)</strong>{" "}
            sehingga dapat diakses dengan nyaman di berbagai perangkat, termasuk
            desktop dan mobile, serta mendukung fitur offline untuk konten yang
            telah diunduh oleh pengguna.
          </p>

          <div>
            <p className="mb-2">Kami berkomitmen untuk:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menyediakan pengalaman membaca yang nyaman</li>
              <li>Menghadirkan antarmuka sederhana dan cepat</li>
              <li>Menghormati hak cipta dan privasi pengguna</li>
            </ul>
          </div>

          <p>
            Ryukomik tidak menyimpan file komik di server sendiri, melainkan
            hanya menampilkan konten dari sumber yang tersedia secara publik di
            internet.
          </p>

          <div className="pt-4 border-t border-white/10">
            <p className="font-medium text-white">📩 Kontak</p>
            <p className="mt-1">
              Jika ada pertanyaan atau laporan, silakan hubungi kami melalui
              halaman kontak atau email:
            </p>

            <a
              href="mailto:ryuzunime17@gmail.com"
              className="mt-2 inline-block font-bold text-cyan-200 hover:underline"
            >
              ryuzunime17@gmail.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
