import { NextRequest, NextResponse } from "next/server";
import { getSummaryRows } from "@/lib/local-db";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const rows = await getSummaryRows(date || undefined);
  return NextResponse.json({ rows });
}
