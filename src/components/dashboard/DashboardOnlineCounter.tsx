"use client";

import { useEffect, useState } from "react";
import { FiActivity } from "react-icons/fi";

export default function DashboardOnlineCounter() {
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && typeof window.__rkOnlineCount === "number"
      ? window.__rkOnlineCount
      : null,
  );

  useEffect(() => {
    const handleOnlineCount = (event) => {
      setCount(event.detail?.count ?? 0);
    };

    window.addEventListener("rk-online-count-change", handleOnlineCount);

    return () => {
      window.removeEventListener("rk-online-count-change", handleOnlineCount);
    };
  }, []);

  if (count === null) return null;

  return (
    <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <FiActivity size={17} className="text-emerald-400" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      </div>
      <p
        className="text-2xl font-bold"
        style={{ fontFamily: "Space Mono, monospace" }}
      >
        {count.toLocaleString("id-ID")}
      </p>
      <p className="mt-0.5 text-[11px] text-white/30">Pengunjung Online</p>
      <p className="mt-1 text-[10px] text-white/20">
        Realtime dari sesi aktif
      </p>
    </div>
  );
}
