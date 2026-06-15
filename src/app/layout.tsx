import type { Metadata } from "next";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import AutoBackup from "@/components/AutoBackup";
import InstallPWA from "@/components/InstallPWA";
import ThemeColorProvider from "@/components/ThemeColorProvider";

import MaintenanceBanner from "@/components/MaintenanceBanner";
import MonetagScript from "@/components/MonetagScript";
import Navbar from "@/components/Navbar";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "./globals.css";
import SWRegister from "./sw-register";
import AdBanner from "@/components/AdBanner";

export const metadata: Metadata = {
  title: {
    default: "Ryukomik - Baca Manga, Manhwa, Manhua Bahasa Indonesia Update Terbaru",
    template: "%s | Baca Manga, Manhwa, dan Manhua Gratis Online",
  },
  icons: {
    icon: "/icon.png?v=20260523",
    shortcut: "/icon.png?v=20260523",
    apple: "/icon.png?v=20260523",
  },
  description: "Baca manga, manhwa, dan manhua bahasa Indonesia gratis. Update chapter terbaru setiap hari dengan kualitas gambar HD hanya di Ryukomik.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="monetag" content="648210872e70b41aeb3156769958d70b"/>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#090a12" />
        <meta name="google-site-verification" content="NBp-tkkvrqSZ_6L1OLAWZUV3UotpuMo-RfQsPQlp7Gs" />
        <meta name="google-site-verification" content="vm0FjHf-UaQUWEp-T0FcASH6ClSeD9nqVSfSUgmVP-4" />
        <Script
          id="histats-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var _Hasync = _Hasync || [];
              _Hasync.push(['Histats.start', '1,4724030,4,600,110,30,00010011']);
              _Hasync.push(['Histats.fasi', '1']);
              _Hasync.push(['Histats.track_hits', '']);
              (function() {
                var hs = document.createElement('script');
                hs.type = 'text/javascript';
                hs.async = true;
                hs.src = '//s10.histats.com/js15_as.js';
                (document.getElementsByTagName('head')[0] || document.body).appendChild(hs);
              })();
            `,
          }}
        />
        <MonetagScript />
      </head>
      <body className="antialiased">
        
        <SWRegister />
        <ThemeColorProvider />
        <AutoBackup />
        <Navbar />
        {children}
        <InstallPWA />
        <AdBanner />
        <Footer />
        <Analytics />
        <script src="https://yuki.ryukomik.web.id/widget.js"
        data-host="https://yuki.ryukomik.web.id"
        data-position="right" defer></script>
      </body>
    </html>
  );
}
