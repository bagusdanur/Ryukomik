import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verifyAdminRequest } from "@/lib/adminApi";
import {
  getTitleRushEventStatus,
  setTitleRushEventStatus,
  TITLE_RUSH_EVENT_STATUS_TAG,
} from "@/lib/titleRushEvent";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const status = await getTitleRushEventStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled === true;
    const status = await setTitleRushEventStatus(enabled);
    revalidateTag(TITLE_RUSH_EVENT_STATUS_TAG, { expire: 0 });

    return NextResponse.json({
      ...status,
      message: enabled ? "Event Title Rush dibuka." : "Event Title Rush ditutup.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal update status event." },
      { status: 500 },
    );
  }
}
