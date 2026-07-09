"use client";

/**
 * RyukomikDiscordBanner (compact)
 * Banner ajakan join Discord server Ryukomik Community.
 */

interface RyukomikDiscordBannerProps {
  className?: string;
}

export default function RyukomikDiscordBanner({ className = "" }: RyukomikDiscordBannerProps) {
  return (
    <div className="px-3 pt-2 pb-1 sm:px-6">
      <a
        href="https://discord.gg/Sf8pPRq4aj"
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative block overflow-hidden rounded-2xl border border-[#5865F2]/25 bg-gradient-to-br from-[var(--background)] via-[var(--surface-0)] to-[var(--surface-1)] px-4 py-3 transition-all duration-300 hover:border-[#5865F2]/60 ${className}`}
      >
        {/* discord icon watermark */}
        <svg
          className="pointer-events-none absolute -right-5 -top-3 h-32 w-32 opacity-10 transition-transform duration-500 group-hover:scale-110"
          viewBox="0 0 245 240"
          fill="#5865F2"
        >
          <path d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zm38.4 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.3-5 10.3-11.1 0-6.1-4.6-11.1-10.3-11.1z" />
          <path d="M189.5 20h-134C42.5 20 32 30.5 32 43.5v153.6c0 13 10.5 23.5 23.5 23.5h113.4l-5.3-18.5 12.8 11.9 12.1 11.2L210 240V43.5c0-13-10.5-23.5-23.5-23.5zM148 165.4s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0-.1-8.4 14.4-30.5 15.1z" />
        </svg>

        <div className="relative flex flex-wrap items-center gap-3">
          {/* Logo + wordmark + badge */}
          <div className="flex min-w-[130px] items-center gap-2">
            <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black">
              <svg
                viewBox="0 0 245 240"
                fill="#5865F2"
                className="h-[17px] w-[17px] object-contain"
              >
                <path d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zm38.4 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.3-5 10.3-11.1 0-6.1-4.6-11.1-10.3-11.1z" />
                <path d="M189.5 20h-134C42.5 20 32 30.5 32 43.5v153.6c0 13 10.5 23.5 23.5 23.5h113.4l-5.3-18.5 12.8 11.9 12.1 11.2L210 240V43.5c0-13-10.5-23.5-23.5-23.5zM148 165.4s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0-.1-8.4 14.4-30.5 15.1z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[12px] font-bold leading-tight tracking-wide text-white"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                RYUKOMIK
              </span>
              <span className="rounded-full border border-[#5865F2]/40 bg-[#5865F2]/15 px-1.5 py-[1px] text-[8px] font-semibold tracking-wide text-[#8ea1ff]">
                DISCORD
              </span>
            </div>
          </div>

          {/* Copy */}
          <div className="min-w-[160px] flex-1">
            <div
              className="text-[13px] font-bold leading-snug text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Gabung komunitas Ryukomik!
            </div>
            <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
              {["📢 Update tercepat", "💬 Diskusi bareng", "🎁 Event & giveaway"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#5865F2]/25 bg-[#5865F2]/10 px-2 py-[2px] text-[9.5px] text-[#8ea1ff]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#5865F2] to-[#7289da] px-3 py-2 text-[11.5px] font-bold text-white transition-transform duration-300 group-hover:scale-105">
            Gabung →
          </div>
        </div>
      </a>
    </div>
  );
}
