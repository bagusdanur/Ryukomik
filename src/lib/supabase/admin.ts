import { createClient } from "@supabase/supabase-js";
import { egressAuditEnabled, withEgressAudit } from "./egressAudit";
import { createResilientFetch } from "./fetchResilient";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "service-role-key";

if (!url || !serviceRole) {
  console.warn("[supabase-admin] Missing server Supabase environment variables.");
}

const client = createClient(url || fallbackUrl, serviceRole || fallbackKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // Cap every call at 15s and retry idempotent requests once on a fresh socket.
  // Without this a stale HTTP/2 keep-alive socket hangs for undici's 300s
  // headersTimeout, which surfaced as endless spinners (nginx 499/504).
  global: {
    fetch: createResilientFetch(),
  },
});

// Audit egress sementara (EGRESS_AUDIT=1): mengukur ukuran respons per
// tabel/RPC tanpa menambah satu pun query. Matikan dengan menghapus env.
export const supabaseAdmin = egressAuditEnabled()
  ? withEgressAudit(client)
  : client;
