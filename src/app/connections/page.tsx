import ConnectionsClient from "./ConnectionsClient";
export const dynamic = "force-dynamic";
export default function ConnectionsPage() { return <main className="rk-page px-4 pb-28 pt-20 text-white"><div className="rk-shell max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/60">Network</p><h1 className="mb-5 text-2xl font-black">Koneksi</h1><ConnectionsClient /></div></main>; }
