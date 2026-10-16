import { NextResponse } from "next/server";

/**
 * /api/anime/thumb?u=<url> — proxy thumbnail anime.
 *
 * Poster anime berasal dari situs pihak ketiga (otakudesu dll) yang sering
 * diblokir di jaringan pengguna (ISP/Kominfo) atau menolak hotlink, sehingga
 * gambar tampak kosong. Proxy ini mengambil gambar dari sisi server kita lalu
 * meneruskannya dengan cache panjang di Cloudflare, jadi:
 *  - selalu tampil di perangkat mana pun,
 *  - sekali ambil, ribuan tampilan berikutnya dilayani cache (hemat bandwidth).
 *
 * Keamanan (anti-SSRF): hanya http/https, hostname tidak boleh IP privat /
 * localhost / alamat metadata, dan isi balasan wajib berupa gambar.
 *
 * Tidak menyentuh Supabase sama sekali.
 */

export const runtime = "nodejs";
export const revalidate = 604800;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — poster tidak pernah sebesar ini
const TIMEOUT_MS = 9000;

/** Blokir target internal (SSRF). */
function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 privat / loopback / link-local / metadata
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  // IPv6 loopback / link-local / unique-local
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("u");
  if (!raw) return new NextResponse("Parameter u wajib.", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("URL tidak valid.", { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse("Protokol tidak didukung.", { status: 400 });
  }
  if (isBlockedHost(target.hostname)) {
    return new NextResponse("Host diblokir.", { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        // Beberapa situs menolak permintaan tanpa UA/referer yang wajar.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        referer: `${target.protocol}//${target.hostname}/`,
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Gagal mengambil gambar.", { status: 502 });
    }

    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/")) {
      return new NextResponse("Bukan gambar.", { status: 415 });
    }

    const length = Number(upstream.headers.get("content-length") || "0");
    if (length > MAX_BYTES) {
      return new NextResponse("Gambar terlalu besar.", { status: 413 });
    }

    // Teruskan aliran apa adanya; cache lama di browser + Cloudflare.
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000, immutable",
      },
    });
  } catch {
    return new NextResponse("Gagal mengambil gambar.", { status: 502 });
  }
}
