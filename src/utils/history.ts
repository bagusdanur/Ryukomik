type ReadHistoryItem = {
  comicSlug: string;
  title: string;
  lastChapter: string;
  lastChapterSlug: string;
  date: string;
};

function readHistory(): ReadHistoryItem[] {
  try {
    const value = JSON.parse(localStorage.getItem("read_history") ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveHistory(chapterSlug: string): void {
  if (typeof window === "undefined") return;

  // contoh: solo-leveling-chapter-191
  const parts = chapterSlug.split("-chapter-");

  const comicSlug = parts[0];
  const chapter = parts[1] ? `Chapter ${parts[1]}` : "";

  const title = comicSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const date = new Date().toISOString();

  const newItem = {
    comicSlug,
    title,
    lastChapter: chapter,
    lastChapterSlug: chapterSlug,
    date,
  };

  let history = readHistory();

  // 🔥 HAPUS HISTORY KOMIK YANG SAMA
  history = history.filter((item) => item.comicSlug !== comicSlug);

  // 🔥 MASUKKAN KE PALING ATAS
  history.unshift(newItem);

  // 🔥 BATASI JUMLAH
  if (history.length > 100) history.pop();

  localStorage.setItem("read_history", JSON.stringify(history));
}
