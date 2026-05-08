import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { google } from 'googleapis';

const SALES_SHEET_ID = '1moayMz6sqvMYISukQ8SCtLVz7NRAUcLCAIu7bL2OAdg';
const SHEET_NAME = 'รายรับ';

const GP_RATES = {
  cash: 0,
  line_man: 0.27,
  grab: 0.30,
  central: 0.30,
  other: 0,
} as const;

const HEADERS = ['วันที่', 'สาขา', 'เงินสด', 'LINE MAN', 'Grab', 'เซ็นทรัล', 'อื่นๆ', 'ยอดรวม', 'GP หัก', 'รับสุทธิ', 'timestamp'];

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function ensureSheet(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SALES_SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SALES_SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SALES_SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

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

    const c    = cash    ?? 0;
    const lm   = line_man ?? 0;
    const gr   = grab    ?? 0;
    const ct   = central ?? 0;
    const ot   = other   ?? 0;

    const total = c + lm + gr + ct + ot;
    const gp    = lm * GP_RATES.line_man + gr * GP_RATES.grab + ct * GP_RATES.central;
    const net   = total - gp;

    // Write to Postgres
    await sql`
      INSERT INTO accounting_entries (entry_date, branch_name, cash, line_man, grab, central, other)
      VALUES (${entry_date}::date, ${branch_name}, ${c}, ${lm}, ${gr}, ${ct}, ${ot})
    `;

    // Write to Google Sheet
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const ts  = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureSheet(sheets);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SALES_SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[entry_date, branch_name, c, lm, gr, ct, ot, total, gp, net, ts]] },
    });

    return NextResponse.json({ message: 'บันทึกสำเร็จ' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const from   = searchParams.get('from');
    const to     = searchParams.get('to');
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
