import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/serverRoleCache";
import { projectApiFetch } from "@/lib/projectApiServer";

function bearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

async function authenticatedUser(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("Login diperlukan.");
  return getVerifiedUserId(token);
}

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const [{ slug }, userId] = await Promise.all([props.params, authenticatedUser(request)]);
    const data = await projectApiFetch<{ selected_reaction: string | null; upvote_count: number; reaction_counts: Record<string, number> }>(
      `/projects/${encodeURIComponent(slug)}/upvote?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" },
    );
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil upvote.";
    return NextResponse.json({ error: message }, { status: message.includes("Login") || message.includes("Sesi") ? 401 : 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const [{ slug }, userId] = await Promise.all([props.params, authenticatedUser(request)]);
    const body = await request.json().catch(() => ({}));
    const data = await projectApiFetch<{ selected_reaction: string | null; upvote_count: number; reaction_counts: Record<string, number> }>(
      `/projects/${encodeURIComponent(slug)}/upvote`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, reactionType: body.reactionType }) },
    );
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan upvote.";
    return NextResponse.json({ error: message }, { status: message.includes("Login") || message.includes("Sesi") ? 401 : 500 });
  }
}
