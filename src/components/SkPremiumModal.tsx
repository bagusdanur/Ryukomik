import { FiX } from "react-icons/fi";

export default function SkPremiumModal({ close }: { close: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 overflow-y-auto backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="rk-card relative w-full max-w-md flex flex-col rounded-3xl overflow-hidden my-auto"
        style={{ maxHeight: "min(680px, 80dvh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 pb-4 border-b border-white/5">
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <FiX size={16} />
          </button>

          <h2 className="text-xl font-black text-white pr-8">
            Syarat & Ketentuan Premium
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-white/70 leading-relaxed min-h-0">
          <p>
            Dengan membeli dan mengaktifkan layanan Premium di RyuKomik, Anda
            menyetujui syarat dan ketentuan berikut:
          </p>
          
          <div className="space-y-2">
            <h3 className="font-bold text-white">1. Layanan Premium</h3>
            <p>
              Layanan premium memberikan fitur tambahan seperti Download Komik,
              Bebas Iklan, Batch Download, VIP Badge, dan akses komentar eksklusif.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white">2. Pembayaran dan Refund</h3>
            <p>
              Semua pembayaran bersifat final. Kami tidak menyediakan opsi
              pengembalian dana (refund) untuk layanan Premium yang sudah diaktifkan.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white">3. Aktivasi Akun</h3>
            <p>
              Aktivasi layanan premium akan dilakukan dalam waktu maksimal 1x24 jam
              setelah bukti transfer diterima dan diverifikasi oleh Admin.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white">4. Larangan</h3>
            <p>
              Akun premium dilarang untuk dibagikan (sharing account) kepada pihak
              lain atau dijual kembali. Pelanggaran terhadap aturan ini dapat
              menyebabkan pencabutan akses premium secara sepihak tanpa pengembalian
              dana.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-bold text-white">5. Perubahan Syarat</h3>
            <p>
              RyuKomik berhak mengubah syarat dan ketentuan ini sewaktu-waktu.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 p-6 pt-4 border-t border-white/5">
          <button
            onClick={close}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
