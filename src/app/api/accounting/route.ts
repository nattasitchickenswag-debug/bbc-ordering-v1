import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const GP_RATES = {
  cash: 0,
  line_man: 0.27,
  grab: 0.30,
  central: 0.30,
  other: 0,
} as const;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_date DATE NOT NULL,
      branch_name TEXT NOT NULL,
      cash FLOAT NOT NULL DEFAULT 0,
      line_man FLOAT NOT NULL DEFAULT 0,
      grab FLOAT NOT NULL DEFAULT 0,
      central FLOAT NOT NULL DEFAULT 0,
      other FLOAT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const body = await request.json();
    const { entry_date, branch_name, cash, line_man, grab, central, other } = body;

    if (!entry_date || !branch_name) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    await sql`
      INSERT INTO accounting_entries (entry_date, branch_name, cash, line_man, grab, central, other)
      VALUES (
        ${entry_date}::date,
        ${branch_name},
        ${cash ?? 0},
        ${line_man ?? 0},
        ${grab ?? 0},
        ${central ?? 0},
        ${other ?? 0}
      )
    `;

    return NextResponse.json({ message: 'บันทึกสำเร็จ' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const branch = searchParams.get('branch');

    let rows;
    if (from && to && branch) {
      ({ rows } = await sql`
        SELECT * FROM accounting_entries
        WHERE entry_date BETWEEN ${from}::date AND ${to}::date
          AND branch_name = ${branch}
        ORDER BY entry_date DESC
      `);
    } else if (from && to) {
      ({ rows } = await sql`
        SELECT * FROM accounting_entries
        WHERE entry_date BETWEEN ${from}::date AND ${to}::date
        ORDER BY entry_date DESC, branch_name
      `);
    } else {
      ({ rows } = await sql`
        SELECT * FROM accounting_entries
        ORDER BY entry_date DESC, branch_name
        LIMIT 200
      `);
    }

    return NextResponse.json({ rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
