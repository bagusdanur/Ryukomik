"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { createBackup } from "@/utils/backup";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";

const AUTO_SYNC_KEY = "rk_auto_sync_backup_enabled";
const LAST_BACKUP_KEY = "rk_last_auto_backup_at";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

const getUserAutoSyncKey = (userId: string) => `${AUTO_SYNC_KEY}:${userId}`;
const getUserLastBackupKey = (userId: string) => `${LAST_BACKUP_KEY}:${userId}`;

export default function AutoBackup() {
  const { user } = useSupabaseUser();
  const userId = user?.id || null;
  const [isPremium, setIsPremium] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const readEnabled = () => {
      const key = userId ? getUserAutoSyncKey(userId) : AUTO_SYNC_KEY;
      setEnabled(localStorage.getItem(key) === "1");
    };

    readEnabled();
    window.addEventListener("rk-auto-sync-backup-toggle", readEnabled);
    window.addEventListener("storage", readEnabled);

    return () => {
      window.removeEventListener("rk-auto-sync-backup-toggle", readEnabled);
      window.removeEventListener("storage", readEnabled);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      const id = requestAnimationFrame(() => setIsPremium(false));
      return () => cancelAnimationFrame(id);
    }

    let active = true;

    loadCachedProfile(userId)
      .then((profile) => {
        if (active) setIsPremium(isActivePremiumProfile(profile));
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    if (!userId || !isPremium || !enabled) return;

    const runBackup = async () => {
      if (runningRef.current) return;

      runningRef.current = true;
      const ok = await createBackup(userId);
      if (ok) {
        localStorage.setItem(getUserLastBackupKey(userId), String(Date.now()));
        window.dispatchEvent(new Event("rk-auto-sync-backup-finished"));
      }
      runningRef.current = false;

      timerRef.current = window.setTimeout(runBackup, SYNC_INTERVAL_MS);
    };

    const last = Number(localStorage.getItem(getUserLastBackupKey(userId)) || 0);
    const wait = Math.max(0, SYNC_INTERVAL_MS - (Date.now() - last));

    timerRef.current = window.setTimeout(runBackup, wait);

    return () => window.clearTimeout(timerRef.current);
  }, [enabled, isPremium, userId]);

  return null;
}
