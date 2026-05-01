import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const MAIN_SHEET_ID = '1k7Lrn2hLjyJL6iL88qloi2PH690wAHBgB0KWaHrDbxU'; // ไฟล์หลัก (ที่เดิม)
const SETTINGS_SHEET_ID = '1mlZsUnfP3z5j7lYMqPL4qADx5QxC_vdyuItjcYGasZM'; // ไฟล์ลำดับใหม่
const PIN = '2569'; 

const CREDENTIALS = {
  client_email: "kitchen-dashboard@speedy-toolbox-494111-t1.iam.gserviceaccount.com",
  // ใช้ Key เดิมของพี่ (ใส่กลับมาให้แล้ว)
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCRPuaRccLpb9kE7fOGVn6NpC6W0spjOQDqBH2NdknazUNQHolGfmhDRTVRmeKrlLO2bsJTmt+2ln0/z4bR2SPUKXbfIQjlWe54dh2494y2cc+WqJEaemJbSjoV5BDkgszcSPM3E0W8GhIValRNvV5QHBEdx4DMV+zT53xYA9+zCyVAyFyMFGELBPG8dJoBcKIWT658xF9MQWevAoiiF8cjyI9OP2JI7V09QMOWoGJyYexScOgoWfhmaXA+ipQP2+kL2CWRUO5/WrblxePqr9YUnYxQ83vR9+ebFyk82UoXx5UHb2wGQV9CKjI1Ogrc17rm11R2cdFVhBQQ4Mu51H4nAgMBAAECggEAAgezCU1hwAmEKwF4aeRDmI8253zCv2hIjvzJFHUWyywbSL9kg8u4gVgySpWwCV3mtSIPLUP45IBt97pa1AwI6Co8MxovGaWMI7ri53buTI6CrERm4svbHBOJhEzPv6HkYx/R5m8qhlqG7i2yR/PhoZUC2Du1nSWNddjCcCh9s+7qjnC/zSHtwTgF5SAyQVkr5SuIbC3ifgUs44HJBuFek3fH/OooSYADAVKgFObaI4bi1wRtQGPMgxKDyLFbzdQ5wXO8HIKKsqP1HYfULNDpj46lHIE3VrrTKDaW0Ce7wpR17KwFSppZiN0FcKaxAdp+MlKEZGvgoL2LIqXM9y+T4QKBgQDBiH8Na3j/Cgq9EDqxPLs921408lkFLh6DVI6e4FOp/hBNsxfwet8U5+y0mNYW6VcCW3xgQhxa2KQsqeg9HLYMFfmpq3xcoWv9/tcy2zuK9IHEiJXjWbvAOT6KzjcAK0imD8c7zAC0rgAGn3bYrbX/qLj2KgQ9L5pxRxUqKb8zQwKBgQDAIHILhvh61gAK/T+r+ErX1n3itEE+Mln5Zx7Nn48qVANO05FPPuFs2ec6uMc1oVmfpqvKvtILbIFkOKWN9EHtQpaATQ3N50BlwuVFj7WV5M1XHK0Cr4aGrEH5VVQPJXJ+3EieKrPFoN2CUGprC3+fETP3v38sAqaYrHflerDxTQKBgCpCCav+eY8GvE2IC6jDoAbjrXBWMoXlChiXEAU06k/F//1XS7Tgv3ErKw5MCQM7tBn5q/DAvrw/bamq9+DQMhf1fGxF24PGY3Q0fvzFzfyLYwJs6H2aDFrupO9eE7hfux83dsNhyg2pqKvJigPJ+mF2j9yAVCigClMNuFtafjtNAoGAQvgMSLBXVJnbkfkMhKkbjXiakLc8Nq3eZuzm8822XY7DSGq+r9y/Pu4Fh5Z4+dywHNI/93/kP08nGwQT0RNfF5CqXTZ+pVMCQ3ZX7JNXPFRwrviz5cfBIJhSttJjZpQrAMVQGrHP0AdursnRDlcHuS6J6sW5UmHqKDWV5UuK+dECgYEAkMkep7gJCEuk2jMb6bzJ6TQN9mkFHp6S6HblditR4TBsKjNv8SDwutUQXkpM9ASDNCmhaMmcPQd7r0RK4RKwcJ+VZAd5mfFlemjrRXnlPT7Dr9ynSmECGAhCj/CSGw8Z2ARv4QkotKWt9oPRuWdVqOeH1KXMyla4aKaLmljiwhg=\n-----END PRIVATE KEY-----\n",
};

async function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    credentials: { client_email: CREDENTIALS.client_email, private_key: CREDENTIALS.private_key.replace(/\\n/g, '\n') },
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
    const now = new Date();
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
      const now = new Date();
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