// Pure gating rules for ads vs. premium. Kept free of DOM/React so they can be
// unit-tested directly and reused by both the ad loader and the reader banner.

export type AdLoadInput = {
  /** Supabase session still resolving. */
  userLoading: boolean;
  /** A user is signed in. */
  hasUser: boolean;
  /** Premium status still resolving (includes the stale-cache revalidation window). */
  premiumLoading: boolean;
  /** Premium confirmed active. */
  isPremium: boolean;
};

/**
 * Whether third-party ad scripts may be injected.
 *
 * Critical: for a signed-in user we must WAIT until premium status is known
 * before loading anything. The profile cache serves stale data first
 * (stale-while-revalidate), so `premiumLoading` is the only safe signal — it
 * closes the window where an about-to-be-premium user would load the ad script
 * that can never be fully torn down.
 */
export function shouldLoadAdScripts(input: AdLoadInput): boolean {
  if (input.isPremium) return false;
  if (input.userLoading) return false;
  if (!input.hasUser) return true;
  return !input.premiumLoading;
}

/** Ad containers injected by providers (tag.min.js popunder/vignette etc.). */
export const AD_PROVIDER_HOSTS = ["al5sm.com", "gaslah.my.id", "omg10.com"];

/**
 * Selectors that remove EVERY ad trace. Regression guard: an earlier version
 * only removed `[data-ad-provider]` (our own tags), which left the elements
 * injected by tag.min.js behind, so premium users kept seeing ads. Host-based
 * selectors are mandatory and must not be dropped.
 */
export const AD_REMOVAL_SELECTORS = [
  "[data-ad-provider]",
  "script[data-zone]",
  ...AD_PROVIDER_HOSTS.map((host) => `script[src*="${host}"]`),
  ...AD_PROVIDER_HOSTS.map((host) => `iframe[src*="${host}"]`),
  ...AD_PROVIDER_HOSTS.map((host) => `div[src*="${host}"], ins[src*="${host}"]`),
];

/** Reader support banner must not flash for premium users while status loads. */
export function shouldShowSupportAd(input: { loading: boolean; isPremium: boolean }): boolean {
  return !input.loading && !input.isPremium;
}
