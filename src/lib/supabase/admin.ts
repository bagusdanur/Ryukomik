import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "service-role-key";

if (!url || !serviceRole) {
  console.warn("[supabase-admin] Missing server Supabase environment variables.");
}

export const supabaseAdmin = createClient(url || fallbackUrl, serviceRole || fallbackKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
