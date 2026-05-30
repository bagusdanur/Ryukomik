import Link from "next/link";

export const revalidate = 1800;
export const dynamic = "force-static";

export default function Page({ params }: { params: { slug: string } }) {
  const title = params.slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="rk-page rk-app-surface flex min-h-screen items-center justify-center px-4 pb-24 pt-20 text-white">
      <div className="rk-state max-w-md rounded-2xl px-5 py-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
          Genre
        </p>
        <h1 className="mt-2 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Halaman genre ini sedang disiapkan. Kamu tetap bisa eksplor update terbaru dengan filter genre.
        </p>
        <Link
          href="/terbaru"
          className="rk-btn-primary mt-5 inline-flex rounded-full px-4 py-2 text-sm font-bold"
        >
          Buka Terbaru
        </Link>
      </div>
    </div>
  );
}
