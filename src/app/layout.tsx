import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ADULT_ENABLED } from "@/config/siteMode";

import { AuthProvider } from "@/components/auth/AuthProvider";
import Footer from "@/components/Footer";
import AutoBackup from "@/components/AutoBackup";
import InstallPWA from "@/components/InstallPWA";
import ThemeColorProvider from "@/components/ThemeColorProvider";

import MaintenanceBanner from "@/components/MaintenanceBanner";
import MonetagScript from "@/components/MonetagScript";
import AdGate from "@/components/AdGate";
import SfwAdScript from "@/components/SfwAdScript";
import HistatsCounter from "@/components/HistatsCounter";
import Navbar from "@/components/Navbar";
import BanGate from "@/components/BanGate";
import BanLoginNotice from "@/components/ban/BanLoginNotice";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SWRegister from "./sw-register";
import AdBanner from "@/components/AdBanner";
import AntiAdblock from "@/components/AntiAdblock";
import NotificationPrompt from "@/components/NotificationPrompt";
import YukiChatEmbed from "@/components/YukiChatEmbed";
import AdultConsentProvider from "@/components/adult/AdultConsentProvider";

export const viewport: Viewport = {
  themeColor: "#090a12",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ryukomik.com"),
  title: {
    default: "Baca Manga, Manhwa & Manhua Bahasa Indonesia Terbaru | Ryukomik",
    template: "%s | Ryukomik",
  },
  icons: {
    // Google mensyaratkan favicon persegi kelipatan 48 px. Semua ukuran
    // disediakan eksplisit supaya tidak bergantung pada satu file besar.
    icon: [
      { url: "/favicon-v3.ico", sizes: "any" },
      { url: "/icon-v3-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-v3-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-v3-144.png", type: "image/png", sizes: "144x144" },
      { url: "/icon-v3-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon-v3.ico",
    apple: [{ url: "/apple-touch-icon-v3.png", sizes: "180x180", type: "image/png" }],
  },
  description: "Baca manga, manhwa, dan manhua bahasa Indonesia dengan daftar chapter terbaru, sinopsis, genre, dan informasi komik lengkap di Ryukomik.",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Baca Manga, Manhwa & Manhua Bahasa Indonesia Terbaru | Ryukomik",
    description: "Baca manga, manhwa, dan manhua bahasa Indonesia dengan daftar chapter terbaru dan informasi komik lengkap di Ryukomik.",
    url: "https://ryukomik.com",
    siteName: "Ryukomik",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Ryukomik Logo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryukomik",
    description: "Baca manga, manhwa, dan manhua bahasa Indonesia gratis. Update chapter terbaru setiap hari dengan kualitas gambar HD hanya di Ryukomik.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="admaven-placement" content="BpjaGrTk9"/>
        {/* Iklan khusus deployment SFW (v1.ryukomik.com). */}

        <meta name="monetag" content="1754eeebb4800b0197afdb75756c79d6"/>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Ryukomik",
              "url": "https://ryukomik.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://ryukomik.com/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <meta name="google-site-verification" content="NBp-tkkvrqSZ_6L1OLAWZUV3UotpuMo-RfQsPQlp7Gs" />
        <meta name="google-site-verification" content="vm0FjHf-UaQUWEp-T0FcASH6ClSeD9nqVSfSUgmVP-4" />
        
        {/* Preconnect to external CDNs for performance */}
        <link rel="preconnect" href="https://cdn.komiku.co.id" />
        <link rel="dns-prefetch" href="https://cdn.komiku.co.id" />
        <MonetagScript />
      </head>
      <body className="antialiased">
        {/* Fase B/C: provider auth lokal; tidak melakukan apa pun sampai
            NEXT_PUBLIC_AUTH_LOCAL=1 (login Supabase tetap jalur aktif). */}
        <AuthProvider>
        
        <SWRegister />
        <ThemeColorProvider />
        <AutoBackup />
        <Navbar />
        {children}
        <AdultConsentProvider />
        </AuthProvider>
        <InstallPWA />
        <NotificationPrompt />
        <YukiChatEmbed />
        
        <AdGate />
        {process.env.NEXT_PUBLIC_SITE_MODE === "sfw" && <SfwAdScript />}
        <AntiAdblock />
        <AdBanner />
        <Footer />
        <HistatsCounter />
        <BanGate />
        <BanLoginNotice />
        <Analytics />

      </body>
    </html>
  );
}
