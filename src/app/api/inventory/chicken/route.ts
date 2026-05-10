import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS chicken_bills (
      id           SERIAL PRIMARY KEY,
      bill_date    DATE NOT NULL,
      ton_count    INTEGER       DEFAULT 0,
      ton_weight   NUMERIC(8,2)  DEFAULT 0,
      ton_price    NUMERIC(8,2)  DEFAULT 0,
      ton_total    NUMERIC(10,2) DEFAULT 0,
      nsot_weight  NUMERIC(8,2)  DEFAULT 0,
      nsot_price   NUMERIC(8,2)  DEFAULT 0,
      nsot_total   NUMERIC(10,2) DEFAULT 0,
      nom_weight   NUMERIC(8,2)  DEFAULT 0,
      nom_price    NUMERIC(8,2)  DEFAULT 0,
      nom_total    NUMERIC(10,2) DEFAULT 0,
      kha_weight   NUMERIC(8,2)  DEFAULT 0,
      kha_price    NUMERIC(8,2)  DEFAULT 0,
      kha_total    NUMERIC(10,2) DEFAULT 0,
      blood_count  INTEGER       DEFAULT 0,
      blood_price  NUMERIC(8,2)  DEFAULT 0,
      blood_total  NUMERIC(10,2) DEFAULT 0,
      grand_total  NUMERIC(10,2) DEFAULT 0,
      note         TEXT,
      created_at   TIMESTAMPTZ   DEFAULT NOW()
    )
  `;
  // เพิ่ม column ขาไก่ ถ้ายังไม่มี (สำหรับ table เก่า)
  await sql`ALTER TABLE chicken_bills ADD COLUMN IF NOT EXISTS kha_weight  NUMERIC(8,2)  DEFAULT 0`;
  await sql`ALTER TABLE chicken_bills ADD COLUMN IF NOT EXISTS kha_price   NUMERIC(8,2)  DEFAULT 0`;
  await sql`ALTER TABLE chicken_bills ADD COLUMN IF NOT EXISTS kha_total   NUMERIC(10,2) DEFAULT 0`;
}

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await sql`
      SELECT * FROM chicken_bills
      ORDER BY bill_date DESC, created_at DESC
      LIMIT 10
    `;
    return NextResponse.json({ bills: rows });
  } catch (err) {
    console.error("GET /api/inventory/chicken:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const b = await req.json();

    await sql`
      INSERT INTO chicken_bills (
        bill_date,
        ton_count,  ton_weight,  ton_price,  ton_total,
        nsot_weight, nsot_price, nsot_total,
        nom_weight,  nom_price,  nom_total,
        kha_weight,  kha_price,  kha_total,
        blood_count, blood_price, blood_total,
        grand_total, note
      ) VALUES (
        ${b.bill_date},
        ${b.ton_count  ?? 0}, ${b.ton_weight  ?? 0}, ${b.ton_price  ?? 0}, ${b.ton_total  ?? 0},
        ${b.nsot_weight ?? 0}, ${b.nsot_price ?? 0}, ${b.nsot_total ?? 0},
        ${b.nom_weight  ?? 0}, ${b.nom_price  ?? 0}, ${b.nom_total  ?? 0},
        ${b.kha_weight  ?? 0}, ${b.kha_price  ?? 0}, ${b.kha_total  ?? 0},
        ${b.blood_count ?? 0}, ${b.blood_price ?? 0}, ${b.blood_total ?? 0},
        ${b.grand_total ?? 0}, ${b.note ?? null}
      )
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/inventory/chicken:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
