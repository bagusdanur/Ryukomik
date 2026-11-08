export const FREE_BOOKMARK_LIMIT = 200;
export const PREMIUM_BOOKMARK_LIMIT = 1000;
export const BOOKMARK_HARD_LIMIT = PREMIUM_BOOKMARK_LIMIT;

export function bookmarkLimitForPremium(isPremium: boolean): number {
  return isPremium ? PREMIUM_BOOKMARK_LIMIT : FREE_BOOKMARK_LIMIT;
}
