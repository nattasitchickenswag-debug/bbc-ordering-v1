import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS chicken_purchase_bills (
      id           SERIAL PRIMARY KEY,
      bill_date    DATE NOT NULL UNIQUE,
      items        JSONB NOT NULL DEFAULT '[]',
      total_amount NUMERIC(10,2) DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(req: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      const { rows } = await sql`
        SELECT * FROM chicken_purchase_bills ORDER BY bill_date DESC LIMIT 10
      `;
      return NextResponse.json({ bills: rows });
    }

    const { rows: billRows } = await sql`
      SELECT * FROM chicken_purchase_bills WHERE bill_date = ${date}
    `;
    const { rows: weighRows } = await sql`
      SELECT * FROM chicken_weigh_sessions WHERE weigh_date = ${date}
    `;

    return NextResponse.json({
      bill: billRows[0] || null,
      weigh_session: weighRows[0] || null,
    });
  } catch (err) {
    console.error("GET /api/inventory/bill:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const { bill_date, items, total_amount } = await req.json();

    await sql`
      INSERT INTO chicken_purchase_bills (bill_date, items, total_amount, updated_at)
      VALUES (${bill_date}, ${JSON.stringify(items)}, ${total_amount}, NOW())
      ON CONFLICT (bill_date) DO UPDATE SET
        items        = EXCLUDED.items,
        total_amount = EXCLUDED.total_amount,
        updated_at   = NOW()
    `;

    const { rows } = await sql`
      SELECT * FROM chicken_weigh_sessions WHERE weigh_date = ${bill_date}
    `;

    return NextResponse.json({ ok: true, weigh_session: rows[0] || null });
  } catch (err) {
    console.error("POST /api/inventory/bill:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
