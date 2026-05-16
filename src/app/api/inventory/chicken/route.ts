import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS chicken_weigh_sessions (
      id             SERIAL PRIMARY KEY,
      weigh_date     DATE NOT NULL UNIQUE,
      bags           JSONB NOT NULL DEFAULT '[]',
      total_chicken  NUMERIC(8,2) DEFAULT 0,
      total_offal    NUMERIC(8,2) DEFAULT 0,
      bag_count      INTEGER DEFAULT 0,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(req: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (date) {
      const { rows } = await sql`
        SELECT * FROM chicken_weigh_sessions WHERE weigh_date = ${date}
      `;
      return NextResponse.json({ session: rows[0] || null });
    }

    const { rows } = await sql`
      SELECT * FROM chicken_weigh_sessions
      ORDER BY weigh_date DESC LIMIT 10
    `;
    return NextResponse.json({ sessions: rows });
  } catch (err) {
    console.error("GET /api/inventory/chicken:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const b = await req.json();
    const { weigh_date, bags, total_chicken, total_offal, bag_count } = b;

    await sql`
      INSERT INTO chicken_weigh_sessions (weigh_date, bags, total_chicken, total_offal, bag_count, updated_at)
      VALUES (${weigh_date}, ${JSON.stringify(bags)}, ${total_chicken}, ${total_offal}, ${bag_count}, NOW())
      ON CONFLICT (weigh_date) DO UPDATE SET
        bags          = chicken_weigh_sessions.bags || EXCLUDED.bags,
        total_chicken = chicken_weigh_sessions.total_chicken + EXCLUDED.total_chicken,
        total_offal   = chicken_weigh_sessions.total_offal   + EXCLUDED.total_offal,
        bag_count     = chicken_weigh_sessions.bag_count     + EXCLUDED.bag_count,
        updated_at    = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/inventory/chicken:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
