import { NextResponse } from "next/server";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";
import { createDraftPreviewToken } from "@/lib/draftPreviewToken";
import { projectApiFetch } from "@/lib/projectApiServer";

type ProjectChapter = {
  id: string;
  is_published: boolean;
};

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json() as { chapterId?: string };
    if (!body.chapterId) {
      return NextResponse.json({ error: "ID chapter diperlukan." }, { status: 400 });
    }

    const result = await projectApiFetch<{ data: ProjectChapter }>(
      `/admin/chapters/${encodeURIComponent(body.chapterId)}`,
    );
    if (!result.data || result.data.is_published) {
      return NextResponse.json(
        { error: "Link preview hanya tersedia untuk chapter draft." },
        { status: 409 },
      );
    }

    const token = createDraftPreviewToken(result.data.id);
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    return NextResponse.json({
      url: `${origin}/preview/project/${encodeURIComponent(token)}`,
      expiresInDays: 7,
    });
  } catch (error) {
    return adminErrorResponse(error, "Gagal membuat link preview draft.");
  }
}
