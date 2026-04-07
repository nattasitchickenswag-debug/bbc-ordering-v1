import { NextRequest, NextResponse } from "next/server";
import { addBranch, deleteBranch, updateBranch } from "@/lib/local-db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  await addBranch({
    branchname: body.branchname,
    deliverydays: body.deliverydays
  });
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = await updateBranch({
    branchid: Number(body.branchid),
    branchname: body.branchname,
    deliverydays: body.deliverydays
  });
  if (!updated) return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchid = Number(searchParams.get("branchid"));
  const deleted = await deleteBranch(branchid);
  if (!deleted) {
    return NextResponse.json(
      { error: "Cannot delete branch. It may not exist or already has orders." },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
