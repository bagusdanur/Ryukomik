import { NextResponse } from "next/server";

/** Pesan seragam untuk akun yang diblokir. */
export const BANNED_MESSAGE = "Akun kamu diblokir. Hubungi admin lewat grup WhatsApp untuk membuka blokir.";

/**
 * Terjemahkan error dari requireUserId() menjadi respons HTTP yang benar.
 * Tanpa ini, BANNED jatuh ke catch generik dan user melihat 500
 * "Terjadi kesalahan" — terasa seperti bug, bukan blokir.
 */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "BANNED") {
    return NextResponse.json({ error: BANNED_MESSAGE, code: "BANNED" }, { status: 403 });
  }
  if (error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  }
  return null;
}
