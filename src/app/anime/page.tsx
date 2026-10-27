import { redirect } from "next/navigation";

/** /anime belum punya halaman sendiri — arahkan ke daftar terbaru. */
export default function Page() {
  redirect("/anime/terbaru");
}
