import ScanlatorStudio from "./ScanlatorStudio";

export const metadata = {
  title: "Studio Scanlator — Ryukomik",
  description: "Kelola profil, tautan donate, dan karya TL Scanlator di Ryukomik (Beta).",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ScanlatorStudio />;
}
