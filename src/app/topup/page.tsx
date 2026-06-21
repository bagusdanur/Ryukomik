"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopupHeader from "@/components/topup/TopupHeader";
import TopupFooter from "@/components/topup/TopupFooter";

const GAMES = [
  {
    id: "mobile-legends",
    name: "Mobile Legends",
    publisher: "MLBB Indonesia",
    image: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1778309830-6olb9uli-file-1746236477-ldmdsn2k-1.jpg?w=160&q=75",
  },
  {
    id: "magic-chess-gogo",
    name: "Magic Chess GOGO",
    publisher: "Moonton",
    image: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236484-0j9idri1-4.jpg?w=160&q=75",
  },
  {
    id: "pubg-mobile",
    name: "PUBG Mobile",
    publisher: "Tencent",
    image: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236479-aqgje8ve-2.jpg?w=160&q=75",
  },
  {
    id: "free-fire",
    name: "Free Fire",
    publisher: "Garena",
    image: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236466-2bajaevq-5.jpg?w=160&q=75",
  },
  {
    id: "honor-of-kings",
    name: "Honor Of Kings",
    publisher: "Tencent",
    image: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236481-ji77o8i6-3.jpg?w=160&q=75",
  },
  {
    id: "genshin-impact",
    name: "Genshin Impact",
    publisher: "HoYoverse",
    image: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236471-s2qup57v-8.jpg?w=160&q=75",
  },
];

