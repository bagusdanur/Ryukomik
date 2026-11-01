import { NextResponse } from "next/server";
import { projectApiFetch } from "@/lib/projectApiServer";
import { adultContentHidden } from "@/lib/adultPrefServer";
import { isAdultProject } from "@/lib/adultGenres";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const result = (await projectApiFetch(`/projects?page=${page}&limit=${limit}`)) as {
      data?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };

    if (Array.isArray(result?.data) && (await adultContentHidden())) {
      result.data = result.data.filter((item) => !isAdultProject(item as never));
    }

    const response = NextResponse.json(result);
    response.headers.set("Vary", "Cookie");
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300",
    );
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
