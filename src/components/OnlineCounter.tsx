"use client";
import { useEffect, useState } from "react";
import { FaUsers } from "react-icons/fa";

export default function OnlineCounter() {
  const [count, setCount] = useState<number | null>(() =>
    typeof window !== "undefined" && typeof window.__rkOnlineCount === "number"
      ? window.__rkOnlineCount
      : null,
  );

  useEffect(() => {
    const handleOnlineCount = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      setCount(customEvent.detail?.count ?? 0);
    };

    window.addEventListener("rk-online-count-change", handleOnlineCount);

    return () => {
      window.removeEventListener("rk-online-count-change", handleOnlineCount);
    };
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        <FaUsers className="text-white/70" />
        <span>Online</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        <span className="text-white/40 text-sm">
          {count === null ? "—" : count.toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
}
