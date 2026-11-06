import type { Metadata } from "next";
import DirectoryClient from "./DirectoryClient";

export const metadata: Metadata = {
  title: "User Scanlator — Ryukomik",
  description: "Daftar user scanlator yang menerbitkan project di Ryukomik.",
};

export default function Page() {
  return <DirectoryClient />;
}
