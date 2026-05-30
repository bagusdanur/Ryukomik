import { FiExternalLink, FiServer } from "react-icons/fi";

const SUPPORT_URL = "https://omg10.com/4/10352759";

export default function ReaderSupportAd() {
  return (
    <div className="w-full pb-0 sm:mx-auto sm:max-w-[520px] sm:px-3 sm:pt-16 sm:pb-3">
      <a
        data-no-tap
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={(event) => event.stopPropagation()}
        className="group relative flex min-h-[112px] w-full overflow-hidden border-y border-cyan-300/15 bg-[#201a36] text-white shadow-[0_18px_60px_rgba(0,0,0,.35)] sm:rounded-lg sm:border"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_28%,rgba(12,206,236,.22),transparent_30%),radial-gradient(circle_at_88%_24%,rgba(12,206,236,.14),transparent_18%),linear-gradient(135deg,rgba(3,23,38,.92),rgba(47,34,70,.95))]" />
        <div className="absolute -left-8 -top-10 h-36 w-36 rounded-full border border-cyan-300/15" />
        <div className="absolute left-6 top-4 h-16 w-16 rounded-full border border-cyan-300/15 bg-cyan-300/5 blur-[.2px]" />

        <div className="relative flex w-full items-center gap-3 px-4 py-4 min-[380px]:gap-4 min-[380px]:px-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 min-[380px]:h-14 min-[380px]:w-14">
            <FiServer size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">
              Sponsor
            </p>
            <p className="text-[20px] font-black leading-[1.02] tracking-normal text-white min-[380px]:text-[23px]">
              Klik untuk
              <br />
              support server
            </p>
            <p className="mt-2 max-w-[250px] text-[11px] font-semibold leading-snug text-white/65 min-[380px]:text-xs">
              Dukung Ryukomik tetap cepat dan gratis.
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-300 transition group-hover:bg-cyan-300 group-hover:text-[#101427] min-[380px]:h-12 min-[380px]:w-12">
            <FiExternalLink size={19} />
          </div>
        </div>
      </a>
    </div>
  );
}
