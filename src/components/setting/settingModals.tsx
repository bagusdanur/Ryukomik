import { THEME_COLORS } from "@/components/ThemeColorProvider";
import { Modal } from "./settingUi";
import { FaCamera, FaUserEdit } from "react-icons/fa";
import type { ChangeEvent } from "react";

export const confirmConfig = {
  "clear-core": {
    title: "Hapus Cache Aplikasi?",
    desc: "Cache aplikasi akan dihapus. Aplikasi akan dimuat ulang.",
    btnClass: "bg-rose-500 hover:bg-rose-400 font-bold",
  },
  "unregister-sw": {
    title: "Reset Data Perangkat?",
    desc: "Reset Data akan membersihkan data lokal di perangkat ini.",
    btnClass: "rk-btn-primary font-bold",
  },
  backup: {
    title: "Buat Backup Baru?",
    desc: "Backup baru akan mengganti backup lama di cloud.",
    btnClass: "rk-btn-primary font-bold",
  },
  restore: {
    title: "Restore Backup?",
    desc: "Restore akan mengganti data di perangkat ini.",
    btnClass: "bg-emerald-500 hover:bg-emerald-400 font-bold",
  },
};

type ConfirmKey = keyof typeof confirmConfig;

type ProfileForm = {
  username: string;
  avatar_url?: string | null;
};

type ThemeModalProps = {
  activeTheme?: string;
  onChangeTheme: (theme: string) => void;
  onClose: () => void;
};

type ProfileEditModalProps = {
  form: ProfileForm;
  preview?: string | null;
  saving?: boolean;
  onChange: (field: keyof ProfileForm, value: string) => void;
  onFileChange: (file: File | null) => void;
  onRemoveImage: () => void;
  onClose: () => void;
  onSave: () => void;
};

type ConfirmModalProps = {
  confirm: ConfirmKey | null;
  loadingAction?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type LogoutModalProps = {
  loadingLogout?: boolean;
  onBackupLogout: () => void;
  onLogout: () => void;
  onCancel: () => void;
};

export function ThemeModal({ activeTheme, onChangeTheme, onClose }: ThemeModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="mb-4">
        <h3 className="text-lg font-black">Tema Website</h3>
        <p className="mt-1 text-xs text-white/45">
          Pilih tema yang nyaman untuk mata, dari light sampai pure black.
        </p>
      </div>
      <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:max-h-[60vh] sm:grid-cols-2">
        {THEME_COLORS.map((theme) => {
          const active = activeTheme === theme.key;
          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => onChangeTheme(theme.key)}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left ${
                active
                  ? "border-[var(--accent)]/45 bg-[var(--accent)]/12"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <span className="min-w-0 text-sm font-bold text-white/80">{theme.name}</span>
              <span className="flex items-center gap-1.5">
                {[theme.background, theme.surface1, theme.foreground, theme.accent, theme.accent2].map((color) => (
                  <span
                    key={color}
                    className="h-5 w-5 shrink-0 rounded-full border border-white/15"
                    style={{ background: color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onClose} className="rk-btn-ghost mt-4 w-full rounded-xl py-2">
        Tutup
      </button>
    </Modal>
  );
}

export function ProfileEditModal({
  form,
  preview,
  saving,
  onChange,
  onFileChange,
  onRemoveImage,
  onClose,
  onSave,
}) {
  const avatarPreview = preview || form.avatar_url;

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 text-center">
        <h3 className="text-lg font-black">Edit Profil</h3>
        <p className="mt-1 text-xs text-white/45">
          Ubah nama dan foto yang tampil di komentar.
        </p>
      </div>

      <div className="mb-4 flex justify-center">
        <div className="flex flex-col items-center gap-3">
          <label className="group relative block h-24 w-24 cursor-pointer rounded-full">
            <span className="block h-full w-full overflow-hidden rounded-full border border-white/15 bg-white/5 ring-4 ring-white/[0.03] transition group-hover:border-cyan-200/35">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={form.username || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <FaUserEdit className="text-2xl text-white/35" />
                </span>
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/30 bg-[var(--surface-1)] text-cyan-200 shadow-lg shadow-black/40 ring-4 ring-[#0f1321] transition group-hover:bg-cyan-200 group-hover:text-black">
              <FaCamera className="text-sm" />
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFileChange(event.target.files?.[0] || null)
              }
            />
          </label>
          {avatarPreview && (
            <button
              type="button"
              onClick={onRemoveImage}
              className="rounded-full border border-rose-400/15 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-200 transition hover:border-rose-300/30 hover:bg-rose-400/15"
            >
              Hapus Foto
            </button>
          )}
        </div>
      </div>

      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
        Username
      </label>
      <input
        value={form.username}
        onChange={(event) => onChange("username", event.target.value)}
        placeholder="Username"
        maxLength={32}
        className="rk-input mb-4 w-full rounded-xl px-3 py-2 text-sm"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rk-btn-ghost flex-1 rounded-xl py-2"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rk-btn-primary flex-1 rounded-xl py-2 font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Modal>
  );
}

export function ConfirmModal({ confirm, loadingAction, onCancel, onConfirm }: ConfirmModalProps) {
  if (!confirm) return null;
  const config = confirmConfig[confirm];
  if (!config) return null;
  const isResetData = confirm === "unregister-sw";

  return (
    <Modal>
      <h3 className="mb-2 text-lg font-semibold">{config.title}</h3>
      {isResetData ? (
        <div className="mb-5 space-y-2 text-sm leading-relaxed text-white/65">
          <p>{config.desc}</p>
          <ul className="space-y-1.5">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
              <span>Bookmark lokal dan riwayat baca lokal bisa hilang.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
              <span>Cache akan dihapus dan akun bisa logout.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
              <span>Data akun, premium, komentar, dan leaderboard tetap aman.</span>
            </li>
          </ul>
          <p className="pt-1 font-bold text-white/75">
            Buat{" "}
            <span className="font-black text-[var(--accent-2)]">
              Create Backup Data
            </span>{" "}
            dulu sebelum lanjut.
          </p>
        </div>
      ) : (
        <p className="mb-5 text-sm leading-relaxed text-white/65">{config.desc}</p>
      )}
      <div className="flex gap-3">
        <button onClick={onCancel} className="rk-btn-ghost flex-1 rounded-xl py-2">
          Batal
        </button>
        <button
          disabled={loadingAction}
          onClick={onConfirm}
          className={`flex-1 rounded-xl py-2 transition ${config.btnClass}`}
        >
          {loadingAction ? "Processing..." : "Lanjutkan"}
        </button>
      </div>
    </Modal>
  );
}

export function LogoutModal({ loadingLogout, onBackupLogout, onLogout, onCancel }: LogoutModalProps) {
  return (
    <Modal>
      <h3 className="text-lg font-semibold mb-2">Logout dari akun?</h3>
      <p className="text-sm text-white/70 mb-5">
        Disarankan membuat backup terlebih dahulu agar bookmark dan riwayat baca tidak hilang.
      </p>
      <div className="flex flex-col gap-3">
        <button
          disabled={loadingLogout}
          onClick={onBackupLogout}
          className="rk-btn-primary w-full rounded-xl py-2"
        >
          Backup & Logout
        </button>
        <button
          disabled={loadingLogout}
          onClick={onLogout}
          className="w-full rounded-xl bg-rose-500 py-2 font-bold hover:bg-rose-400 transition"
        >
          Logout Tanpa Backup
        </button>
        <button onClick={onCancel} className="rk-btn-ghost w-full rounded-xl py-2">
          Batal
        </button>
      </div>
    </Modal>
  );
}
