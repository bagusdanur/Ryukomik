"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getProfile, loadCachedProfile, refreshProfile, subscribeProfile } from "@/utils/profileCache";
import type { CachedProfile } from "@/utils/profileCache";
import { startProfileVisibilityRefresh } from "@/utils/profileVisibilityRefresh";

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<CachedProfile | null>(() => getProfile(user?.id));

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) return;

    const fetchProfile = async () => loadCachedProfile(user.id);

    const unsubscribe = subscribeProfile(user.id, (data) => {
      if (!cancelled) setProfile(data);
    });
    void fetchProfile();

    const stopVisibilityRefresh = startProfileVisibilityRefresh(user.id);

    const handleProfileUpdated = () => {
      void refreshProfile(user.id);
    };

    window.addEventListener("rk-profile-updated", handleProfileUpdated);

    return () => {
      cancelled = true;
      unsubscribe();
      stopVisibilityRefresh();
      window.removeEventListener("rk-profile-updated", handleProfileUpdated);
    };
  }, [user?.id]);

  const activeProfile = user?.id && profile?.id === user.id ? profile : null;

  return {
    profile,
    avatarUrl: activeProfile?.avatar_url || user?.user_metadata?.avatar_url || null,
    displayName:
      activeProfile?.username ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "profile",
  };
}
