"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  FiSearch, 
  FiCopy, 
  FiCheck, 
  FiClock, 
  FiAlertCircle, 
  FiUser, 
  FiShoppingBag, 
  FiCreditCard,
  FiCalendar
} from "react-icons/fi";
import { FaGamepad } from "react-icons/fa";
import TopupHeader from "@/components/topup/TopupHeader";
import TopupFooter from "@/components/topup/TopupFooter";

// Mock data for predefined sample invoices
interface TrackedOrder {
  invoiceId: string;
  gameName: string;
  gameId: string;
  item: string;
  targetId: string;
  paymentMethod: string;
  price: string;
  date: string;
  status: "pending" | "processing" | "success" | "failed";
}

const SAMPLE_ORDERS: Record<string, TrackedOrder> = {
  "RTP-987213": {
    invoiceId: "RTP-987213",
    gameName: "Mobile Legends",
    gameId: "mobile-legends",
    item: "284 Diamonds (254 + 30 Bonus)",
    targetId: "12345678 (2991)",
    paymentMethod: "QRIS (ShopeePay)",
    price: "Rp 84.500",
    date: "20 Juni 2026, 15:30 WIB",
    status: "success"
  },
  "RTP-776219": {
    invoiceId: "RTP-776219",
    gameName: "PUBG Mobile",
    gameId: "pubg-mobile",
    item: "325 Unknown Cash",
    targetId: "5821904712",
    paymentMethod: "GoPay",
    price: "Rp 72.000",
    date: "20 Juni 2026, 18:45 WIB",
    status: "processing"
  },
  "RTP-312904": {
    invoiceId: "RTP-312904",
    gameName: "Genshin Impact",
    gameId: "genshin-impact",
    item: "Blessing of the Welkin Moon",
    targetId: "802194122 (Asia)",
    paymentMethod: "Mandiri Virtual Account",
    price: "Rp 79.000",
    date: "20 Juni 2026, 19:10 WIB",
    status: "pending"
  }
};

