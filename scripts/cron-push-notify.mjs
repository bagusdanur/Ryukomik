import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Konfigurasi Environment Variables (Pastikan diset di PM2/Server)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.web.id";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("❌ Environment variables belum lengkap!");
  process.exit(1);
}

// Inisialisasi Supabase dengan Service Key (untuk bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Setup Web Push
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const SOURCES = ["komiku", "kiryuu", "sekte", "doujindesu"];

async function runCron() {
  console.log(`[${new Date().toISOString()}] 🚀 Memulai pengecekan chapter terbaru...`);

  let notifSentCount = 0;

  for (const source of SOURCES) {
    try {
      const API_URL = `https://api.ryukomik.web.id/${source}/pustaka`;
      console.log(`\n🔍 Mengecek source: ${source}`);

      // 1. Fetch API
      const res = await fetch(API_URL);
      if (!res.ok) {
        console.error(`⚠️ HTTP Error di ${source}: ${res.status}`);
        continue;
      }
      const json = await res.json();
      
      // Support berbagai format response
      const list = Array.isArray(json) 
        ? json 
        : (Array.isArray(json.data) ? json.data : Object.values(json).find((v) => Array.isArray(v)) || []);

      if (list.length === 0) {
        console.log(`ℹ️ Tidak ada data dari API ${source}.`);
        continue;
      }

      const isNSFW = source === "sekte" || source === "doujindesu";

      // 2. Loop setiap item
      for (const item of list) {
        if (!item.link || !item.chapter_terbaru) continue;

        // Extract slug
        let slug = item.slug || item.link;
        if (slug.includes(".org/manga/")) slug = slug.split(".org/manga/")[1];
        if (slug.includes("/komiku/")) slug = slug.split("/komiku/")[1];
        if (slug.includes("/kiryuu/")) slug = slug.split("/kiryuu/")[1];
        if (slug.includes("/sekte/")) slug = slug.split("/sekte/")[1];
        slug = slug.replace(/\/$/, ""); // Hapus trailing slash
        
        const chapter = item.chapter_terbaru;
        const title = item.title || "Chapter Baru";
        
        console.log(`Cek: [${source}] ${title} (${slug}) - ${chapter}`);
        // Jika 18+, kita tidak mengirimkan cover image ke notifikasi agar aman dilihat di publik
        const image = isNSFW ? undefined : item.image;

        // Cek apakah chapter ini sudah dinotifikasi sebelumnya
        const { data: alreadyNotified } = await supabase
          .from("notified_chapters")
          .select("id")
          .eq("comic_slug", slug)
          .eq("chapter", chapter)
          .single();

        if (alreadyNotified) {
          continue; // Skip, sudah dikirim
        }

        // 3. Query siapa saja yang bookmark komik ini
        const { data: bookmarks } = await supabase
          .from("bookmark_sync")
          .select("user_id")
          .eq("comic_slug", slug);

        if (!bookmarks || bookmarks.length === 0) {
          // Tandai sebagai notified meskipun tidak ada yang bookmark (biar tidak dicek berulang)
          await supabase.from("notified_chapters").insert({ comic_slug: slug, chapter });
          continue;
        }

        const userIds = bookmarks.map((b) => b.user_id);

        // 4. Ambil subscription untuk user-user tersebut
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, user_id")
          .in("user_id", userIds);

        if (!subscriptions || subscriptions.length === 0) {
          // Tandai sebagai notified
          await supabase.from("notified_chapters").insert({ comic_slug: slug, chapter });
          continue;
        }

        // 5. Kirim Push Notification
        const pushUrl = `/komik/${source}/${slug}`;
        const bodyText = isNSFW 
          ? `${chapter} (18+) sudah rilis! Yuk baca sekarang.`
          : `${chapter} sudah rilis! Yuk baca sekarang.`;

        const payload = JSON.stringify({
          title: title,
          body: bodyText,
          url: pushUrl,
          tag: slug,
          image: image,
        });

        console.log(`📤 Mengirim notif [${slug} - ${chapter}] ke ${subscriptions.length} device via ${pushUrl}`);

        const sendPromises = subscriptions.map(async (sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          try {
            await webPush.sendNotification(pushSubscription, payload);
            notifSentCount++;
          } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              console.error("Gagal kirim ke endpoint:", error);
            }
          }
        });

        await Promise.all(sendPromises);

        // 6. Tandai sebagai selesai (Anti duplikat)
        await supabase.from("notified_chapters").insert({ comic_slug: slug, chapter });
      }
    } catch (err) {
      console.error(`❌ Terjadi kesalahan pada source ${source}:`, err);
    }
  }

  console.log(`\n[${new Date().toISOString()}] ✅ Selesai! Total push notif terkirim: ${notifSentCount}`);
}

// Jalankan
runCron();
