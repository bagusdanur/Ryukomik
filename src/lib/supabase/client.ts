import { createClient } from "@supabase/supabase-js";

import { clientEgressAuditEnabled, withClientEgressAudit } from "./clientAudit";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "public-anon-key";

if (!url || !anon) {
  console.warn("[supabase] Missing public Supabase environment variables.");
}

const client = createClient(url || fallbackUrl, anon || fallbackKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Audit egress sementara (NEXT_PUBLIC_EGRESS_AUDIT=1): mengukur trafik anon
// dari browser, yang tidak terlihat oleh instrumen server.
export const supabase = clientEgressAuditEnabled() ? withClientEgressAudit(client) : client;
