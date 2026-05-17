import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = '1moayMz6sqvMYISukQ8SCtLVz7NRAUcLCAIu7bL2OAdg'; // บันทึกยอดขาย
const SUMMARY_SHEET = 'เกตเวย์ สรุปรายวัน';
const BILLS_SHEET = 'เกตเวย์ รายบิล';

async function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(sheets: any, title: string, headers: string[]) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some((s: any) => s.properties?.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${title}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, openTime, closeTime, openCash, bills } = body;

    const totalSales = bills.reduce((s: number, b: any) => s + b.total, 0);
    const cashSales = bills.filter((b: any) => b.payment === 'cash').reduce((s: number, b: any) => s + b.total, 0);
    const transferSales = bills.filter((b: any) => b.payment === 'transfer').reduce((s: number, b: any) => s + b.total, 0);
    const linemanSales = bills.filter((b: any) => b.payment === 'lineman').reduce((s: number, b: any) => s + b.total, 0);

    const sheets = await getSheets();

    // Ensure both sheets exist with headers
    await ensureSheetExists(sheets, SUMMARY_SHEET, [
      'วันที่', 'เวลาเปิด', 'เวลาปิด', 'เงินเปิดวัน', 'ยอดขายรวม', 'เงินสด', 'PromptPay', 'LINE MAN', 'จำนวนบิล'
    ]);
    await ensureSheetExists(sheets, BILLS_SHEET, [
      'วันที่', 'เวลา', 'ช่องทาง', 'ยอด', 'รับเงิน', 'เงินทอน', 'รายการ'
    ]);

    // Append summary row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SUMMARY_SHEET}!A:I`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[date, openTime, closeTime, openCash, totalSales, cashSales, transferSales, linemanSales, bills.length]]
      },
    });

    // Append bill rows
    if (bills.length > 0) {
      const billRows = bills.map((b: any) => {
        const items = b.cart.map((c: any) => `${c.name}×${c.qty}`).join(', ');
        const paymentLabel = b.payment === 'cash' ? 'เงินสด' : b.payment === 'transfer' ? 'PromptPay' : 'LINE MAN';
        return [date, b.time, paymentLabel, b.total, b.cashReceived ?? '', b.change ?? '', items];
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${BILLS_SHEET}!A:G`,
        valueInputOption: 'RAW',
        requestBody: { values: billRows },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('gateway-pos close-day error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
