import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SALES_SHEET_ID = '1moayMz6sqvMYISukQ8SCtLVz7NRAUcLCAIu7bL2OAdg';

// Map STAFF_MAP branch names → sheet branch names (consistent with historical data)
const BRANCH_NAME_MAP: Record<string, string> = {
  'ชิดลม(ไก่)':         'สาขาชิดลม',
  'เซ็นทรัลเวิลด์(หมู)': 'สาขาเซ็นทรัลเวิลด์หมู',
  'นครปฐม(ไก่)':        'สาขานครปฐม',
  'เกตย์เวย์(ไก่)':     'สาขาเกตเวย์',
  'ลาดพร้าว(หมู)':      'สาขาลาดพร้าวหมู',
  'ลาดพร้าว(ไก่)':      'สาขาลาดพร้าวไก่',
  'แจ้งวัฒนะ(ไก่)':    'สาขาแจ้งวัฒนะ',
};

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { branchName, saleDate, revenue, kai_ton, nong_sa_pok, pork_leg, kaki, yi_chak } = body;

    if (!branchName || !saleDate || revenue === undefined) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const sheetBranch = BRANCH_NAME_MAP[branchName] ?? branchName;
    const submittedAt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const submittedAtStr = `${submittedAt.getDate()}/${submittedAt.getMonth() + 1}/${submittedAt.getFullYear() + 543} ${String(submittedAt.getHours()).padStart(2,'0')}:${String(submittedAt.getMinutes()).padStart(2,'0')}`;

    const row = [
      sheetBranch,
      revenue,
      kai_ton ?? 0,
      nong_sa_pok ?? 0,
      pork_leg ?? 0,
      kaki ?? 0,
      yi_chak ?? 0,
      submittedAtStr,
      saleDate,  // col I — วันที่ขาย (แยกจาก timestamp)
    ];

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SALES_SHEET_ID,
      range: '2026!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    return NextResponse.json({ message: 'บันทึกยอดขายสำเร็จ' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
