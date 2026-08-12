import SocialProfileEditor from "./SocialProfileEditor";
export const dynamic = "force-dynamic";
export default function SocialSettingsPage() { return <main className="rk-page px-3 pb-36 pt-20 text-white sm:px-4 sm:pt-24"><div className="rk-shell max-w-2xl"><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/60">Profil sosial</p><h1 className="text-2xl font-black">Atur profil komunitas</h1><p className="mt-1 text-sm text-white/40">Atur tampilan profil publik dan privasi aktivitasmu.</p></div><SocialProfileEditor /></div></main>; }
