import { redirect } from "next/navigation";

/** /hentai belum punya halaman sendiri — arahkan ke daftar terbaru. */
export default function Page() {
  redirect("/hentai/terbaru");
}
