"use client";

import { socialFetch } from "@/lib/social/client";

export type DownloadQuota = {
  unlimited: boolean;
  limit: number | null;
  used: number;
  reserved: number;
  remaining: number | null;
  resetTimezone: string;
};

type QuotaResponse = { quota: DownloadQuota; reservationId?: string | null };

export const getDownloadQuota = () => socialFetch<QuotaResponse>("/api/download/quota");

export const updateDownloadQuota = (action: "start" | "complete" | "cancel", reservationId?: string) =>
  socialFetch<QuotaResponse>("/api/download/quota", {
    method: "POST",
    body: JSON.stringify({ action, reservationId }),
  });
