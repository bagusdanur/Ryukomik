import HandoffClient from "./HandoffClient";

export const metadata = {
  title: "Masuk dengan kode — Ryukomik",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  return <HandoffClient code={(c || "").replace(/[^\d]/g, "").slice(0, 6)} />;
}
