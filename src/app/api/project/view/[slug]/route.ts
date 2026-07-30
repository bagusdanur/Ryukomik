import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VISITOR_ID_PATTERN = /^[a-f0-9-]{36}$/i;

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await props.params;
    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
    }

    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) {
      return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const visitorId = typeof payload?.visitorId === "string" ? payload.visitorId : "";
    if (!VISITOR_ID_PATTERN.test(visitorId)) {
      return NextResponse.json({ error: "Visitor tidak valid" }, { status: 400 });
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Analytics belum dikonfigurasi" }, { status: 503 });
    }

    const visitorHash = createHmac("sha256", secret).update(visitorId).digest("hex");
    const { error } = await supabaseAdmin.rpc("record_project_view", {
      p_manga_slug: slug,
      p_visitor_hash: visitorHash,
    });
    if (error) throw error;

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Analytics must never interrupt the reader experience.
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
}
