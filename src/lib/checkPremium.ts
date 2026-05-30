import type { Profile } from "@/types/user";

export function isStillPremium(
  profile?: Pick<Profile, "is_premium" | "premium_until"> | null
): boolean {
  if (!profile?.is_premium) return false;

  if (!profile.premium_until) return true;

  return new Date(profile.premium_until) > new Date();
}
