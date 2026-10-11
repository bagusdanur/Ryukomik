"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import {
  getProfile,
  isActivePremiumProfile,
  isProfileStale,
  loadCachedProfile,
  refreshProfile,
  subscribeProfile,
} from "@/utils/profileCache";
import { startPremiumStatusSync } from "@/utils/premiumStatusSync";

export function usePremiumStatus() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const { user, loading: userLoading } = useSupabaseUser();

  useEffect(() => {
    if (!premiumUntil) return;
    const remaining = Date.parse(premiumUntil) - Date.now();
    if (remaining > 2147483647) return;
    const timer = window.setTimeout(() => { setIsPremium(false); setPremiumUntil(null); }, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [premiumUntil]);

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

      // Do not resolve a stale cache into `loading=false`: a user who was just
      // approved could otherwise be briefly treated as non-premium, which
      // loads an ad script that cannot be fully torn down afterwards. When the
      // cache is stale we wait for the fresh read instead.
      // Use loadCachedProfile({force}) rather than refreshProfile: it de-dupes
      // concurrent mounts into ONE Supabase read instead of one per component.
      let data: Awaited<ReturnType<typeof loadCachedProfile>> | null = null;
      if (isProfileStale(user.id)) {
        try {
          data = await loadCachedProfile(user.id, { force: true });
        } catch {
          // Network hiccup: fall back to whatever the cache holds so the UI
          // (and ads) are not stuck waiting forever.
          data = getProfile(user.id);
        }
      } else {
        data = getProfile(user.id) ?? (await loadCachedProfile(user.id));
      }

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
