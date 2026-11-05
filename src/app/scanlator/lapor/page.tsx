import ReportClient from "./ReportClient";

export const metadata = {
  title: "Laporkan / Banding — Ryukomik",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; handle?: string; kind?: string }>;
}) {
  const { slug, handle, kind } = await searchParams;
  return <ReportClient slug={slug || ""} handle={handle || ""} kind={kind || ""} />;
}
