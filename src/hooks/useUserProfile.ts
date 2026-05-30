"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface UserProfile {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
}

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) setProfile(data || null);
    };

    fetchProfile();

    const handleProfileUpdated = () => {
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