export default function TopupPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeLeft, setTimeLeft] = useState(3 * 3600 + 24 * 60 + 9); // 3h 24m 9s

  // Flash sale countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 3 * 3600 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Filter games based on search query
  const filteredGames = GAMES.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0a0c14] text-[#f4f5fa] font-sans min-h-screen flex flex-col antialiased">
      {/* HEADER */}
      <TopupHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-10">
        
        {/* TRUST STRIP */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="flex items-center gap-3.5 bg-[#181c2b] border border-white/[0.08] rounded-[14px] p-3.5 px-4.5">
            <div className="w-[38px] h-[38px] rounded-[10px] shrink-0 bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-3)]/15 text-[var(--accent-3)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
            </div>
            <div>
              <h4 className="font-bold text-[13.5px] text-[#f4f5fa] block">Pengiriman Instant</h4>
              <span className="text-[12px] text-white/50 block">Diamond masuk dalam hitungan detik</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-[#181c2b] border border-white/[0.08] rounded-[14px] p-3.5 px-4.5">
            <div className="w-[38px] h-[38px] rounded-[10px] shrink-0 bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-3)]/15 text-[var(--accent-3)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
            </div>
            <div>
              <h4 className="font-bold text-[13.5px] text-[#f4f5fa] block">Pembayaran Aman</h4>
              <span className="text-[12px] text-white/50 block">QRIS, e-wallet, VA &amp; gerai retail</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-[#181c2b] border border-white/[0.08] rounded-[14px] p-3.5 px-4.5">
            <div className="w-[38px] h-[38px] rounded-[10px] shrink-0 bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-3)]/15 text-[var(--accent-3)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            </div>
            <div>
              <h4 className="font-bold text-[13.5px] text-[#f4f5fa] block">CS Siap 24/7</h4>
              <span className="text-[12px] text-white/50 block">Tim support selalu siap membantu</span>
            </div>
          </div>
        </section>

        {/* FLASH SALE */}
        <section id="flash-sale" className="space-y-4">
          <div className="flex items-center justify-between gap-3.5 flex-wrap">
            <div className="flex items-center gap-2.5 font-extrabold text-xl text-white">
              <span className="w-[30px] h-[30px] rounded-[9px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] flex items-center justify-center text-[#1a0a06]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
              </span>
              Flash Sale — Penawaran Eksklusif Terbatas!
            </div>
            <div className="flex items-center gap-1.5 bg-[#181c2b] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-xs text-white/70 font-semibold">
              Berakhir dalam <span className="bg-[#0e1018] border border-white/[0.14] rounded-md px-2 py-0.5 text-[var(--accent-2)] font-mono font-extrabold tabular-nums ml-1.5">{formatCountdown(timeLeft)}</span>
            </div>
          </div>

          <div className="grid grid-flow-col auto-cols-[230px] gap-3.5 overflow-x-auto pb-2 scroll-smooth no-scrollbar">
            {/* Promo MLBB 592 */}
            <Link className="relative bg-[#181c2b] border border-white/[0.08] hover:border-white/[0.14] rounded-[14px] p-3.5 flex flex-col gap-2.5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 w-[230px] shrink-0 scroll-snap-align-start" href="/topup/mobile-legends">
              <span className="absolute top-3.5 right-3.5 bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11px] font-extrabold px-2.5 py-1 rounded-full select-none">-10%</span>
              <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-[var(--accent-3)]">Mobile Legends</span>
              
              <div className="flex items-center gap-2.5">
                <img src="https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1778306467-jd50kj39-file-1699367923-mflq8rrb-50orlessmlbbdiamonds-a2a8-1.png?w=96&q=75" alt="592 Diamonds" className="w-10 h-10 rounded-[10px] object-cover bg-[#0e1018]" />
                <div className="text-[13px] font-bold leading-[1.3] text-[#f4f5fa]">PROMO 592 DM<br/><span className="text-[11px] text-white/50 font-normal">592 Diamonds (512+80 Bonus)</span></div>
              </div>
              
              <div className="text-[14.5px] font-extrabold text-[var(--accent-2)] mt-auto flex items-center">
                <span className="text-[11.5px] text-white/40 line-through font-medium mr-1.5">Rp 181.927</span>
                Rp 163.734
              </div>
            </Link>

            {/* Promo MLBB 6030 */}
            <Link className="relative bg-[#181c2b] border border-white/[0.08] hover:border-white/[0.14] rounded-[14px] p-3.5 flex flex-col gap-2.5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 w-[230px] shrink-0 scroll-snap-align-start" href="/topup/mobile-legends">
              <span className="absolute top-3.5 right-3.5 bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11px] font-extrabold px-2.5 py-1 rounded-full select-none">-20%</span>
              <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-[var(--accent-3)]">Mobile Legends</span>
              
              <div className="flex items-center gap-2.5">
                <img src="https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1778306467-jd50kj39-file-1699367923-mflq8rrb-50orlessmlbbdiamonds-a2a8-1.png?w=96&q=75" alt="6030 Diamonds" className="w-10 h-10 rounded-[10px] object-cover bg-[#0e1018]" />
                <div className="text-[13px] font-bold leading-[1.3] text-[#f4f5fa]">DISKON SEMI SULTAN<br/><span className="text-[11px] text-white/50 font-normal">6030 Diamonds (5124+906)</span></div>
              </div>
              
              <div className="text-[14.5px] font-extrabold text-[var(--accent-2)] mt-auto flex items-center">
                <span className="text-[11.5px] text-white/40 line-through font-medium mr-1.5">Rp 1.974.796</span>
                Rp 1.579.837
              </div>
            </Link>

            {/* Promo WDP 5X */}
            <Link className="relative bg-[#181c2b] border border-white/[0.08] hover:border-white/[0.14] rounded-[14px] p-3.5 flex flex-col gap-2.5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 w-[230px] shrink-0 scroll-snap-align-start" href="/topup/mobile-legends">
              <span className="absolute top-3.5 right-3.5 bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11px] font-extrabold px-2.5 py-1 rounded-full select-none">-20%</span>
              <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-[var(--accent-3)]">Mobile Legends</span>
              
              <div className="flex items-center gap-2.5">
                <img src="https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1778311694-2cptc6va-file-1699367897-79kooiqf-weekly-diamond-pass-1.png?w=96&q=75" alt="WDP x5" className="w-10 h-10 rounded-[10px] object-cover bg-[#0e1018]" />
                <div className="text-[13px] font-bold leading-[1.3] text-[#f4f5fa]">PROMO WDP 5X<br/><span className="text-[11px] text-white/50 font-normal">Weekly Diamond Pass x5</span></div>
              </div>
              
              <div className="text-[14.5px] font-extrabold text-[var(--accent-2)] mt-auto flex items-center">
                <span className="text-[11.5px] text-white/40 line-through font-medium mr-1.5">Rp 181.155</span>
                Rp 144.924
              </div>
            </Link>

            {/* Promo WDP 3X */}
            <Link className="relative bg-[#181c2b] border border-white/[0.08] hover:border-white/[0.14] rounded-[14px] p-3.5 flex flex-col gap-2.5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 w-[230px] shrink-0 scroll-snap-align-start" href="/topup/mobile-legends">
              <span className="absolute top-3.5 right-3.5 bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11px] font-extrabold px-2.5 py-1 rounded-full select-none">-20%</span>
              <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-[var(--accent-3)]">Mobile Legends</span>
              
              <div className="flex items-center gap-2.5">
                <img src="https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1778311694-2cptc6va-file-1699367897-79kooiqf-weekly-diamond-pass-1.png?w=96&q=75" alt="WDP x3" className="w-10 h-10 rounded-[10px] object-cover bg-[#0e1018]" />
                <div className="text-[13px] font-bold leading-[1.3] text-[#f4f5fa]">PROMO WDP 3X<br/><span className="text-[11px] text-white/50 font-normal">Weekly Diamond Pass x3</span></div>
              </div>
              
              <div className="text-[14.5px] font-extrabold text-[var(--accent-2)] mt-auto flex items-center">
                <span className="text-[11.5px] text-white/40 line-through font-medium mr-1.5">Rp 108.694</span>
                Rp 86.955
              </div>
            </Link>
          </div>
        </section>

        {/* GAME SELECTION */}
        <section id="games" className="space-y-6 pt-2">
          {/* Section head */}
          <div className="flex justify-between items-end gap-4">
            <div>
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--accent-3)] flex items-center gap-1.5 mb-1.5">
                Pilih Game
              </span>
              <h2 className="text-2xl font-extrabold text-white leading-tight">Top Up &amp; Voucher Game</h2>
            </div>
            <Link href="/game" className="text-[13px] font-semibold text-white/70 border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.04] px-3.5 py-2 rounded-full transition-all">
              Lihat Semua Game →
            </Link>
          </div>

          {/* Game Grid */}
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
              {filteredGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/topup/${game.id}`}
                  className="bg-[#181c2b] border border-white/[0.08] hover:border-white/[0.14] rounded-[14px] p-3.5 text-center flex flex-col items-center hover:translate-y-[-4px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200"
                >
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-16 h-16 rounded-[14px] object-cover mb-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
                  />
                  <div className="font-bold text-[13px] text-white leading-tight mt-1 truncate w-full">
                    {game.name}
                  </div>
                  <div className="text-[11px] text-white/40 mt-1.5 truncate w-full">
                    {game.publisher}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-[#181c2b]/30 border border-dashed border-white/[0.08] rounded-[14px] text-white/40">
              Game tidak ditemukan.
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <TopupFooter />
    </div>
  );
}
