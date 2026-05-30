import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "public-anon-key";

if (!url || !anon) {
  console.warn("[supabase] Missing public Supabase environment variables.");
}

export const supabase = createClient(url || fallbackUrl, anon || fallbackKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
