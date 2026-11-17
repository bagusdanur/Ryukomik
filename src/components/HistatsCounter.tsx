"use client";

import Script from "next/script";

/**
 * Histats — penghitung kunjungan.
 *
 * Menampilkan badge counter (div#histats_counter) plus fallback <noscript>
 * untuk pengunjung tanpa JavaScript. Script dimuat lazyOnload supaya tidak
 * menahan render halaman.
 *
 * Site ID: 4724030 — counter lama dipertahankan supaya angka kunjungan
 * tidak kembali ke nol setelah pindah domain.
 */
const HISTATS_SITE_ID = "4724030";
const HISTATS_CONFIG = "1,4724030,4,600,110,30,00010011";

export default function HistatsCounter() {
  return (
    <>
      <div className="flex justify-center py-4">
        <div id="histats_counter" />
      </div>

      <Script
        id="histats-script"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            var _Hasync = _Hasync || [];
            _Hasync.push(['Histats.start', '${HISTATS_CONFIG}']);
            _Hasync.push(['Histats.fasi', '1']);
            _Hasync.push(['Histats.track_hits', '']);
            (function() {
              var hs = document.createElement('script');
              hs.type = 'text/javascript';
              hs.async = true;
              hs.src = '//s10.histats.com/js15_as.js';
              (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
            })();
          `,
        }}
      />

      <noscript
        dangerouslySetInnerHTML={{
          __html: `<a href="/" target="_blank"><img src="//sstatic1.histats.com/0.gif?${HISTATS_SITE_ID}&101" alt="hit counter" border="0" /></a>`,
        }}
      />
    </>
  );
}
