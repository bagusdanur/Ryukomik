import { requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { getProfileSignal } from "@/lib/social/profileSignals";
import { authErrorResponse } from "@/lib/social/authResponse";

/**
 * Versi sinyal profil milik user yang sedang login. Klien mem-poll ini tiap
 * 60 detik (tab aktif saja) untuk tahu kapan harus refresh profilnya sendiri
 * setelah admin memberi premium/role — nol query Supabase.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const version = await getProfileSignal(userId);
    return socialJson({ version }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return socialError(error);
  }
}
