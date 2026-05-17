import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = '1k7Lrn2hLjyJL6iL88qloi2PH690wAHBgB0KWaHrDbxU';
const SHEET_NAME = 'สินค้า';

export async function GET() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  // Read first 3 rows to understand structure
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:Z`,
  });

  return NextResponse.json({ rows: readRes.data.values });
}

export async function POST() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  // Read header row to understand columns
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:Z1`,
  });
  const headers = headerRes.data.values?.[0] ?? [];

  return NextResponse.json({ headers, message: 'Read headers. Call with ?confirm=true to append rows.' });
}
