import type { Metadata } from "next";
import SocialModerationClient from "./SocialModerationClient";

export const metadata: Metadata = { title: "Moderasi Sosial | Ryukomik" };
export default function SocialModerationPage() { return <main className="rk-page px-3 pb-28 pt-6 text-white sm:px-5 sm:pt-16"><div className="rk-shell max-w-4xl"><p className="rk-kicker">ADMIN & STAFF</p><h1 className="rk-heading mt-1">Moderasi komunitas</h1><SocialModerationClient/></div></main>; }
