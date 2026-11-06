import { NextResponse } from "next/server";

import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Direktori publik grup Scanlator: nama, handle, avatar, jumlah project, update terakhir. */
export async function GET() {
  try {
    const [groups, projects] = await Promise.all([
      socialQuery<{
        handle: string; team_name: string; bio: string | null; avatar_url: string | null;
        owner_avatar_url: string | null; status: string; verified: boolean; created_at: string;
      }>(
        `select s.handle, s.team_name, s.bio, s.avatar_url,
                p.avatar_url as owner_avatar_url, s.status, s.verified, s.created_at
           from scanlator_profiles s
           left join social_profiles p on p.user_id = s.user_id
          where s.status <> 'revoked'
          order by s.team_name asc`,
      ),
      projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/projects?limit=100&page=1").catch(() => ({ data: [] })),
    ]);

    const byHandle = new Map<string, { count: number; latest: string | null }>();
    for (const raw of projects.data || []) {
      const m = raw as Record<string, unknown>;
      const handle = String(m.scanlator_handle || "").toLowerCase();
      if (!handle) continue;
      const updated = String(m.latest_chapter_uploaded_at || m.updated_at || "");
      const current = byHandle.get(handle) || { count: 0, latest: null };
      current.count += 1;
      if (updated && (!current.latest || Date.parse(updated) > Date.parse(current.latest))) current.latest = updated;
      byHandle.set(handle, current);
    }

    const data = groups.rows
      .map((g) => {
        const meta = byHandle.get(g.handle.toLowerCase());
        return {
          handle: g.handle,
          team_name: g.team_name,
          bio: g.bio,
          avatar_url: g.avatar_url || g.owner_avatar_url || null,
          status: g.status,
          verified: g.verified,
          projects: meta?.count || 0,
          latest_update: meta?.latest || null,
        };
      })
      .sort((a, b) => b.projects - a.projects || a.team_name.localeCompare(b.team_name));

    return NextResponse.json({ success: true, groups: data }, { headers: { "Cache-Control": "public, max-age=120" } });
  } catch {
    return NextResponse.json({ success: true, groups: [] }, { headers: { "Cache-Control": "public, max-age=30" } });
  }
}
