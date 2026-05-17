import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = '1k7Lrn2hLjyJL6iL88qloi2PH690wAHBgB0KWaHrDbxU';

export async function GET() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  // List all sheet names first
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetNames = meta.data.sheets?.map(s => ({ title: s.properties?.title, index: s.properties?.index }));

  // Read สาขาสั่งของ (index 2) - last 200 rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'สาขาสั่งของ!A1:E',
  });

  const rows = res.data.values ?? [];
  // Filter แจ้งวัฒนะ rows with qty > 100
  const suspicious = rows.filter(r =>
    r[1]?.includes('แจ้งวัฒนะ') &&
    !isNaN(Number(r[3])) &&
    Number(r[3]) > 100 &&
    r[4] !== 'remark'
  );

  // Also get all แจ้งวัฒนะ rows for context
  const jaewat = rows.filter(r => r[1]?.includes('แจ้งวัฒนะ') && r[4] !== 'remark').slice(-50);

  return NextResponse.json({ sheetNames, suspicious, jaewat_recent: jaewat });
}
