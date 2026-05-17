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

  const newRows = [
    ['C0008', 'พริกไทยขาวป่น', 'ขวด', '3.เครื่องปรุง/ซอส'],
    ['C0009', 'น้ำจิ้มไก่ทอด', 'แกลลอน', '3.เครื่องปรุง/ซอส'],
    ['E0012', 'ถุงร้อน 5x8', 'แพ็ค', '7.บรรจุภัณฑ์'],
    ['E0032', 'ช้อนส้อม', 'แพ็ค', '8.วัสดุสิ้นเปลือง'],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:D`,
    valueInputOption: 'RAW',
    requestBody: { values: newRows },
  });

  return NextResponse.json({ success: true, added: newRows });
}
