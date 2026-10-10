"use client";

// How often a logged-in user who is stuck on a locked premium chapter re-checks
// access while they wait for admin approval. Kept tiny on purpose: the chapter
// route is throttled server-side (10s) and this only runs for users sitting on a
// locked chapter, so it does not add per-page egress.
export const LOCKED_RECHECK_MS = 60_000;

export type GateRefreshPlan = { pollMs: number | null; forcePremium: boolean };

// Decide whether the gate should (a) force a fresh premium check on the next
// chapter fetch and (b) schedule a periodic re-check. Only do work when the
// chapter is locked AND we have a logged-in user who could become premium.
export function gateRefreshPlan(input: { locked: boolean; hasUser: boolean }): GateRefreshPlan {
  const waiting = input.locked && input.hasUser;
  return { pollMs: waiting ? LOCKED_RECHECK_MS : null, forcePremium: waiting };
}
