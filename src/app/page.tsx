import Banner from "@/components/Banner";

import UpdateList from "@/components/UpdateList";
import PopularSection from "@/components/PopularSection";
import { getTerbaru, getHomeKomiku } from "@/lib/komiku";
import { getBannerKomiku } from "@/lib/banner";
import { Suspense } from "react";
import RecruitBanner from "@/components/RecruitBanner";
import RyukomikDiscordBanner from "@/components/RyukomikDiscordBanner";
import LatestComments from "@/components/LatestComments";
import TitleRushNotice from "@/components/TitleRushNotice";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";
import ProjectUpdateList from "@/components/ProjectUpdateList";
import { getProjectUpdates } from "@/lib/projectUpdates";

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
      <div className="rk-shell min-h-screen pb-24 text-white md:px-6">
        <h1 className="sr-only">Ryukomik - Baca Manga, Manhwa, dan Manhua Bahasa Indonesia Terbaru</h1>
        <Suspense fallback={<div className="mx-3 mt-16 h-56 rounded-2xl rk-card" />}>
          <Banner data={banner} />
        </Suspense>
        <RecruitBanner />
        <RyukomikDiscordBanner />
        {titleRushStatus.enabled && <TitleRushNotice className="pb-3" />}
        <UpdateList list={list} />
        <ProjectUpdateList list={projectUpdates} />
        <PopularSection data={popular} />
        <LatestComments />
      </div>
    </main>
  );
}
