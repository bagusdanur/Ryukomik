import Link from "next/link";
import PremiumPayClient from "./PremiumPayClient";
import { paymentsEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PremiumPayPage() {
  // Provider lama (Pakasir) ditutup dan sedang diganti: tampilkan keterangan,
  // jangan biarkan user masuk ke alur pembayaran yang tidak bisa dipakai.
  if (!paymentsEnabled()) {
    return (
      <main className="rk-page flex min-h-[70vh] items-center justify-center px-4 py-16 text-white">
        <div className="rk-card w-full max-w-md rounded-2xl p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Premium</p>
          <h1 className="mt-2 text-xl font-black">Pembayaran sedang dinonaktifkan</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Metode pembayaran sebelumnya sudah ditutup dan sedang diganti. Pembelian premium
            otomatis belum tersedia sampai penggantinya siap.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/40">
            Kode premium dan hadiah event tetap bisa dipakai seperti biasa.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Kembali ke beranda
          </Link>
        </div>
      </main>
    );
  }

  return <PremiumPayClient />;
}
