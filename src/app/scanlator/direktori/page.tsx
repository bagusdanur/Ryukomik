import type { Metadata } from "next";
import DirectoryClient from "./DirectoryClient";

export const metadata: Metadata = {
  title: "Tim Scanlator — Ryukomik",
  description: "Daftar tim scanlation yang menerbitkan project di Ryukomik.",
};

export default function Page() {
  return <DirectoryClient />;
}
