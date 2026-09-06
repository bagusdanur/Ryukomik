"use client";

import { useEffect, useState } from "react";
import LoginModal from "@/components/LoginModal";
import PremiumModal from "@/components/PremiumModal";
import {
  applyThemeColor,
  THEME_COLOR_KEY,
  THEME_COLORS,
} from "@/components/ThemeColorProvider";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { clearCachedProfile, loadCachedProfile } from "@/utils/profileCache";
import { createBackup, restoreBackup } from "@/utils/backup";
import { getCacheSizeMB } from "@/utils/getCacheSizeMB";
import {
  clearCoreCache,
  getUserAutoSyncKey,
  getUserLastBackupKey,
  LAST_AUTO_BACKUP_KEY,
  unregisterServiceWorker,
} from "@/components/setting/settingsUtils";
import {
  AccountSection,
  AppearanceSection,
  BackupCloudSection,
  LogoutButton,
  MyStatsSection,
  ProfileSection,
  PrivacySection,
  PushNotificationSection,
  StorageSection,
  SupportInfoSection,
  VisitorStatsSection,
  XpSection,
} from "@/components/setting/settingSections";
import {
  ConfirmModal,
  LogoutModal,
  ProfileEditModal,
  ThemeModal,
} from "@/components/setting/settingModals";
import { Toast } from "@/components/setting/settingUi";

const initialStats = { total_comments: 0, level: 1, xp: 0, username: "", avatar_url: "" };
const initialProfileForm = { username: "", avatar_url: "" };
const initialPrivacy = {
  show_public_reads: true,
  show_public_comments: true,
  show_public_join_date: true,
};

type Stats = typeof initialStats & {
  role?: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
  created_at?: string | null;
  total_reads?: number;
  show_public_reads?: boolean;
  show_public_comments?: boolean;
  show_public_join_date?: boolean;
};

type PrivacyField = keyof typeof initialPrivacy;
type ConfirmAction = "clear-core" | "unregister-sw" | "backup" | "restore";
type ToastState = { type: "success" | "error"; message: string } | null;
type ProfileForm = typeof initialProfileForm;
type ImgBbResponse = { success?: boolean; data?: { url?: string } };

