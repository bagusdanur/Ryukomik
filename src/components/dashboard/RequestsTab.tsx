"use client";

import { FiCheck, FiEye, FiRefreshCw, FiX } from "react-icons/fi";
import { Avatar } from "./dashboardUtils";

const STATUS_LABEL = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const STATUS_STYLE = {
  pending:
    "bg-[color:color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]",
  approved:
    "bg-[color:color-mix(in_srgb,var(--accent-2)_12%,transparent)] text-[var(--accent-2)]",
  rejected:
    "bg-[color:color-mix(in_srgb,var(--accent-3)_12%,transparent)] text-[var(--accent-3)]",
};

type RequestStatus = "pending" | "approved" | "rejected";

type PremiumRequest = {
  id: string;
  status: RequestStatus | string;
  name?: string | null;
  proof_url: string;
  package_name?: string | null;
  duration_days?: number | null;
  amount?: number | null;
  sk_agreed?: boolean | null;
  sk_agreed_at?: string | null;
  created_at: string;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

type RequestsTabProps = {
  requests: PremiumRequest[];
  requestsLoading: boolean;
  requestFilter: string;
  actionLoading?: string | null;
  fetchRequests: () => void;
  setRequestFilter: (filter: string) => void;
  setProofModal: (url: string) => void;
  handleRequestAction: (id: string, action: "approve" | "reject") => void;
};

export default function RequestsTab({
  requests,
  requestsLoading,
  requestFilter,
  actionLoading,
  fetchRequests,
  setRequestFilter,
  setProofModal,
  handleRequestAction,
}: RequestsTabProps) {
  const formatAmount = (amount?: number | string | null) => {
    const value = Number(amount);
    return Number.isFinite(value)
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(value)
      : "Rp 10.000";
  };

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold text-white">Bukti Pembayaran</p>
          <p className="text-[11px] text-white/30">
            Verifikasi request premium user
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={requestsLoading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.05] text-white/40 transition-colors hover:text-white"
        >
          <FiRefreshCw
            size={13}
            className={requestsLoading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { key: "all", label: "Semua" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setRequestFilter(filter.key)}
            className={`flex-1 rounded-xl border py-2 text-[11px] font-semibold transition-all ${
              requestFilter === filter.key
                ? "border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:color-mix(in_srgb,var(--accent)_70%,white)]"
                : "border-white/[.08] bg-transparent text-white/35 hover:text-white/60"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {requestsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rk-card-soft rounded-2xl border-dashed py-12 text-center">
          <FiCheck size={28} className="mx-auto mb-2 text-white/10" />
          <p className="text-[13px] text-white/25">
            Tidak ada request{" "}
            {requestFilter !== "all"
              ? STATUS_LABEL[requestFilter]?.toLowerCase()
              : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const displayName = request.profiles?.username || request.name || "User";
            const avatarUrl = request.profiles?.avatar_url || null;
            const packageName = request.package_name || "1 Bulan";
            const durationDays = Math.max(1, Math.floor(Number(request.duration_days) || 30));
            const date = new Date(request.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={request.id}
                className={`rk-card-soft rounded-2xl p-4 transition-opacity ${
                  request.status === "rejected" ? "opacity-60" : ""
                } ${
                  request.status === "approved"
                    ? "border-[color:color-mix(in_srgb,var(--accent-2)_20%,transparent)]"
                    : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={displayName} url={avatarUrl} size={36} />
                    <div>
                      <p className="text-[13px] font-semibold text-white/85">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-white/30">{date}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      STATUS_STYLE[request.status] || STATUS_STYLE.pending
                    }`}
                  >
                    {STATUS_LABEL[request.status] || request.status}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-4 gap-2 rounded-xl border border-white/[.05] bg-white/[.03] p-2.5">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                      Paket
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-white/75">
                      {packageName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                      Durasi
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-white/75">
                      {durationDays} hari
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                      Nominal
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-white/75">
                      {formatAmount(request.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                      Persetujuan SK
                    </p>
                    <p className={`mt-0.5 text-[11px] font-bold ${request.sk_agreed ? "text-emerald-400" : "text-rose-400"}`}>
                      {request.sk_agreed ? "Setuju" : "Tidak"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="group relative mb-3 h-28 w-full overflow-hidden rounded-xl border border-white/[.05] bg-white/[.03]"
                  onClick={() => setProofModal(request.proof_url)}
                >
                  <img
                    src={request.proof_url}
                    alt="Bukti"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-[12px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <FiEye size={14} /> Lihat
                  </span>
                </button>

                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestAction(request.id, "approve")}
                      disabled={!!actionLoading}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color:color-mix(in_srgb,var(--accent-2)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] py-2.5 text-[11px] font-bold text-[var(--accent-2)] transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.id + "approve" ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent-2)] border-t-transparent" />
                      ) : (
                        <FiCheck size={11} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequestAction(request.id, "reject")}
                      disabled={!!actionLoading}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color:color-mix(in_srgb,var(--accent-3)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-3)_8%,transparent)] py-2.5 text-[11px] font-bold text-[var(--accent-3)] transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.id + "reject" ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent-3)] border-t-transparent" />
                      ) : (
                        <FiX size={11} />
                      )}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
