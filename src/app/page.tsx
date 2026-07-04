import Banner from "@/components/Banner";

import UpdateList from "@/components/UpdateList";
import PopularSection from "@/components/PopularSection";
import { getTerbaru, getHomeKomiku } from "@/lib/komiku";
import { getBannerKomiku } from "@/lib/banner";
import { Suspense } from "react";
import RecruitBanner from "@/components/RecruitBanner";
import RyuTopupBanner from "@/components/RyuTopupBanner";
import LatestComments from "@/components/LatestComments";
import TitleRushNotice from "@/components/TitleRushNotice";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";

export const revalidate = 600;

export default async function Home() {
  const [list, popular, banner, titleRushStatus] = await Promise.all([
    getTerbaru(),
    getHomeKomiku(),
    getBannerKomiku(),
    getTitleRushEventStatus(),
  ]);


  return (
    <main className="rk-page rk-app-surface text-white">
      <div className="rk-shell min-h-screen pb-24 text-white md:px-6">
        <Suspense fallback={<div className="mx-3 mt-16 h-56 rounded-2xl rk-card" />}>
          <Banner data={banner} />
        </Suspense>
        <RecruitBanner />
        <RyuTopupBanner />
        {titleRushStatus.enabled && <TitleRushNotice className="pb-3" />}
        <UpdateList list={list} />
        <PopularSection data={popular} />
        <LatestComments />
      </div>
    </main>
  );
}
