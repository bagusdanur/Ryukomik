"use client";

import { useState } from "react";
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

export default function GamePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGames = GAMES.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0a0c14] text-[#f4f5fa] font-sans min-h-screen flex flex-col antialiased">
      {/* HEADER */}
      <TopupHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
        
        {/* Page Head */}
        <div className="space-y-2 border-b border-white/[0.08] pb-6">
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--accent-3)]">
            RyuTopup Katalog
          </span>
          <h1 className="text-3xl font-extrabold text-white leading-tight">Semua Game</h1>
          <p className="text-white/50 text-sm max-w-md">
            Pilih game favoritmu dan mulai top up secara instan dengan berbagai metode pembayaran aman.
          </p>
        </div>

        {/* Live Filter Info */}
        {searchQuery && (
          <div className="text-xs text-white/50">
            Menampilkan hasil untuk pencarian &quot;<span className="text-white font-semibold">{searchQuery}</span>&quot;
          </div>
        )}

        {/* Game Grid */}
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
            {filteredGames.map((game) => (
              <Link
                key={game.id}
                href={`/topup/${game.id}`}
                className="bg-[#181c2b] border border-white/[0.08] hover:border-white/[0.14] rounded-[14px] p-4 text-center flex flex-col items-center hover:translate-y-[-4px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200"
              >
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-16 h-16 rounded-[14px] object-cover mb-3 shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
                />
                <div className="font-bold text-[13.5px] text-white leading-tight mt-1 truncate w-full">
                  {game.name}
                </div>
                <div className="text-[11px] text-white/40 mt-2 truncate w-full">
                  {game.publisher}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#181c2b]/35 border border-dashed border-white/[0.08] rounded-[14px] text-white/40">
            Game &quot;{searchQuery}&quot; tidak ditemukan. Silakan cari dengan kata kunci lain.
          </div>
        )}
      </main>

      {/* FOOTER */}
      <TopupFooter />
    </div>
  );
}
