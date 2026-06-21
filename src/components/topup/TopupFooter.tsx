"use client";

import Link from "next/link";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

export default function TopupFooter() {
  return (
    <footer className="mt-16 border-t border-white/[0.08] bg-[#11141f] text-white/50 text-xs">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-8 md:gap-6">
        {/* BRAND COL */}
        <div className="flex flex-col gap-3">
          
          {/* LOGO RYUTOPUP */}
          <Link href="/topup" className="flex items-center gap-1.5 shrink-0 select-none self-start">
            <span className="text-xl font-black italic tracking-wide text-white">
              Ryu<span className="bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] bg-clip-text text-transparent">Topup</span>
            </span>
          </Link>
          
          <p className="text-white/40 leading-relaxed max-w-[280px]">
            Top-Up Game Favorit Kamu Di RyuTopup Agar Main Game Semakin Seru. Pengiriman Cepat Dan Berbagai Methode Pembayaran Yang Lengkap.
          </p>
          <div className="flex gap-2.5 mt-1">
            <a
              href="https://www.instagram.com/empe.shop/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-[34px] h-[34px] border border-white/[0.08] hover:border-[var(--accent-3)] hover:text-[var(--accent-3)] bg-white/[0.04] rounded-xl flex items-center justify-center text-white/70 transition-all"
            >
              <FaInstagram className="w-4 h-4" />
            </a>
            <a
              href="https://api.whatsapp.com/send/?phone=6281384885101"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-[34px] h-[34px] border border-white/[0.08] hover:border-[var(--accent-3)] hover:text-[var(--accent-3)] bg-white/[0.04] rounded-xl flex items-center justify-center text-white/70 transition-all"
            >
              <FaWhatsapp className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* COL 1: SITEMAP */}
        <div className="flex flex-col gap-3.5">
          <h4 className="text-[12.5px] uppercase font-bold tracking-widest text-white/40">
            Peta Situs
          </h4>
          <ul className="flex flex-col gap-2.5 text-[13.5px]">
            <li>
              <Link href="/topup" className="hover:text-[var(--accent-3)] transition-colors">
                Beranda
              </Link>
            </li>
            <li>
              <Link href="/game" className="hover:text-[var(--accent-3)] transition-colors">
                Semua Game
              </Link>
            </li>
          </ul>
        </div>

        {/* COL 2: TOPUPS */}
        <div className="flex flex-col gap-3.5">
          <h4 className="text-[12.5px] uppercase font-bold tracking-widest text-white/40">
            Top Up Lainnya
          </h4>
          <ul className="flex flex-col gap-2.5 text-[13.5px]">
            <li>
              <Link href="/topup/mobile-legends" className="hover:text-[var(--accent-3)] transition-colors">
                Mobile Legends
              </Link>
            </li>
            <li>
              <Link href="/topup/free-fire" className="hover:text-[var(--accent-3)] transition-colors">
                Free Fire
              </Link>
            </li>
            <li>
              <Link href="/topup/pubg-mobile" className="hover:text-[var(--accent-3)] transition-colors">
                PUBG Mobile
              </Link>
            </li>
            <li>
              <Link href="/topup/genshin-impact" className="hover:text-[var(--accent-3)] transition-colors">
                Genshin Impact
              </Link>
            </li>
          </ul>
        </div>

        {/* COL 3: SUPPORT */}
        <div className="flex flex-col gap-3.5">
          <h4 className="text-[12.5px] uppercase font-bold tracking-widest text-white/40">
            Bantuan Pelanggan
          </h4>
          <ul className="flex flex-col gap-2.5 text-[13.5px]">
            <li>
              <a
                href="https://api.whatsapp.com/send/?phone=6281384885101"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--accent-3)] transition-colors"
              >
                Hubungi Kami
              </a>
            </li>
            <li>
              <Link href="#" className="hover:text-[var(--accent-3)] transition-colors">
                Syarat & Ketentuan
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div className="border-t border-white/[0.08] py-4 bg-[#0e1018]/50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/30 text-[12.5px]">
          <span>© 2026 RyuTopup. Semua Hak Cipta</span>
          <Link href="#" className="hover:text-white transition-colors">
            Syarat & Ketentuan Pengguna
          </Link>
        </div>
      </div>
    </footer>
  );
}
