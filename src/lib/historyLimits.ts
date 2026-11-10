export const FREE_HISTORY_LIMIT = 500;
export const PREMIUM_HISTORY_LIMIT = 2000;
export const HISTORY_HARD_LIMIT = PREMIUM_HISTORY_LIMIT;

export function historyLimitForPremium(isPremium: boolean): number {
  return isPremium ? PREMIUM_HISTORY_LIMIT : FREE_HISTORY_LIMIT;
}
