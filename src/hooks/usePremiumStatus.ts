"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { loadCachedProfile } from "@/utils/profileCache";

interface PremiumProfile {
  is_premium?: boolean;
  premium_until?: string | null;
}

export function usePremiumStatus() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const { user, loading: userLoading } = useSupabaseUser();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (userLoading) return;
      if (!user?.id) {
        setIsPremium(false);
        setPremiumUntil(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await loadCachedProfile(user.id);

      if (cancelled) return;
      if (data) updateState(data);

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
      cancelled = true;
    };
  }, [user?.id, userLoading]);

  return { loading, isPremium, premiumUntil };
}
