"use client";

import { useState } from "react";
import Link from "next/link";
import TopupHeader from "@/components/topup/TopupHeader";
import TopupFooter from "@/components/topup/TopupFooter";
import { FaCheckCircle } from "react-icons/fa";

type PaymentMethod = {
  id: string;
  name: string;
  group: "QRIS" | "E-Wallet" | "Convenience Store" | "Virtual Account";
  fee: number;
  logo: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "qris",
    name: "QRIS",
    group: "QRIS",
    fee: 0,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775662-kcbetm70-file-1737143150-spcmgc35-qris-gambar-1.png?w=160&q=75",
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    group: "E-Wallet",
    fee: 1200,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775716-fmn2sfib-file-1737143671-9mrhdvag-file-1697904171-eq3ej04i-file-1674630365-9kf6c65s-shopeepay-logo-2-1-1-1.png?w=160&q=75",
  },
  {
    id: "gopay",
    name: "GoPay",
    group: "E-Wallet",
    fee: 1000,
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg",
  },
  {
    id: "dana",
    name: "DANA",
    group: "E-Wallet",
    fee: 1000,
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg",
  },
  {
    id: "ovo",
    name: "OVO",
    group: "E-Wallet",
    fee: 1000,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/39/Ovo_logo.svg",
  },
  {
    id: "alfamart",
    name: "Alfamart",
    group: "Convenience Store",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775668-4nha5cp3-file-1737142974-nbmk0t1b-alfa-1.png?w=160&q=75",
  },
  {
    id: "indomaret",
    name: "Indomaret",
    group: "Convenience Store",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775665-v5gkgnso-file-1737143060-2i3k401v-indomaret-1.png?w=160&q=75",
  },
  {
    id: "bni",
    name: "BNI VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775998-s58ufehm-file-1737144001-l8g1ujbd-file-1697903336-m4kldqee-logo-bni-1-1-1.png?w=160&q=75",
  },
  {
    id: "bri",
    name: "BRI VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775991-g4ivn5ni-file-1737144076-29oede25-file-1697903333-5jircd9t-logo-bri-1-1-1-1.png?w=160&q=75",
  },
  {
    id: "mandiri",
    name: "Mandiri VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775983-ntpucpk1-file-1737144140-d4sn6v70-file-1697903331-rru92pvi-logo-mandiri-2-1-1-1-1.png?w=160&q=75",
  },
  {
    id: "bsi",
    name: "BSI VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775973-j6dgbdre-file-1737144198-ilm13v57-file-1702554080-pj1ko6kt-file-1681684872-2ecd8m3k-bsi-bank-syariah-indonesia-logo-png720p-vector69com-1-1-1-1-1-1.png?w=160&q=75",
  },
  {
    id: "danamon",
    name: "Danamon VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775965-5258tari-file-1737144338-95v1bt2l-file-1697903492-ukgnju3q-logo-danamon-1-1-1-1.png?w=160&q=75",
  },
  {
    id: "cimb",
    name: "CIMB VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775962-7vajv6fr-file-1737144396-ecjoa4qj-file-1702554201-6o8n1722-zeel7yfw7eu3skmutjuew9wtvk4yd1qotjsw5ltg-1-2-1-1.png?w=160&q=75",
  },
  {
    id: "bnc",
    name: "BNC VA",
    group: "Virtual Account",
    fee: 2500,
    logo: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1738775960-996uju6o-file-1737144453-g8jhh4q3-file-1707266058-2nlm7p94-logobnc-1-1-1.png?w=160&q=75",
  },
];

