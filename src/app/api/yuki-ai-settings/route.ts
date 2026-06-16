import { NextResponse } from "next/server";
import { getYukiAiSettings } from "@/lib/yukiAiSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getYukiAiSettings();
    return NextResponse.json({ enabled: settings.enabled });
  } catch (error) {
    return NextResponse.json({ enabled: true }); // Fallback to true if server side error
  }
}
