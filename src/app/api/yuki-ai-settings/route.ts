import { NextResponse } from "next/server";
import { getYukiAiSettings } from "@/lib/yukiAiSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getYukiAiSettings();
    return new NextResponse(JSON.stringify({ enabled: settings.enabled }), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ enabled: true }), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Content-Type": "application/json",
      },
    });
  }
}
