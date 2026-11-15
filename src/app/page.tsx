import Link from "next/link";
import { FiGlobe } from "react-icons/fi";

import Banner from "@/components/Banner";

import UpdateList from "@/components/UpdateList";
import PopularSection from "@/components/PopularSection";
import { getTerbaru, getHomeKomiku } from "@/lib/komiku";
import { getBannerKomiku } from "@/lib/banner";
import { Suspense } from "react";
import RecruitBanner from "@/components/RecruitBanner";
import ContinueReading from "@/components/ContinueReading";
import RyukomikDiscordBanner from "@/components/RyukomikDiscordBanner";
import LatestComments from "@/components/LatestComments";
import TitleRushNotice from "@/components/TitleRushNotice";
import LoginNotice from "@/components/LoginNotice";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";
import ProjectUpdateList from "@/components/ProjectUpdateList";
import ScanlatorHomeSection from "@/components/scanlator/ScanlatorHomeSection";
import { getProjectUpdates } from "@/lib/projectUpdates";
import FirstRunOnboarding from "@/components/onboarding/FirstRunOnboarding";

// Update Komiku harus tetap segar; backend memakai stale-while-refresh agar
// revalidasi singkat tidak membuat homepage kosong saat sumber sedang lambat.
export const revalidate = 60;

export default async function Home() {
  const [list, projectUpdates, popular, banner, titleRushStatus] = await Promise.all([
    getTerbaru(),
    getProjectUpdates(),
    getHomeKomiku(),
    getBannerKomiku(),
    getTitleRushEventStatus(),
  ]);


  return (
    <main className="rk-page rk-app-surface text-white">
      <FirstRunOnboarding />
      <LoginNotice />
      <div className="rk-shell min-h-screen pb-24 text-white md:px-6">
        <h1 className="sr-only">Ryukomik - Baca Manga, Manhwa, dan Manhua Bahasa Indonesia Terbaru</h1>
        {/* Tautan internal ke pengumuman pindah domain: menangkap mantan
            pembaca yang mencari "ryukomik domain baru" dan memberi jalur
            permanen yang bisa diindeks. */}
        <Link
          href="/info/domain-baru"
          className="mx-3 mt-20 flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-2 text-[11.5px] font-semibold text-cyan-100/85 transition hover:border-cyan-300/40 hover:text-white sm:mt-3"
        >
          <FiGlobe size={13} className="shrink-0" />
          <span className="truncate">Ryukomik pindah ke ryukomik.com — baca pengumuman</span>
        </Link>
        <Suspense fallback={<div className="mx-3 mt-16 h-56 rounded-2xl rk-card" />}>
          <Banner data={banner} />
        </Suspense>
        <ContinueReading />
        <RecruitBanner />
        <RyukomikDiscordBanner />
        {titleRushStatus.enabled && <TitleRushNotice className="pb-3" />}
        <UpdateList list={list} source="kiryuu" />
        <ProjectUpdateList list={projectUpdates} />
        <ScanlatorHomeSection />
        <PopularSection data={popular} />
        <LatestComments />
      </div>
    </main>
  );
}