export default function SettingsClient() {
  const { user } = useSupabaseUser();
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [coreCacheSize, setCoreCacheSize] = useState("0.00");
  const [stats, setStats] = useState<Stats>(initialStats);
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [savingPrivacyField, setSavingPrivacyField] = useState<PrivacyField | null>(null);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [autoSyncBackup, setAutoSyncBackup] = useState(false);
  const [lastAutoBackup, setLastAutoBackup] = useState<number | null>(null);
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0].key);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isLogin = !!user;
  const isPremium = Boolean(
    stats.is_premium &&
      (!stats.premium_until || new Date(stats.premium_until) > new Date()),
  );
  const premiumUntil = isPremium ? stats.premium_until || null : null;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchStats = async () => {
      setProfileLoading(true);
      const profile = await loadCachedProfile(user.id);

      if (cancelled) return;

      if (profile) {
        setStats({
          total_comments: profile.total_comments ?? 0,
          level: profile.level ?? 1,
          xp: profile.xp ?? 0,
          username: profile.username || "",
          avatar_url: profile.avatar_url || "",
          role: profile.role,
          is_premium: profile.is_premium ?? false,
          premium_until: profile.premium_until,
          created_at: profile.created_at,
          show_public_reads: profile.show_public_reads,
          show_public_comments: profile.show_public_comments,
          show_public_join_date: profile.show_public_join_date,
          total_reads: profile.total_reads ?? 0,
        });
        setProfileForm({
          username: profile.username || user.user_metadata?.name || "",
          avatar_url: profile.avatar_url || user.user_metadata?.avatar_url || "",
        });
        setPrivacy({
          show_public_reads: profile.show_public_reads !== false,
          show_public_comments: profile.show_public_comments !== false,
          show_public_join_date: profile.show_public_join_date !== false,
        });
      }
      setProfileLoading(false);
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const loadCacheSize = () => {
      getCacheSizeMB("rk").then(setCoreCacheSize);
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(loadCacheSize, { timeout: 3500 });
      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(loadCacheSize, 1200);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem(THEME_COLOR_KEY) || THEME_COLORS[0].key;
      setThemeColor(applyThemeColor(saved).key);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!user?.id || !isPremium) {
        setAutoSyncBackup(false);
        return;
      }
      setAutoSyncBackup(localStorage.getItem(getUserAutoSyncKey(user.id)) === "1");
    });

    const readLastBackup = () => {
      const key = user?.id ? getUserLastBackupKey(user.id) : LAST_AUTO_BACKUP_KEY;
      const last = Number(localStorage.getItem(key) || 0);
      setLastAutoBackup(last || null);
    };

    readLastBackup();
    window.addEventListener("rk-auto-sync-backup-finished", readLastBackup);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("rk-auto-sync-backup-finished", readLastBackup);
    };
  }, [isPremium, user?.id]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleAutoSyncBackup() {
    if (!isPremium) {
      setShowPremium(true);
      showToast("error", "Auto Sync Backup khusus Premium");
      return;
    }

    const next = !autoSyncBackup;
    setAutoSyncBackup(next);
    if (!user?.id) return;
    localStorage.setItem(getUserAutoSyncKey(user.id), next ? "1" : "0");
    window.dispatchEvent(new Event("rk-auto-sync-backup-toggle"));
    showToast("success", next ? "Auto Sync Backup aktif" : "Auto Sync Backup nonaktif");
  }

  function changeThemeColor(nextTheme: string) {
    localStorage.setItem(THEME_COLOR_KEY, nextTheme);
    setThemeColor(applyThemeColor(nextTheme).key);
    window.dispatchEvent(
      new CustomEvent("rk-theme-color-change", {
        detail: { themeKey: nextTheme },
      }),
    );
    showToast("success", "Warna tampilan diperbarui");
    setShowThemeModal(false);
  }

  function updateProfileForm(field: keyof ProfileForm, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function openProfileModal() {
    setProfileForm({
      username: stats.username || user?.user_metadata?.name || "",
      avatar_url: stats.avatar_url || user?.user_metadata?.avatar_url || "",
    });
    setShowProfileModal(true);
  }

  function closeProfileModal() {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview(null);
    setProfileImageFile(null);
    setShowProfileModal(false);
  }

  function selectProfileImage(file: File | null) {
    if (!file) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedImageTypes.includes(file.type)) {
      showToast("error", "Foto harus JPG, PNG, atau WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Ukuran foto maksimal 5MB");
      return;
    }

    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileImageFile(file);
    setProfilePreview(URL.createObjectURL(file));
  }

  function removeProfileImage() {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileImageFile(null);
    setProfilePreview(null);
    setProfileForm((current) => ({ ...current, avatar_url: "" }));
  }

  async function uploadProfileImage() {
    if (!profileImageFile) return profileForm.avatar_url.trim();

    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) throw new Error("API key upload gambar belum diatur");

    const formData = new FormData();
    formData.append("image", profileImageFile);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as ImgBbResponse;

    if (!result.success || !result.data?.url) throw new Error("Upload foto gagal");
    return result.data.url;
  }

  async function saveProfile() {
    if (!user?.id) return;

    const username = profileForm.username.trim();
    if (username.length < 3) {
      showToast("error", "Username minimal 3 karakter");
      return;
    }

    setSavingProfile(true);

    try {
      const { data: duplicateProfiles, error: duplicateError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .neq("id", user.id)
        .limit(1);

      if (duplicateError) throw duplicateError;

      if (duplicateProfiles?.length) {
        showToast("error", "Username sudah dipakai");
        return;
      }

      const avatarUrl = await uploadProfileImage();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username, avatar_url: avatarUrl || null })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: username,
          full_name: username,
          avatar_url: avatarUrl || null,
        },
      });

      if (authError) throw authError;

      setStats((current) => ({
        ...current,
        username,
        avatar_url: avatarUrl || null,
      }));
      setProfileForm({ username, avatar_url: avatarUrl });
      clearCachedProfile(user.id);
      window.dispatchEvent(new Event("rk-profile-updated"));
      closeProfileModal();
      showToast("success", "Profil berhasil diperbarui");
    } catch (error) {
      console.error("Gagal update profil:", error);
      const message = error instanceof Error ? error.message : "Gagal update profil";
      showToast(
        "error",
        message.includes("23505") ? "Username sudah dipakai" : message,
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function togglePrivacy(field: PrivacyField) {
    if (!user?.id || savingPrivacyField) return;

    const next = !(privacy[field] !== false);
    const previous = privacy[field];
    setPrivacy((current) => ({ ...current, [field]: next }));
    setSavingPrivacyField(field);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: next })
        .eq("id", user.id);

      if (error) throw error;
      clearCachedProfile(user.id);
      showToast("success", "Privacy profil diperbarui");
    } catch (error) {
      setPrivacy((current) => ({ ...current, [field]: previous }));
      console.error("Gagal update privacy:", error);
      const message = error instanceof Error ? error.message : "";
      showToast(
        "error",
        message.includes("column")
          ? "Kolom privacy belum ada di database"
          : "Gagal update privacy",
      );
    } finally {
      setSavingPrivacyField(null);
    }
  }

  async function handleConfirmAction() {
    setLoadingAction(true);
    let ok = false;

    try {
      if (confirm === "clear-core") {
        ok = await clearCoreCache();
        if (ok) setTimeout(() => window.location.reload(), 800);
      } else if (confirm === "unregister-sw") {
        ok = await unregisterServiceWorker();
        if (ok) setTimeout(() => window.location.reload(), 800);
      } else if (confirm === "backup") {
        ok = await createBackup(user?.id);
      } else if (confirm === "restore") {
        ok = await restoreBackup(user?.id);
      }
    } catch {
      ok = false;
    }

    setLoadingAction(false);
    setConfirm(null);
    showToast(ok ? "success" : "error", ok ? "Berhasil" : "Gagal melakukan aksi");
  }

  async function handleBackupLogout() {
    setLoadingLogout(true);
    await createBackup(user?.id);
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function handleLogout() {
    setLoadingLogout(true);
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="rk-page px-4 pb-24 pt-20 text-white">
      <div className="rk-shell max-w-2xl">
        <ProfileSection
          isLogin={isLogin}
          user={user}
          profile={stats}
          onEditProfile={openProfileModal}
        />

        {isLogin && <XpSection stats={stats} />}
        {isLogin && <MyStatsSection stats={stats} />}

        <AccountSection
          isLogin={isLogin}
          isPremium={isPremium}
          loading={profileLoading}
          premiumUntil={premiumUntil}
          username={stats.username}
          user={user}
          onLogin={() => setShowLogin(true)}
          onPremium={() => setShowPremium(true)}
        />

        <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />

        <AppearanceSection themeColor={themeColor} onOpenTheme={() => setShowThemeModal(true)} />
        {isLogin && <PushNotificationSection />}
        {isLogin && (
          <PrivacySection
            privacy={privacy}
            savingField={savingPrivacyField}
            onToggle={togglePrivacy}
          />
        )}
        <StorageSection
          coreCacheSize={coreCacheSize}
          onClearCache={() => setConfirm("clear-core")}
          onResetData={() => setConfirm("unregister-sw")}
        />

        {isLogin && (
          <BackupCloudSection
            autoSyncBackup={autoSyncBackup}
            lastAutoBackup={lastAutoBackup}
            onBackup={() => setConfirm("backup")}
            onRestore={() => setConfirm("restore")}
            onToggleAutoSync={toggleAutoSyncBackup}
          />
        )}

        <SupportInfoSection />
        <VisitorStatsSection />

        {isLogin && <LogoutButton onClick={() => setShowLogoutConfirm(true)} />}

        {showThemeModal && (
          <ThemeModal
            activeTheme={themeColor}
            onChangeTheme={changeThemeColor}
            onClose={() => setShowThemeModal(false)}
          />
        )}

        {showProfileModal && (
          <ProfileEditModal
            form={profileForm}
            preview={profilePreview}
            saving={savingProfile}
            onChange={updateProfileForm}
            onFileChange={selectProfileImage}
            onRemoveImage={removeProfileImage}
            onClose={closeProfileModal}
            onSave={saveProfile}
          />
        )}

        {confirm && (
          <ConfirmModal
            confirm={confirm}
            loadingAction={loadingAction}
            onCancel={() => setConfirm(null)}
            onConfirm={handleConfirmAction}
          />
        )}

        {showLogoutConfirm && (
          <LogoutModal
            loadingLogout={loadingLogout}
            onBackupLogout={handleBackupLogout}
            onLogout={handleLogout}
            onCancel={() => setShowLogoutConfirm(false)}
          />
        )}

        <Toast toast={toast} />
        {showLogin && <LoginModal close={() => setShowLogin(false)} />}
      </div>
    </div>
  );
}
