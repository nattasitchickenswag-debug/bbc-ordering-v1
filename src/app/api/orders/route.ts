import { NextRequest, NextResponse } from "next/server";
import { insertOrders } from "@/lib/local-db";

type InputItem = {
  productid: number;
  quantity: number;
  customname?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      branchid: number;
      branchname?: string;
      items: InputItem[];
    };

    if (!body?.branchid || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const branchname = (body.branchname || "").trim();
    if (!branchname) {
      return NextResponse.json({ error: "branchname is required." }, { status: 400 });
    }

    const normalized = body.items
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => {
        const productid = Number(item.productid);
        const quantity = Number(item.quantity);
        if (productid === 0) {
          const customname = (item.customname || "").trim();
          if (!customname) {
            return null;
          }
          return { productid: 0, quantity, customname };
        }
        return { productid, quantity };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No valid items to save." }, { status: 400 });
    }

    // Insert-only behavior keeps every submission as new order rows.
    const inserted = await insertOrders(Number(body.branchid), branchname, normalized);
    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
