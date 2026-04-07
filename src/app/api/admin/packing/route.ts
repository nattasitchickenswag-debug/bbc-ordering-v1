import { NextRequest, NextResponse } from "next/server";
import { getPackingReport } from "@/lib/local-db";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date") || undefined;
    const report = await getPackingReport(date);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
