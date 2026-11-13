import "server-only";

type PremiumRequestNotification = {
  id: string;
  name: string;
  packageName: string | null;
  durationDays: number | null;
  amount: number | null;
  proofUrl: string;
};

function token(): string {
  return process.env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
}

function chatId(): string {
  return process.env.TELEGRAM_PREMIUM_CHAT_ID || "";
}

function formatRupiah(value: number | null): string {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function jakartaTime(date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ":");
}

function caption(item: PremiumRequestNotification): string {
  const paket = `${item.packageName || "-"}${item.durationDays ? ` (${item.durationDays} hari)` : ""}`;
  return [
    "🔔 Request Premium Baru!",
    "",
    `👤 Nama: ${item.name || "User"}`,
    `📋 Status: pending`,
    `🕐 Waktu: ${jakartaTime()}`,
    `📦 Paket: ${paket} · ${formatRupiah(item.amount)}`,
    "",
    "Segera cek dashboard admin untuk approve/reject.",
  ].join("\n");
}

/**
 * Kirim notifikasi bukti pembayaran premium ke Telegram admin.
 *
 * Dipanggil setelah baris premium_requests tersimpan. Semua error ditelan:
 * kegagalan notifikasi tidak boleh membuat pengajuan user ikut gagal.
 */
export async function notifyPremiumRequest(item: PremiumRequestNotification): Promise<void> {
  const botToken = token();
  const target = chatId();
  if (!botToken || !target) return;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "ACC", callback_data: `prem:approve:${item.id}` },
        { text: "Tolak", callback_data: `prem:reject:${item.id}` },
      ],
      [{ text: "Buka Dashboard Premium", url: "https://ryukomik.web.id/dashboard?page=requests" }],
    ],
  };

  const sendPhoto = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: target,
      photo: item.proofUrl,
      caption: caption(item),
      reply_markup: keyboard,
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (sendPhoto?.ok) return;

  // Foto gagal (URL bukan gambar / diblokir): tetap kirim teks + tautan bukti.
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: target,
      text: `${caption(item)}\n\nBukti: ${item.proofUrl}`,
      reply_markup: keyboard,
      disable_web_page_preview: false,
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
}
