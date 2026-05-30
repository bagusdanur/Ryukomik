import type { Metadata } from "next";
import TebakJudulClient from "./TebakJudulClient";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";

export const metadata: Metadata = {
  title: "Ryukomik Title Rush: Weekly Leaderboard",
  description:
    "Ikuti Ryukomik Title Rush, event mingguan tebak judul komik dengan hadiah premium.",
};

const MIN_PAGE = 1;
const MAX_PAGE = 24;

const randomPage = () =>
  Math.floor(Math.random() * (MAX_PAGE - MIN_PAGE + 1)) + MIN_PAGE;

type GameItem = {
  [key: string]: unknown;
};

type SearchParams = {
  page?: string;
};

async function getKiryuuGameItems(page: number): Promise<GameItem[]> {
  try {
    const res = await fetch(
      `https://mgkomik-backend-three.vercel.app/kiryuu/pustaka?page=${page}`,
      { cache: "no-store" },
    );
    const json = await res.json();

    return Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    console.error("getKiryuuGameItems error:", error);
    return [];
  }
}

export default async function TebakJudulPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const eventStatus = await getTitleRushEventStatus();
  const requestedPage = Number(params?.page);
  const page =
    Number.isInteger(requestedPage) &&
    requestedPage >= MIN_PAGE &&
    requestedPage <= MAX_PAGE
      ? requestedPage
      : randomPage();
  const items = eventStatus.enabled ? await getKiryuuGameItems(page) : [];

  return (
    <TebakJudulClient
      key={page}
      initialData={items}
      currentPage={page}
      eventEnabled={eventStatus.enabled}
    />
  );
}
