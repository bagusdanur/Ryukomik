"use client";

export const PER_PAGE = 20;

export function timeAgo(dateStr) {
  if (!dateStr) return "-";

  let value = dateStr;
  if (typeof value === "string" && !value.endsWith("Z") && !value.includes("+")) {
    value = value.replace(" ", "T") + "Z";
  }

  const date = new Date(value);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(diff)) return "-";
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;

  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}h lalu`;

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function getContentLink(slug = "") {
  if (!slug) return null;

  const value = String(slug).replace(/^\/+|\/+$/g, "");
  const sources = ["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu", "meionovels"];
  const found = sources.find((source) => value.startsWith(`${source}-`));
  const legacyAdult = value.startsWith("doujindesu-");
  const source = found || (legacyAdult ? "sekte" : "komiku");
  const realSlug = found ? value.slice(found.length + 1) : legacyAdult ? value.slice("doujindesu-".length) : value;

  if (source === "meionovels") {
    return realSlug.includes("chapter")
      ? `/novel/chapter/${realSlug}`
      : `/novel/${realSlug}`;
  }

  return realSlug.includes("chapter")
    ? `/chapter/${source}/${realSlug}`
    : `/komik/${source}/${realSlug}`;
}

export function Avatar({ name = "", url = "", size = 36 }) {
  const initials = name?.slice(0, 2)?.toUpperCase() || "??";

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
