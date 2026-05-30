"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PresenceTracker() {
  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: crypto.randomUUID() } },
    });

    const updateOnlineCount = () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      window.__rkOnlineCount = count;
      window.dispatchEvent(
        new CustomEvent("rk-online-count-change", { detail: { count } }),
      );
    };

    channel.on("presence", { event: "sync" }, updateOnlineCount);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
        updateOnlineCount();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}

