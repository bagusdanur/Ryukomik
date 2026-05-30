"use client";

import { FiClock, FiGrid, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";

type PremiumCode = {
  id: string;
  code: string;
  duration_days: number;
  used?: boolean;
  used_by?: string | null;
  used_at?: string | null;
  created_at: string;
};

type PremiumCodesTabProps = {
  premiumCodes: PremiumCode[];
  codeDays: number;
  codesLoading: boolean;
  copied?: string | null;
  setCodeDays: (days: number) => void;
  fetchPremiumCodes: () => void;
  generateCode: () => void;
  deleteCode: (id: string) => void;
  copyToClipboard: (code: string) => void;
};

export default function PremiumCodesTab({
  premiumCodes,
  codeDays,
  codesLoading,
  copied,
  setCodeDays,
  fetchPremiumCodes,
  generateCode,
  deleteCode,
  copyToClipboard,
}: PremiumCodesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[15px] font-bold text-white">Kode Premium</p>
          <p className="text-[11px] text-white/30">
            Kelola token aktivasi user
          </p>
        </div>
        <button
          onClick={fetchPremiumCodes}
          disabled={codesLoading}
          className="w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-50"
        >
          <FiRefreshCw
            size={13}
            className={codesLoading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">
          Generate Baru
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={codeDays}
              onChange={(event) => setCodeDays(+event.target.value)}
              className="w-full bg-black/20 border border-white/[.1] rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-[#7c5cfc]/50 transition-all"
              placeholder="Durasi (Hari)"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20">
              HARI
            </span>
          </div>
          <button
            onClick={generateCode}
            className="bg-[#7c5cfc] hover:bg-[#6d4df5] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <FiPlus size={14} /> Generate
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {premiumCodes.length === 0 ? (
          <div className="text-center py-10 bg-[#13131a] rounded-2xl border border-dashed border-white/10">
            <HiOutlineSparkles
              size={24}
              className="mx-auto text-white/10 mb-2"
            />
            <p className="text-white/20 text-xs">Belum ada kode yang dibuat</p>
          </div>
        ) : (
          premiumCodes.map((code) => (
            <div
              key={code.id}
              className={`bg-[#13131a] border ${
                code.used ? "border-white/[.04]" : "border-[#7c5cfc]/20"
              } rounded-2xl p-4 space-y-3`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[14px] font-bold tracking-wider ${
                        code.used ? "text-white/40 line-through" : "text-amber-400"
                      }`}
                    >
                      {code.code}
                    </span>
                    {code.used ? (
                      <span className="text-[9px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded uppercase font-bold">
                        Terpakai
                      </span>
                    ) : (
                      <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 flex items-center gap-1">
                    <FiClock size={10} /> Durasi {code.duration_days} Hari
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(code.code)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      copied === code.code
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/[.05] text-white/40 hover:text-white"
                    }`}
                  >
                    <FiGrid size={14} />
                  </button>
                  {!code.used && (
                    <button
                      onClick={() => deleteCode(code.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400/60 hover:text-red-400 flex items-center justify-center transition-all"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-white/[.04] space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/20 uppercase tracking-tight">
                    Dibuat
                  </span>
                  <span className="text-white/50">
                    {new Date(code.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
                {code.used && (
                  <>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/20 uppercase tracking-tight">
                        User ID
                      </span>
                      <span className="text-white/50 font-mono truncate ml-4 max-w-[150px]">
                        {code.used_by}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/20 uppercase tracking-tight">
                        Tanggal Pakai
                      </span>
                      <span className="text-white/50">
                        {code.used_at ? new Date(code.used_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                        }) : "-"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
