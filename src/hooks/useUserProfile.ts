"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { clearCachedProfile, loadCachedProfile } from "@/utils/profileCache";
import type { CachedProfile } from "@/utils/profileCache";

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<CachedProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) return;

    const fetchProfile = async () => {
      const data = await loadCachedProfile(user.id);
      if (!cancelled) setProfile(data);
    };

    fetchProfile();

    const handleProfileUpdated = () => {
      clearCachedProfile(user.id);
      fetchProfile();
    };

    window.addEventListener("rk-profile-updated", handleProfileUpdated);

    return () => {
      cancelled = true;
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
