import ConnectionsClient from "./ConnectionsClient";
export const dynamic = "force-dynamic";
export default function ConnectionsPage() { return <main className="rk-page px-4 pb-28 pt-16 text-white sm:pt-20"><div className="rk-shell max-w-2xl"><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/60">Jaringan sosial</p><h1 className="text-2xl font-black">Koneksi komunitas</h1><p className="mt-1 text-sm text-white/40">Temukan kembali pembaca yang mengikuti dan kamu ikuti.</p></div><ConnectionsClient /></div></main>; }