const FAQS = [
  {
    q: "Bagaimana cara membayar lewat Indomaret, Alfamart, Alfamidi?",
    a: "Pilih metode Convenience Store saat checkout, lalu selesaikan pesanan untuk mendapatkan kode pembayaran. Tunjukkan atau sebutkan kode tersebut ke kasir Indomaret, Alfamart, atau Alfamidi terdekat, dan lakukan pembayaran sesuai nominal yang tertera. Diamond akan otomatis terkirim setelah pembayaran terverifikasi.",
  },
  {
    q: "Berapa lama proses pengiriman Diamond?",
    a: "Untuk metode pembayaran instan seperti QRIS dan e-wallet, Diamond biasanya masuk dalam hitungan detik hingga beberapa menit setelah pembayaran berhasil dikonfirmasi.",
  },
  {
    q: "Apakah bisa top up ke Advance Server?",
    a: "Layanan ini hanya untuk Server Original dan tidak dapat digunakan untuk mengisi Advance Server. Pastikan akun yang dimasukkan berada di server original sebelum melakukan pembayaran.",
  },
];

export default function TopupFormClient({ gameId, data }: { gameId: string; data: any }) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<string | null>("qris");
  const [accountData, setAccountData] = useState<Record<string, string>>({});
  const [waNumber, setWaNumber] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedItem = data.items.find((i: any) => i.id === activeItem);
  const selectedPayment = PAYMENT_METHODS.find((p) => p.id === activePayment);
  
  const totalPrice = (selectedItem?.price || 0) + (selectedPayment?.fee || 0);

  const handleInputChange = (fieldId: string, value: string) => {
    setAccountData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckout = () => {
    if (!selectedItem) {
      alert("Pilih nominal terlebih dahulu!");
      return;
    }
    if (!selectedPayment) {
      alert("Pilih metode pembayaran terlebih dahulu!");
      return;
    }
    
    // Check fields
    const missingFields = data.fields.filter((f: any) => !accountData[f.id]?.trim());
    if (missingFields.length > 0) {
      alert(`Mohon lengkapi data akun Anda: ${missingFields.map((f: any) => f.label).join(", ")}`);
      return;
    }

    if (!waNumber.trim()) {
      alert("Mohon masukkan nomor WhatsApp Anda!");
      return;
    }

    const dataDetails = Object.entries(accountData)
      .map(([id, val]) => `${data.fields.find((f: any) => f.id === id)?.label || id}: ${val}`)
      .join("\n");

    alert(`Checkout Berhasil!\n\nGame: ${data.name}\n${dataDetails}\nNo. WA: ${waNumber}\nItem: ${selectedItem.name}\nMetode: ${selectedPayment.name}\nTotal: Rp ${totalPrice.toLocaleString("id-ID")}\n\nFitur transaksi otomatis menyusul!`);
  };

  // Group payment methods
  const qrisMethods = PAYMENT_METHODS.filter((m) => m.group === "QRIS");
  const eWalletMethods = PAYMENT_METHODS.filter((m) => m.group === "E-Wallet");
  const convenienceMethods = PAYMENT_METHODS.filter((m) => m.group === "Convenience Store");
  const vaMethods = PAYMENT_METHODS.filter((m) => m.group === "Virtual Account");

  return (
    <div className="bg-[#0a0c14] text-[#f4f5fa] font-sans min-h-screen flex flex-col antialiased">
      {/* HEADER */}
      <TopupHeader />

      {/* BREADCRUMB */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-6 text-[12.5px] text-white/50 flex items-center gap-1.5 select-none">
        <Link href="/topup" className="hover:text-[var(--accent-3)] transition-colors">
          Beranda
        </Link>
        <span>/</span>
        <span className="text-white">{data.name}</span>
      </div>

      {/* PRODUCT HERO */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-6 flex items-center gap-4 flex-wrap md:flex-nowrap border-b border-white/[0.08] mb-7">
        <img
          src={data.cover || data.logo}
          alt={data.name}
          className="w-[88px] h-[88px] rounded-[18px] object-cover bg-[#0e1018] shadow-lg border border-white/[0.08]"
        />
        <div className="space-y-1">
          <div className="text-[11.5px] font-bold tracking-[0.08em] uppercase text-[var(--accent-3)]">
            {data.developer || "Publisher"}
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-none">{data.name}</h1>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[#181c2b] border border-white/[0.08] rounded-full px-3 py-1 text-[11.5px] font-semibold text-white/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="m5 13 4 4L19 7"/></svg>
              Layanan Pelanggan 24/7
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#181c2b] border border-white/[0.08] rounded-full px-3 py-1 text-[11.5px] font-semibold text-white/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="m5 13 4 4L19 7"/></svg>
              Pembayaran Aman
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#181c2b] border border-white/[0.08] rounded-full px-3 py-1 text-[11.5px] font-semibold text-white/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="m5 13 4 4L19 7"/></svg>
              Pengiriman Instant
            </span>
          </div>
        </div>
      </div>

      {/* LAYOUT BODY */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 items-start">
        
        {/* LEFT COLUMN: FORM DETAILS */}
        <div className="space-y-4">
          
          {/* Panel 1: Product Info */}
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-3.5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Informasi Produk</h3>
            <p className="text-[13.5px] text-white/70 leading-relaxed">
              Top up Diamond {data.name} hanya dalam hitungan detik! Cukup masukan data akun Anda, pilih jumlah Diamond yang Anda inginkan, selesaikan pembayaran, dan item akan langsung masuk ke akun Anda secara otomatis.
            </p>
            <div className="text-[12.5px] text-[var(--accent-2)] bg-[var(--accent)]/[0.06] border border-[var(--accent-2)]/20 rounded-xl p-3.5">
              ⚠️ Khusus Server Original, tidak bisa isi Advance Server. Untuk WDP (Weekly Diamond Pass), pastikan cek slot tersisa terlebih dahulu sebelum top up!
            </div>
          </div>

          {/* Panel 2: Account fields */}
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5.5 h-5.5 rounded-lg bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11.5px] font-extrabold flex items-center justify-center">1</span>
              Informasi Pelanggan
            </h3>
            
            {/* Dynamic account fields */}
            <div className={`grid gap-3.5 ${data.fields.length >= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {data.fields.map((field: any) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <label htmlFor={field.id} className="text-[12.5px] font-bold text-white/70">{field.label}</label>
                  <input
                    id={field.id}
                    type="text"
                    placeholder={field.placeholder}
                    value={accountData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="bg-[#11141f] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13.5px] focus:border-[var(--accent-3)] focus:bg-[#181c2b] outline-none transition-all placeholder-white/20"
                  />
                </div>
              ))}
            </div>

            {/* Global Whatsapp Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wa" className="text-[12.5px] font-bold text-white/70">Nomor WhatsApp</label>
              <input
                id="wa"
                type="text"
                placeholder="08xxxxxxxxxx"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                className="bg-[#11141f] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13.5px] focus:border-[var(--accent-3)] focus:bg-[#181c2b] outline-none transition-all placeholder-white/20"
              />
            </div>
          </div>

          {/* Panel 3: Nominal cards selection */}
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5.5 h-5.5 rounded-lg bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11.5px] font-extrabold flex items-center justify-center">2</span>
              Pilih Nominal Top Up
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {data.items.map((item: any) => {
                const isSelected = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveItem(item.id)}
                    className={`relative bg-[#11141f] border border-white/[0.08] rounded-xl p-3 text-left hover:border-white/[0.14] transition-all flex flex-col justify-between min-h-[94px] cursor-pointer group ${
                      isSelected
                        ? "border-[var(--accent-3)] bg-[var(--accent)]/[0.08] shadow-[inset_0_0_0_1px_var(--accent-3)]"
                        : ""
                    }`}
                  >
                    {/* Discount badge */}
                    {item.discount && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full select-none">
                        {item.discount} OFF
                      </span>
                    )}

                    {/* Top layout */}
                    <div className="flex items-center gap-2 mb-2 pr-6">
                      <span className="text-2xl select-none group-hover:scale-105 transition-transform shrink-0">
                        {item.icon}
                      </span>
                      <span className="text-[11.5px] font-bold text-white leading-snug line-clamp-2">
                        {item.name}
                      </span>
                    </div>

                    {/* Price row */}
                    <div className="mt-auto">
                      {item.originalPrice > item.price && (
                        <span className="text-[9.5px] text-white/40 line-through font-medium block">
                          Rp {item.originalPrice.toLocaleString("id-ID")}
                        </span>
                      )}
                      <span className="text-[13px] font-extrabold text-[var(--accent-2)]">
                        Rp {item.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel 4: Payment Methods */}
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-5.5 h-5.5 rounded-lg bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] text-[#1a0a06] text-[11.5px] font-extrabold flex items-center justify-center">3</span>
              Pilih Pembayaran
            </h3>

            {/* QRIS */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">QRIS</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {qrisMethods.map((method) => {
                  const isSelected = activePayment === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setActivePayment(method.id)}
                      className={`bg-[#11141f] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center gap-2 hover:border-white/[0.14] transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? "border-[var(--accent-3)] shadow-[inset_0_0_0_1px_var(--accent-3)] bg-[var(--accent)]/[0.08]"
                          : ""
                      }`}
                    >
                      <img src={method.logo} alt={method.name} className="h-6 w-auto object-contain max-w-[65px]" />
                      <span className="text-[10px] font-bold text-white/70">{method.name}</span>
                      {isSelected && (
                        <FaCheckCircle className="absolute top-1.5 right-1.5 text-[var(--accent-3)] text-[10px]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* E-Wallet */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">E-Wallet</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {eWalletMethods.map((method) => {
                  const isSelected = activePayment === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setActivePayment(method.id)}
                      className={`bg-[#11141f] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center gap-2 hover:border-white/[0.14] transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? "border-[var(--accent-3)] shadow-[inset_0_0_0_1px_var(--accent-3)] bg-[var(--accent)]/[0.08]"
                          : ""
                      }`}
                    >
                      <img src={method.logo} alt={method.name} className="h-6 w-auto object-contain max-w-[65px]" />
                      <span className="text-[10px] font-bold text-white/70">{method.name}</span>
                      {isSelected && (
                        <FaCheckCircle className="absolute top-1.5 right-1.5 text-[var(--accent-3)] text-[10px]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Convenience Store */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Convenience Store</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {convenienceMethods.map((method) => {
                  const isSelected = activePayment === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setActivePayment(method.id)}
                      className={`bg-[#11141f] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center gap-2 hover:border-white/[0.14] transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? "border-[var(--accent-3)] shadow-[inset_0_0_0_1px_var(--accent-3)] bg-[var(--accent)]/[0.08]"
                          : ""
                      }`}
                    >
                      <img src={method.logo} alt={method.name} className="h-6 w-auto object-contain max-w-[65px]" />
                      <span className="text-[10px] font-bold text-white/70">{method.name}</span>
                      {isSelected && (
                        <FaCheckCircle className="absolute top-1.5 right-1.5 text-[var(--accent-3)] text-[10px]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Virtual Account */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Virtual Account</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {vaMethods.map((method) => {
                  const isSelected = activePayment === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setActivePayment(method.id)}
                      className={`bg-[#11141f] border border-white/[0.08] rounded-xl p-2.5 flex flex-col items-center gap-2 hover:border-white/[0.14] transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? "border-[var(--accent-3)] shadow-[inset_0_0_0_1px_var(--accent-3)] bg-[var(--accent)]/[0.08]"
                          : ""
                      }`}
                    >
                      <img src={method.logo} alt={method.name} className="h-6 w-auto object-contain max-w-[65px]" />
                      <span className="text-[10px] font-bold text-white/70">{method.name}</span>
                      {isSelected && (
                        <FaCheckCircle className="absolute top-1.5 right-1.5 text-[var(--accent-3)] text-[10px]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel 5: Promo Code */}
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-3.5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Kode Promo</h3>
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="Masukkan kode voucher"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="bg-[#11141f] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13.5px] focus:border-[var(--accent-3)] focus:bg-[#181c2b] outline-none transition-all placeholder-white/20 flex-1"
              />
              <button className="bg-[#181c2b] hover:bg-[#11141f] border border-white/[0.14] text-white rounded-xl px-5 font-bold text-sm select-none transition-all">
                Pakai Voucher
              </button>
            </div>
          </div>

          {/* Panel 6: FAQ Accordion */}
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-1">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Pertanyaan yang Sering Diajukan</h3>
            
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="border-b border-white/[0.08] last:border-none">
                  <div
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex justify-between items-center py-4 text-[13.5px] font-bold cursor-pointer select-none text-white hover:text-[var(--accent-3)] transition-colors gap-4"
                  >
                    <span>{faq.q}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      className={`text-white/40 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-45 text-[var(--accent-3)]" : ""}`}
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  
                  <div
                    className="transition-all duration-200 ease-in-out overflow-hidden"
                    style={{ maxHeight: isOpen ? "300px" : "0px", opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="text-[13px] text-white/70 pb-4 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY ORDER SUMMARY */}
        <aside className="lg:sticky lg:top-[94px] w-full">
          <div className="bg-[#181c2b] border border-white/[0.08] rounded-3xl p-5.5 space-y-4.5 shadow-xl">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider pb-1.5 border-b border-dashed border-white/[0.08]">Ringkasan Pesanan</h3>
            
            <div className="flex justify-between items-center text-[13.5px] py-1">
              <span className="text-white/50">Produk</span>
              <span className="font-bold text-white">{data.name}</span>
            </div>

            <div className="flex justify-between items-start text-[13.5px] py-1 gap-4">
              <span className="text-white/50 shrink-0">Item</span>
              <span className="font-bold text-white text-right leading-tight">
                {selectedItem ? selectedItem.name : "Belum memilih nominal"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[13.5px] py-1">
              <span className="text-white/50">Harga</span>
              <span className="font-bold text-white">
                {selectedItem ? `Rp ${selectedItem.price.toLocaleString("id-ID")}` : "-"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[13.5px] py-1">
              <span className="text-white/50">Biaya Admin</span>
              <span className="font-bold text-white">
                {selectedPayment ? `Rp ${selectedPayment.fee.toLocaleString("id-ID")}` : "Rp 0"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[14.5px] pt-3.5 border-t border-dashed border-white/[0.08]">
              <span className="text-white/50 font-bold">Total Bayar</span>
              <span className="font-extrabold text-[20px] text-[var(--accent-2)] font-mono">
                {selectedItem ? `Rp ${totalPrice.toLocaleString("id-ID")}` : "-"}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full mt-2 bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] hover:brightness-110 text-[#1a0a06] py-3.5 rounded-xl font-extrabold text-[15px] cursor-pointer shadow-[0_4px_20px_rgba(244,63,94,0.18)] transition-all uppercase select-none tracking-wider hover:translate-y-[-1px] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              disabled={!selectedItem}
            >
              Beli Sekarang
            </button>

            <div className="flex items-center gap-2.5 text-[11.5px] text-white/40 pt-1 justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/30"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
              Transaksi dilindungi &amp; terenkripsi
            </div>
            
            <p className="text-[11.5px] text-white/35 leading-relaxed pt-1.5 border-t border-white/[0.06]">
              Setelah memilih pembayaran, halaman konfirmasi akan muncul. Pastikan User ID dan Server sudah benar sebelum melanjutkan — kesalahan input bukan tanggung jawab RyuTopup.
            </p>
          </div>
        </aside>

      </div>

      {/* FOOTER */}
      <TopupFooter />
    </div>
  );
}
