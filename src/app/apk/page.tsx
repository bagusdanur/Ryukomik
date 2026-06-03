import type { Metadata } from "next";
import Image from "next/image";
import { FiAlertTriangle, FiCheckCircle, FiDownload, FiExternalLink, FiShield } from "react-icons/fi";
import { getApkSettings } from "@/lib/apkSettings";
import ApkDownloadButton from "./ApkDownloadButton";
import ApkScreenshotGallery from "./ApkScreenshotGallery";

const WEB_READER_URL = "https://ryukomik.my.id";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const screenshots = [
  "/apk/apk%20ss1.jpeg",
  "/apk/apk%20ss2.jpeg",
  "/apk/apk%20ss3.jpeg",
];

export async function generateMetadata(): Promise<Metadata> {
  const apk = await getApkSettings();

  if (apk.enabled === false) {
    return {
      title: "APK Ryukomik sedang maintenance",
      description:
        "APK Ryukomik sementara tidak tersedia. Kamu tetap bisa baca lewat Ryukomik.my.id.",
    };
  }

  return {
    title: `Download APK Ryukomik v${apk.version}`,
    description: `Download APK Ryukomik v${apk.version} dengan update terbaru untuk aplikasi Android Ryukomik.`,
  };
}

export default async function ApkPage() {
  const apk = await getApkSettings();

  if (apk.enabled === false) {
    return (
      <main className="rk-page px-4 pb-16 pt-8 text-white sm:pt-12">
        <section className="rk-shell">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:gap-6">
              <Image
                src="/icon.png"
                alt="Logo Ryukomik"
                width={128}
                height={128}
                priority
                className="h-24 w-24 rounded-[22px] border border-white/10 bg-white/[0.04] object-cover shadow-lg shadow-black/25 sm:h-32 sm:w-32"
              />

              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">
                  <FiAlertTriangle aria-hidden="true" className="h-4 w-4" />
                  APK maintenance
                </span>
                <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
                  APK sedang maintenance
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                  APK Ryukomik sementara tidak tersedia. Kamu tetap bisa baca
                  lewat Ryukomik.my.id.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    className="rk-btn-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-black sm:w-auto"
                    href={WEB_READER_URL}
                    rel="noopener noreferrer"
                  >
                    <FiExternalLink aria-hidden="true" className="h-5 w-5" />
                    Baca di Ryukomik.my.id
                  </a>
                  <span className="text-xs font-semibold text-white/45">
                    Download APK akan dibuka kembali setelah maintenance selesai.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="rk-page px-4 pb-16 pt-8 text-white sm:pt-12">
      <section className="rk-shell">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:gap-6">
            <Image
              src="/icon.png"
              alt="Logo Ryukomik"
              width={128}
              height={128}
              priority
              className="h-24 w-24 rounded-[22px] border border-white/10 bg-white/[0.04] object-cover shadow-lg shadow-black/25 sm:h-32 sm:w-32"
            />

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">
                Ryukomik
              </h1>
              <p className="mt-1 text-sm font-bold text-cyan-200">
                Baca manga, manhwa, dan manhua
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                Versi Android terbaru dengan update dan perbaikan yang bisa
                langsung kamu unduh dari halaman ini.
              </p>

              <div className="mt-5 grid max-w-sm grid-cols-2 divide-x divide-white/10 text-center">
                <div className="px-2">
                  <div className="text-sm font-black text-white">
                    v{apk.version}
                  </div>
                  <p className="mt-1 text-xs text-white/45">Versi</p>
                </div>
                <div className="px-2">
                  <div className="flex items-center justify-center gap-1 text-sm font-black text-white">
                    APK
                    <FiShield aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-xs text-white/45">Android</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ApkDownloadButton downloadUrl={apk.downloadUrl} />
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/45">
                  <FiDownload aria-hidden="true" className="h-4 w-4" />
                  File APK via GitHub Release
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-black">Screenshot</h2>
            <ApkScreenshotGallery screenshots={screenshots} />
          </div>

          <div className="mt-8 border-t border-white/10 pt-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Yang Baru</h2>
                <p className="mt-1 text-sm text-white/50">
                  Ryukomik v{apk.version}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/70">
                Stable
              </span>
            </div>

            <ul className="space-y-3 text-sm text-white/72">
              {apk.changelog.map((item) => (
                <li className="flex gap-3" key={item}>
                  <FiCheckCircle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
