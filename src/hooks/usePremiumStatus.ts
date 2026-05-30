"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PremiumProfile {
  is_premium?: boolean;
  premium_until?: string | null;
}

export function usePremiumStatus() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel | undefined;

    async function init() {
      const { data: { user }, error: authErr } =
        await supabase.auth.getUser();

      if (authErr || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_premium, premium_until")
        .eq("id", user.id)
        .single();

      if (!error && data) updateState(data);

      channel = supabase
        .channel(`premium-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => updateState(payload.new as PremiumProfile)
        )
        .subscribe();

      setLoading(false);
    }

    function updateState(profile: PremiumProfile) {
      if (!profile?.is_premium) {
        setIsPremium(false);
        setPremiumUntil(null);
        return;
      }

      const active =
        !profile.premium_until ||
        new Date(profile.premium_until) > new Date();

      setIsPremium(active);
      setPremiumUntil(active ? profile.premium_until : null);
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { loading, isPremium, premiumUntil };
}
