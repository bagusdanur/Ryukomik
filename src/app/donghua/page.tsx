import { redirect } from "next/navigation";

/** /donghua belum punya halaman sendiri — arahkan ke daftar terbaru. */
export default function Page() {
  redirect("/donghua/terbaru");
}
