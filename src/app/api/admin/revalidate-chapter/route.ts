import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Login diperlukan.", status: 401 } as const;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: "Sesi login tidak valid.", status: 401 } as const;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Akses admin diperlukan.", status: 403 } as const;
  }

  return { userId: authData.user.id } as const;
}

function parseChapterInput(input: unknown) {
  if (typeof input !== "string") return null;

  const value = input.trim();
  if (!value) return null;

  const url = value.startsWith("http://") || value.startsWith("https://")
    ? new URL(value)
    : new URL(value.startsWith("/") ? value : `/${value}`, "https://www.ryukomik.my.id");

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "chapter" || !parts[1] || parts.length < 3) return null;

  const source = decodeURIComponent(parts[1]);
  const slug = parts.slice(2).map(decodeURIComponent).join("/");
  if (!source || !slug) return null;

  return {
    source,
    slug,
    path: `/chapter/${source}/${slug}`,
    tag: `chapter:${source}:${slug}`,
  };
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const chapter = parseChapterInput(body?.path || body?.url);
    if (!chapter) {
      return NextResponse.json(
        { error: "Masukkan URL/path chapter yang valid." },
        { status: 400 },
      );
    }

    revalidateTag(chapter.tag, { expire: 0 });
    revalidatePath(chapter.path, "page");

    return NextResponse.json({
      ok: true,
      message: "Cache chapter di-refresh.",
      path: chapter.path,
      tag: chapter.tag,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal refresh cache chapter." },
      { status: 500 },
    );
  }
}
