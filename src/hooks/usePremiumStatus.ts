"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getProfile, isActivePremiumProfile, loadCachedProfile, subscribeProfile } from "@/utils/profileCache";
import { startPremiumStatusSync } from "@/utils/premiumStatusSync";

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
      const unsubscribe = subscribeProfile(user.id, updateState);
      const stopSync = startPremiumStatusSync(user.id);
      const data = getProfile(user.id) || await loadCachedProfile(user.id);

      if (cancelled) {
        unsubscribe();
        stopSync();
        return;
      }
      if (data) updateState(data);

      setLoading(false);
      cleanup = () => {
        unsubscribe();
        stopSync();
      };
    }

    function updateState(profile: Parameters<typeof isActivePremiumProfile>[0]) {
      const active = isActivePremiumProfile(profile);
      setIsPremium(active);
      setPremiumUntil(active ? profile?.premium_until || null : null);
    }

    let cleanup = () => {};
    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [user?.id, userLoading]);

  return { loading, isPremium, premiumUntil };
}
