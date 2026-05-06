import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const REPORT_PIN = '10031303';
const SALES_SHEET_ID = '1moayMz6sqvMYISukQ8SCtLVz7NRAUcLCAIu7bL2OAdg';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function parseRowDate(row: string[]): Date | null {
  // Col I: saleDate "YYYY-MM-DD" Thai year (e.g. "2569-05-06")
  const colI = row[8];
  if (colI && /^\d{4}-\d{2}-\d{2}$/.test(colI)) {
    const [thaiYear, month, day] = colI.split('-').map(Number);
    return new Date(thaiYear - 543, month - 1, day);
  }
  // Col H fallback: timestamp "D/M/YYYY HH:MM" Thai year
  const colH = row[7];
  if (colH) {
    const [day, month, thaiYear] = colH.split(' ')[0].split('/').map(Number);
    if (day && month && thaiYear) return new Date(thaiYear - 543, month - 1, day);
  }
  return null;
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export async function GET(request: NextRequest) {
  const pin = request.headers.get('X-Report-Pin');
  if (pin !== REPORT_PIN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'daily';
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const selected = new Date(dateStr);
  selected.setHours(12, 0, 0, 0);

  let rangeStart: Date, rangeEnd: Date;
  if (period === 'daily') {
    rangeStart = new Date(selected); rangeStart.setHours(0, 0, 0, 0);
    rangeEnd   = new Date(selected); rangeEnd.setHours(23, 59, 59, 999);
  } else if (period === 'weekly') {
    rangeStart = startOfWeekMonday(selected);
    rangeEnd   = new Date(rangeStart); rangeEnd.setDate(rangeStart.getDate() + 6); rangeEnd.setHours(23, 59, 59, 999);
  } else {
    rangeStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
    rangeEnd   = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SALES_SHEET_ID,
    range: '2026!A:I',
  });

  const rows = (res.data.values || []).slice(1);
  const branchTotals: Record<string, number> = {};
  let total = 0;

  for (const row of rows) {
    const branch = row[0];
    const revenue = parseFloat(row[1]) || 0;
    if (!branch || !revenue) continue;
    const rowDate = parseRowDate(row);
    if (!rowDate || rowDate < rangeStart || rowDate > rangeEnd) continue;
    branchTotals[branch] = (branchTotals[branch] || 0) + revenue;
    total += revenue;
  }

  const branches = Object.entries(branchTotals)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({ total, branches, period, rangeStart: rangeStart.toISOString(), rangeEnd: rangeEnd.toISOString() });
}
