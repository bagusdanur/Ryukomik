"use client";

import { FaArrowRight, FaDesktop, FaMobileAlt } from "react-icons/fa";

const SPOTS = [
  {
    id: 1,
    name: "Banner Utama",
    location: "Area atas halaman; lokasi disepakati sebelum tayang",
    size: "728 × 90 px",
    devices: ["Desktop", "Tablet"],
    rating: 5,
    previewClass: "w-full h-8 bg-[var(--accent)]/20 border border-[var(--accent)]/50 rounded flex items-center justify-center text-xs font-bold text-[var(--accent)]",
    layout: (
      <div className="w-full flex flex-col gap-2">
        <div className="w-full h-3 bg-white/10 rounded-sm" />
        <div className="w-full h-10 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[10px] font-bold text-[var(--accent-2)]">SPOT IKLAN (728x90)</div>
        <div className="w-full flex gap-2">
           <div className="w-1/4 h-16 bg-white/5 rounded-sm" />
           <div className="w-3/4 flex flex-col gap-1">
             <div className="w-full h-2 bg-white/5 rounded-sm" />
             <div className="w-2/3 h-2 bg-white/5 rounded-sm" />
           </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    name: "Homepage Billboard",
    location: "Halaman Beranda (Atas Konten)",
    size: "970 × 250 px",
    devices: ["Desktop", "Mobile"],
    rating: 5,
    layout: (
      <div className="w-full flex flex-col gap-2">
        <div className="w-full h-16 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[10px] font-bold text-[var(--accent-2)]">SPOT IKLAN (970x250)</div>
        <div className="grid grid-cols-4 gap-1">
           <div className="h-8 bg-white/5 rounded-sm" />
           <div className="h-8 bg-white/5 rounded-sm" />
           <div className="h-8 bg-white/5 rounded-sm" />
           <div className="h-8 bg-white/5 rounded-sm" />
        </div>
      </div>
    )
  },
  {
    id: 3,
    name: "Terbaru Banner",
    location: "Halaman Terbaru (Antara Filter & List)",
    size: "728 × 90 px",
    devices: ["Desktop", "Mobile"],
    rating: 4,
    layout: (
      <div className="w-full flex flex-col gap-1.5">
        <div className="w-full h-4 bg-white/10 rounded-sm" />
        <div className="w-full h-10 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[10px] font-bold text-[var(--accent-2)]">SPOT IKLAN (728x90)</div>
        <div className="grid grid-cols-3 gap-1">
           <div className="h-12 bg-white/5 rounded-sm" />
           <div className="h-12 bg-white/5 rounded-sm" />
           <div className="h-12 bg-white/5 rounded-sm" />
        </div>
      </div>
    )
  },
  {
    id: 4,
    name: "Search Result Banner",
    location: "Halaman Pencarian (Atas Hasil)",
    size: "728 × 90 px",
    devices: ["Desktop", "Mobile"],
    rating: 3,
    layout: (
      <div className="w-full flex flex-col gap-1.5">
        <div className="w-1/2 h-3 bg-white/10 rounded-sm" />
        <div className="w-full h-10 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[10px] font-bold text-[var(--accent-2)]">SPOT IKLAN (728x90)</div>
        <div className="grid grid-cols-2 gap-1">
           <div className="h-6 bg-white/5 rounded-sm" />
           <div className="h-6 bg-white/5 rounded-sm" />
        </div>
      </div>
    )
  },
  {
    id: 5,
    name: "Detail Komik Sidebar",
    location: "Halaman Detail Komik (Sebelah Sinopsis)",
    size: "300 × 250 px",
    devices: ["Desktop"],
    rating: 4,
    layout: (
      <div className="w-full flex gap-2">
        <div className="flex-1 flex flex-col gap-1">
           <div className="w-full h-12 bg-white/5 rounded-sm" />
           <div className="w-full h-2 bg-white/10 rounded-sm" />
           <div className="w-5/6 h-2 bg-white/10 rounded-sm" />
           <div className="w-full h-2 bg-white/10 rounded-sm" />
        </div>
        <div className="w-16 h-20 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[8px] text-center font-bold text-[var(--accent-2)]">300<br/>x<br/>250</div>
      </div>
    )
  },
  {
    id: 6,
    name: "Banner Reader",
    location: "Awal atau akhir chapter, bukan di tengah cerita",
    size: "320 × 100 px",
    devices: ["Mobile", "Desktop"],
    rating: 5,
    layout: (
      <div className="w-full flex flex-col items-center gap-1.5">
        <div className="w-3/4 h-3 bg-white/10 rounded-sm" />
        <div className="w-full h-8 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[10px] font-bold text-[var(--accent-2)]">SPOT IKLAN (320x100)</div>
        <div className="w-full h-24 bg-white/5 rounded-sm" />
      </div>
    )
  },
  {
    id: 7,
    name: "Footer Full-Width",
    location: "Bawah Semua Halaman",
    size: "970 × 90 px",
    devices: ["Desktop", "Mobile"],
    rating: 3,
    layout: (
      <div className="w-full flex flex-col gap-2">
        <div className="w-full h-10 bg-white/5 rounded-sm" />
        <div className="w-full h-8 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded flex items-center justify-center text-[10px] font-bold text-[var(--accent-2)]">SPOT IKLAN (970x90)</div>
      </div>
    )
  }
].filter((spot) => spot.id === 1 || spot.id === 6);

export default function AdsClient() {
  return (
    <div className="rk-page rk-app-surface min-h-screen text-white pt-20 pb-24 overflow-x-hidden">
      
      <div className="rk-shell">
        
        {/* HERO SECTION */}
        <div className="text-center py-12 md:py-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--accent-2)] text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-2)] animate-pulse" />
            Kerja sama iklan Ryukomik
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            Brand Anda, di antara<br />
            <span className="text-[var(--accent)]">
              cerita favorit pembaca.
            </span>
          </h1>
          <p className="text-[var(--muted)] max-w-2xl text-sm md:text-base leading-relaxed mb-10">
            Perkenalkan produk, game, atau campaign Anda kepada pembaca manga, manhwa, dan manhua berbahasa Indonesia. Dua pilihan banner, dengan lokasi, durasi, dan biaya yang dibahas langsung bersama tim kami.
          </p>
          <a 
            href="mailto:ads@ryukomik.id?subject=Tanya%20Paket%20Iklan%20Ryukomik"
            className="flex items-center gap-3 px-8 py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-sm md:text-base hover:opacity-90 active:scale-95 transition-all shadow-xl"
          >
            Minta Penawaran <FaArrowRight />
          </a>
        </div>


        {/* CATALOG SECTION */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-black mb-3">Dua Pilihan Banner. Mudah Mulai.</h2>
            <p className="text-[var(--muted)] text-sm md:text-base">Banner utama atau banner reader. Ukuran sebagai acuan materi; lokasi akhir mengikuti ketersediaan slot.</p>
          </div>

          <div className="mx-auto max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-5">
            {SPOTS.map((spot) => (
              <div key={spot.id} className="rk-card flex flex-col bg-[var(--surface-1)] border border-[var(--line-soft)] rounded-3xl overflow-hidden hover:border-[var(--line-strong)] transition-colors group">
                
                {/* Mockup Area */}
                <div className="h-40 p-4 bg-[var(--surface-0)] flex items-center justify-center relative border-b border-[var(--line-soft)] overflow-hidden">
                  <div className="w-full max-w-[200px] mx-auto opacity-70 group-hover:opacity-100 transition-opacity">
                    {spot.layout}
                  </div>
                  <div className="absolute top-3 left-3 bg-[var(--surface-2)] border border-[var(--line-soft)] px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase text-[var(--muted)]">
                    Spot #{spot.id}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-black text-white">{spot.name}</h3>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-2 mb-6 text-sm">
                    <div className="flex items-start gap-2 text-[var(--muted)]">
                      <div className="mt-1 flex-shrink-0 text-[var(--accent)]">📍</div>
                      <span>{spot.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--muted)]">
                      <div className="flex-shrink-0 text-[var(--accent-2)]">📏</div>
                      <span>{spot.size}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--muted)]">
                      <div className="flex-shrink-0 text-[var(--accent-3)] flex gap-1">
                        {spot.devices.includes("Desktop") && <FaDesktop />}
                        {spot.devices.includes("Mobile") && <FaMobileAlt />}
                      </div>
                      <span>{spot.devices.join(" & ")}</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <a 
                      href={`mailto:ads@ryukomik.id?subject=${encodeURIComponent(`Tanya Penawaran ${spot.name} Ryukomik`)}`}
                      className="w-full block text-center py-2.5 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--accent)] hover:text-white border border-[var(--line-soft)] font-bold text-sm transition-colors text-white"
                    >
                      Tanya Harga & Ketersediaan
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA BOTTOM */}
        <div className="rk-card rounded-3xl p-8 md:p-12 text-center bg-[var(--surface-1)] border border-[var(--line-strong)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-[var(--accent)] opacity-50" />
          
          <h2 className="text-2xl md:text-3xl font-black mb-4">Siap untuk Menjangkau Audiens Kami?</h2>
          <p className="text-[var(--muted)] max-w-xl mx-auto mb-8 text-sm md:text-base">
            Kirim nama brand, tautan tujuan, pilihan banner, dan perkiraan durasi campaign. Kami akan membahas ketersediaan, harga, serta data trafik yang dapat dibagikan sebelum Anda memutuskan. Materi iklan ditinjau agar tetap sesuai dengan pengalaman pembaca.
          </p>
          <a 
            href="mailto:ads@ryukomik.id?subject=Kerja%20Sama%20Iklan%20Ryukomik"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-xl font-black transition-colors"
          >
            Kirim Email Sekarang
          </a>
          <p className="mt-4 text-xs text-[var(--muted-soft)]">
            ads@ryukomik.id
          </p>
        </div>

      </div>
    </div>
  );
}
