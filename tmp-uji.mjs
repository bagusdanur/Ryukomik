
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^"|"$/g, "");
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const anon = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"), { auth: { persistSession: false } });

const base = "https://ryukomik.my.id";
const email = `uji-migrasi-${Date.now()}@example.com`;
const password = "UjiMigrasi!2026";

const out = [];
const log = (name, ok, detail) => { out.push({ name, ok, detail }); console.log((ok ? "PASS " : "FAIL ") + name + " :: " + detail); };

let userId = null;
try {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name: "Uji Migrasi" },
  });
  if (createErr) throw createErr;
  userId = created.user.id;
  console.log("created user", userId);

  const { data: session, error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  const token = session.session.access_token;
  const auth = { Authorization: `Bearer ${token}` };

  // 1. GET profil (belum ada baris lokal)
  let r = await fetch(base + "/api/me/profile", { headers: auth });
  let j = await r.json().catch(() => ({}));
  log("GET /api/me/profile", r.status === 200, `status=${r.status} missing=${j.missing} profile=${j.profile ? "ada" : "null"}`);

  // 2. PATCH username -> baris lokal dibuat
  r = await fetch(base + "/api/me/profile", { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ username: "uji-migrasi" }) });
  j = await r.json().catch(() => ({}));
  log("PATCH username", r.status === 200 && j.profile?.username === "uji-migrasi", `status=${r.status} username=${j.profile?.username} err=${j.error || ""}`);

  // 3. Username duplikat -> 409
  r = await fetch(base + "/api/me/profile", { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ username: "Batu Iron" }) });
  j = await r.json().catch(() => ({}));
  log("PATCH duplikat ditolak", r.status === 409, `status=${r.status} err=${j.error || ""}`);

  // 4. Privacy
  r = await fetch(base + "/api/me/profile", { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ show_public_reads: false }) });
  j = await r.json().catch(() => ({}));
  log("PATCH privacy", r.status === 200 && j.profile?.show_public_reads === false, `status=${r.status} show_public_reads=${j.profile?.show_public_reads}`);

  // 5. Border khusus admin ditolak untuk user biasa
  r = await fetch(base + "/api/me/profile", { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ avatar_border: "shop-113" }) });
  j = await r.json().catch(() => ({}));
  log("border admin-only ditolak", r.status === 403, `status=${r.status} err=${j.error || ""}`);

  // 6. XP baca + idempotensi
  r = await fetch(base + "/api/xp/read", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ chapter_slugs: ["uji-ch-1", "uji-ch-1", "uji-ch-2"] }) });
  j = await r.json().catch(() => ({}));
  log("POST /api/xp/read baru", r.status === 200 && j.recorded_count === 2 && j.xp_added === 10, `status=${r.status} recorded=${j.recorded_count} xp=${j.xp_added}`);

  r = await fetch(base + "/api/xp/read", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ chapter_slugs: ["uji-ch-1", "uji-ch-2"] }) });
  j = await r.json().catch(() => ({}));
  log("POST /api/xp/read ulang (dedupe)", r.status === 200 && j.recorded_count === 0, `status=${r.status} recorded=${j.recorded_count} xp=${j.xp_added}`);

  // 7. Profil memuat xp/level hasil tulis lokal
  r = await fetch(base + "/api/me/profile", { headers: auth });
  j = await r.json().catch(() => ({}));
  log("GET profil setelah XP", j.profile?.xp === 10 && j.profile?.level === 1, `xp=${j.profile?.xp} level=${j.profile?.level} total_reads=${j.profile?.total_reads}`);

  // 8. Sinyal versi
  r = await fetch(base + "/api/social/me/profile-version", { headers: auth });
  j = await r.json().catch(() => ({}));
  log("GET profile-version", r.status === 200, `status=${r.status} version=${j.version}`);
} catch (e) {
  log("exception", false, e instanceof Error ? e.message : String(e));
} finally {
  fs.writeFileSync("/tmp/uji-result.json", JSON.stringify({ userId, out }, null, 1));
  console.log("USERID=" + userId);
}
