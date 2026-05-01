import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1k7Lrn2hLjyJL6iL88qloi2PH690wAHBgB0KWaHrDbxU';
const SHEET_RANGE = 'สาขาสั่งของ!A2:E';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get('branch');

  if (!branch) {
    return NextResponse.json({ error: 'branch parameter required' }, { status: 400 });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = response.data.values ?? [];

    // Filter rows matching this branch (Column B, index 1)
    const branchRows = rows.filter(row => row[1] === branch);

    // Group by timestamp (Column A, index 0)
    // n8n writes two types of rows for each order:
    //   - Product row:  col[2]=product name, col[3]=qty, col[4]=SKU code
    //   - Remark row:   col[2]=remark text,  col[3]="1", col[4]="remark"
    const orderMap = new Map<string, { items: { name: string; qty: string }[]; remark: string }>();

    for (const row of branchRows) {
      const timestamp = row[0] ?? '';
      const colC = row[2] ?? '';
      const colD = row[3] ?? '';
      const colE = row[4] ?? '';

      if (!orderMap.has(timestamp)) {
        orderMap.set(timestamp, { items: [], remark: '' });
      }
      const order = orderMap.get(timestamp)!;

      if (colE === 'remark') {
        order.remark = colC;
      } else if (colC) {
        order.items.push({ name: colC, qty: colD });
      }
    }

    // Take last 10 orders, most recent first
    const orders = Array.from(orderMap.entries())
      .map(([timestamp, data]) => ({ timestamp, ...data }))
      .slice(-10)
      .reverse();

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[history] error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
