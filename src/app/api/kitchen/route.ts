import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const MAIN_SHEET_ID = '1k7Lrn2hLjyJL6iL88qloi2PH690wAHBgB0KWaHrDbxU'; // ไฟล์หลัก (ที่เดิม)
const SETTINGS_SHEET_ID = '1mlZsUnfP3z5j7lYMqPL4qADx5QxC_vdyuItjcYGasZM'; // ไฟล์ลำดับใหม่
const PIN = '2569'; 

async function getGoogleAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function GET(request: Request) {
  const pin = request.headers.get('X-Kitchen-Pin');
  if (pin !== PIN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. ดึงข้อมูลออเดอร์จากไฟล์หลัก (รวมถึงคอลัมน์ F น้ำหนัก และ I หมวดหมู่)
    const mainRes = await sheets.spreadsheets.values.get({
      spreadsheetId: MAIN_SHEET_ID,
      range: 'สรุปยอดจัดส่งจริง!A2:I', 
    });

    // 2. ดึงลำดับจากไฟล์ใหม่ (User_Preference)
    const prefRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SETTINGS_SHEET_ID,
      range: 'Custom_Sort!A2:B',
    });

    const sortMap = Object.fromEntries(prefRes.data.values?.map(r => [r[0], parseFloat(r[1])]) || []);
    const allRows = mainRes.data.values || [];
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const todayStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;

    const formattedData = allRows
      .map((row, index) => ({
        rowNumber: index + 2,
        fullDate: String(row[0] || ''),
        branchName: row[1],
        productName: row[2],
        orderedQty: parseFloat(row[3]) || 0,
        actualSentQty: row[4] ? parseFloat(row[4]) : null,
        weight: row[5] || "", // คอลัมน์ F (Index 5) คือ น้ำหนัก
        displayOrder: sortMap[row[2]] || 999 
      }))
      .filter(item => item.fullDate.includes(todayStr) && item.productName)
      // เรียงลำดับตามตัวเลขในไฟล์ User_Preference
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const pin = request.headers.get('X-Kitchen-Pin');
  if (pin !== PIN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    if (body.action === 'addNew') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
      await sheets.spreadsheets.values.append({
        spreadsheetId: MAIN_SHEET_ID,
        range: 'สาขาสั่งของ!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[dateStr, 'ครัวกลาง (เพิ่มเอง)', body.productName, 0, body.actualSentQty]] },
      });
      return NextResponse.json({ message: 'เพิ่มรายการสำเร็จ' });

    } else {
      // บันทึกยอดส่งจริง (คอลัมน์ E)
      await sheets.spreadsheets.values.update({
        spreadsheetId: MAIN_SHEET_ID,
        range: `สรุปยอดจัดส่งจริง!E${body.rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[body.actualSentQty]] },
      });

      // ถ้ามีการส่งค่าน้ำหนักมาด้วย (คอลัมน์ F)
      if (body.weight !== undefined) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: MAIN_SHEET_ID,
          range: `สรุปยอดจัดส่งจริง!F${body.rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[body.weight]] },
        });
      }
      return NextResponse.json({ message: 'บันทึกสำเร็จ' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}