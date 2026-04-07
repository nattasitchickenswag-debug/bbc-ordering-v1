import { NextRequest, NextResponse } from "next/server";
import { addProduct, deleteProduct, updateProduct } from "@/lib/local-db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  await addProduct({
    productcode: String(body.productcode ?? "").trim(),
    productname: body.productname,
    unit: body.unit,
    costprice: Number(body.costprice),
    category: body.category
  });
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = await updateProduct({
    productid: Number(body.productid),
    productcode: String(body.productcode ?? "").trim(),
    productname: body.productname,
    unit: body.unit,
    costprice: Number(body.costprice),
    category: body.category
  });
  if (!updated) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productid = Number(searchParams.get("productid"));
  const deleted = await deleteProduct(productid);
  if (!deleted) {
    return NextResponse.json(
      { error: "Cannot delete product. It may not exist or already has orders." },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