export default function LacakPesananPage() {
  const [searchId, setSearchId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchedOrder, setSearchedOrder] = useState<TrackedOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = (invoiceId: string) => {
    const trimmedId = invoiceId.trim();
    if (!trimmedId) {
      setErrorMsg("Silakan masukkan Nomor Invoice terlebih dahulu.");
      setSearchedOrder(null);
      return;
    }

    // Check predefined
    if (SAMPLE_ORDERS[trimmedId]) {
      setSearchedOrder(SAMPLE_ORDERS[trimmedId]);
      setErrorMsg("");
    } else {
      // Dynamic fallback mock order for any input (so the user doesn't get "not found" error)
      const dynamicOrder: TrackedOrder = {
        invoiceId: trimmedId.toUpperCase(),
        gameName: "Honor of Kings",
        gameId: "honor-of-kings",
        item: "168 + 12 Tokens",
        targetId: "User-ID-992149",
        paymentMethod: "Dana",
        price: "Rp 45.000",
        date: "Hari ini, Baru saja",
        status: "success"
      };
      setSearchedOrder(dynamicOrder);
      setErrorMsg("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#0a0c14] text-[#f4f5fa] font-sans min-h-screen flex flex-col antialiased">
      {/* HEADER */}
      <TopupHeader searchQuery="" onSearchChange={() => {}} />

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-12 space-y-8">
        
        {/* PAGE TITLE */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-wide">
            LACAK <span className="bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] bg-clip-text text-transparent">PESANAN</span>
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Pantau status transaksi top-up game Anda secara real-time. Masukkan nomor invoice di bawah.
          </p>
        </div>

        {/* SEARCH BOX CARD */}
        <div className="bg-[#181c2b] border border-white/[0.08] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md max-w-xl mx-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchId);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="invoice-search" className="text-xs font-bold text-white/60 tracking-wider uppercase block">
                Nomor Invoice / Pesanan
              </label>
              <div className="relative flex items-center bg-[#10121d] border border-white/[0.08] focus-within:border-[var(--accent-3)]/50 focus-within:bg-[#131627] rounded-xl overflow-hidden transition-all px-3 py-1">
                <FiSearch className="text-white/40 w-5 h-5 mr-2" />
                <input
                  id="invoice-search"
                  type="text"
                  placeholder="Contoh: RTP-987213"
                  value={searchId}
                  onChange={(e) => {
                    setSearchId(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className="bg-transparent border-none outline-none text-white text-sm py-3.5 flex-grow placeholder-white/20"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-[13px] text-[var(--accent-3)] bg-[var(--accent-3)]/10 px-4 py-2.5 rounded-xl border border-[var(--accent-3)]/20">
                <FiAlertCircle className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 font-bold text-sm text-white bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] hover:brightness-110 rounded-xl py-3.5 shadow-[0_4px_15px_rgba(244,63,94,0.25)] hover:translate-y-[-1px] active:translate-y-[0px] transition-all cursor-pointer"
            >
              <FiSearch className="w-4 h-4" />
              Lacak Sekarang
            </button>
          </form>

          {/* QUICK MOCK SAMPLES */}
          <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-2.5">
            <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">
              Gunakan Invoice Contoh untuk Pengetesan:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchId("RTP-987213");
                  handleSearch("RTP-987213");
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                RTP-987213 (Sukses)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchId("RTP-776219");
                  handleSearch("RTP-776219");
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                RTP-776219 (Diproses)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchId("RTP-312904");
                  handleSearch("RTP-312904");
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                RTP-312904 (Pending)
              </button>
            </div>
          </div>
        </div>

        {/* RESULTS CARD */}
        {searchedOrder && (
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all animate-fadeIn">
            
            {/* STEPPER PROGRESS BAR */}
            <div className="bg-[#1c2134] border-b border-white/[0.08] px-6 py-8">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between relative">
                  
                  {/* Progress track line */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-white/[0.06] z-0" />
                  
                  {/* Active fill line */}
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] transition-all duration-500 z-0" 
                    style={{
                      width: 
                        searchedOrder.status === "pending" ? "12%" :
                        searchedOrder.status === "processing" ? "50%" :
                        searchedOrder.status === "success" ? "100%" : "0%"
                    }}
                  />

                  {/* Step 1: Dibuat */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-white text-xs font-bold shadow-lg">
                      1
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-white/80">Dibuat</span>
                  </div>

                  {/* Step 2: Verifikasi / Pending */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-lg ${
                      searchedOrder.status !== "pending"
                        ? "bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-white" 
                        : "bg-[#10121d] border border-white/[0.08] text-white/50"
                    }`}>
                      {searchedOrder.status !== "pending" ? "✓" : "2"}
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      searchedOrder.status !== "pending" ? "text-white/80" : "text-white/40"
                    }`}>Terbayar</span>
                  </div>

                  {/* Step 3: Proses */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-lg ${
                      searchedOrder.status === "success"
                        ? "bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-white" 
                        : searchedOrder.status === "processing"
                        ? "bg-[var(--accent)] text-white animate-pulse"
                        : "bg-[#10121d] border border-white/[0.08] text-white/50"
                    }`}>
                      {searchedOrder.status === "success" ? "✓" : "3"}
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      searchedOrder.status === "processing" || searchedOrder.status === "success" ? "text-white/80" : "text-white/40"
                    }`}>Diproses</span>
                  </div>

                  {/* Step 4: Selesai */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-lg ${
                      searchedOrder.status === "success"
                        ? "bg-emerald-500 text-white" 
                        : "bg-[#10121d] border border-white/[0.08] text-white/50"
                    }`}>
                      {searchedOrder.status === "success" ? "✓" : "4"}
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      searchedOrder.status === "success" ? "text-emerald-400" : "text-white/40"
                    }`}>Selesai</span>
                  </div>

                </div>
              </div>
            </div>

            {/* STATUS CONTAINER */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-white/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs font-bold tracking-wider uppercase block">NO. INVOICE</span>
                    <button
                      onClick={() => copyToClipboard(searchedOrder.invoiceId)}
                      className="text-white/50 hover:text-white transition-all focus:outline-none"
                      title="Salin No. Invoice"
                    >
                      {copiedId === searchedOrder.invoiceId ? (
                        <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <FiCopy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <h2 className="text-lg font-black tracking-wide text-white">{searchedOrder.invoiceId}</h2>
                </div>

                <div className="shrink-0">
                  {searchedOrder.status === "success" && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide">
                      <FiCheck className="w-3.5 h-3.5" />
                      Berhasil dikirim
                    </div>
                  )}
                  {searchedOrder.status === "processing" && (
                    <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide animate-pulse">
                      <FiClock className="w-3.5 h-3.5 animate-spin" />
                      Sedang Diproses
                    </div>
                  )}
                  {searchedOrder.status === "pending" && (
                    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide">
                      <FiClock className="w-3.5 h-3.5" />
                      Menunggu Pembayaran
                    </div>
                  )}
                </div>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                
                {/* Game */}
                <div className="flex items-start gap-3 bg-[#111320] border border-white/[0.04] p-4 rounded-xl">
                  <FaGamepad className="text-[var(--accent-3)] w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">Game</span>
                    <span className="text-[13.5px] font-bold text-white">{searchedOrder.gameName}</span>
                  </div>
                </div>

                {/* Target Akun */}
                <div className="flex items-start gap-3 bg-[#111320] border border-white/[0.04] p-4 rounded-xl">
                  <FiUser className="text-[var(--accent-3)] w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">Target / ID Akun</span>
                    <span className="text-[13.5px] font-bold text-white">{searchedOrder.targetId}</span>
                  </div>
                </div>

                {/* Item Pembelian */}
                <div className="flex items-start gap-3 bg-[#111320] border border-white/[0.04] p-4 rounded-xl">
                  <FiShoppingBag className="text-[var(--accent-3)] w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">Nominal / Item</span>
                    <span className="text-[13.5px] font-bold text-white">{searchedOrder.item}</span>
                  </div>
                </div>

                {/* Metode Pembayaran */}
                <div className="flex items-start gap-3 bg-[#111320] border border-white/[0.04] p-4 rounded-xl">
                  <FiCreditCard className="text-[var(--accent)] w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">Metode Pembayaran</span>
                    <span className="text-[13.5px] font-bold text-white">{searchedOrder.paymentMethod}</span>
                  </div>
                </div>

                {/* Total Bayar */}
                <div className="flex items-start gap-3 bg-[#111320] border border-white/[0.04] p-4 rounded-xl">
                  <FiShoppingBag className="text-[var(--accent)] w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">Total Pembayaran</span>
                    <span className="text-[13.5px] font-bold text-[var(--accent-2)]">{searchedOrder.price}</span>
                  </div>
                </div>

                {/* Waktu Transaksi */}
                <div className="flex items-start gap-3 bg-[#111320] border border-white/[0.04] p-4 rounded-xl">
                  <FiCalendar className="text-[var(--accent)] w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase block">Tanggal Transaksi</span>
                    <span className="text-[13.5px] font-medium text-white/80">{searchedOrder.date}</span>
                  </div>
                </div>

              </div>

              {/* ACTION FOOTER */}
              <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40 text-center sm:text-left">
                <span>Ada masalah dengan transaksi Anda? Silakan hubungi CS kami.</span>
                <Link
                  href="/topup"
                  className="text-[var(--accent-3)] font-bold hover:underline hover:text-[var(--accent)] transition-all shrink-0"
                >
                  Kembali ke Beranda
                </Link>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <TopupFooter />
    </div>
  );
}
