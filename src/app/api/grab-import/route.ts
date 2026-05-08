import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Grab PDF branch name → BBC system branch name
const BRANCH_MAPPING: { keyword: string; bbc: string }[] = [
  { keyword: 'เซ็นทรัลลาดพร้าว', bbc: 'ลาดพร้าว(ไก่)' },
  { keyword: 'เกทเวย์', bbc: 'เกตย์เวย์(ไก่)' },
];

// Closed/inactive branches — skip silently
const CLOSED_KEYWORDS = ['ประชาอุทิศ', 'ลาดพร้าววังหิน', 'ICS', 'เจริญนคร'];

function mapBranch(pdfName: string): string | null {
  for (const { keyword, bbc } of BRANCH_MAPPING) {
    if (pdfName.includes(keyword)) return bbc;
  }
  return null;
}

function isClosed(pdfName: string): boolean {
  return CLOSED_KEYWORDS.some((k) => pdfName.includes(k));
}

// Extract branch name and ยอดรายการ from PDF text
function parsePDFText(text: string): { branchName: string; grabAmount: number } {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Branch name is the line after "รายงานธุรกิจรายวัน" → date line → branch name
  const headerIdx = lines.findIndex((l) => l.includes('รายงานธุรกิจรายวัน'));
  const branchName = headerIdx >= 0 ? (lines[headerIdx + 2] ?? '') : '';

  // ยอดรายการ is first number in the line after "ยอดรายการ VAT..."
  const colHeaderIdx = lines.findIndex((l) => l.startsWith('ยอดรายการ') && l.includes('VAT'));
  let grabAmount = 0;
  if (colHeaderIdx >= 0) {
    const dataLine = lines[colHeaderIdx + 1] ?? '';
    const firstNum = dataLine.split(/\s+/)[0];
    grabAmount = parseFloat(firstNum.replace(/,/g, '')) || 0;
  }

  return { branchName, grabAmount };
}

// Extract YYYY-MM-DD from filename: 3-XXXXXXXX-YYYYMMDD.pdf
function dateFromFilename(filename: string): string | null {
  const m = filename.match(/(\d{8})\.pdf$/i);
  if (!m) return null;
  const raw = m[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS pending_grab_imports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pdf_date DATE NOT NULL,
      branch_name_pdf TEXT NOT NULL,
      branch_name_bbc TEXT,
      grab_amount FLOAT NOT NULL DEFAULT 0,
      filename TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// POST /api/grab-import — called by n8n with base64 PDF
export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const body = await request.json();
    const { pdf_base64, filename } = body as { pdf_base64: string; filename: string };

    if (!pdf_base64 || !filename) {
      return NextResponse.json({ error: 'ต้องส่ง pdf_base64 และ filename' }, { status: 400 });
    }

    // Decode base64 → Buffer → parse PDF
    const buffer = Buffer.from(pdf_base64, 'base64');
    // Use lib version to avoid Next.js test-file scanning issue
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const pdfData = await pdfParse(buffer);
    const { branchName, grabAmount } = parsePDFText(pdfData.text);

    // Skip closed branches
    if (isClosed(branchName)) {
      return NextResponse.json({ message: 'skipped: closed branch', branch: branchName });
    }

    const branchBBC = mapBranch(branchName);
    const pdfDate = dateFromFilename(filename);

    if (!pdfDate) {
      return NextResponse.json({ error: 'ไม่สามารถอ่านวันที่จากชื่อไฟล์' }, { status: 400 });
    }

    // Avoid duplicate: same date + same pdf branch name
    const { rows: existing } = await sql`
      SELECT id FROM pending_grab_imports
      WHERE pdf_date = ${pdfDate}::date AND branch_name_pdf = ${branchName} AND status = 'pending'
    `;
    if (existing.length > 0) {
      return NextResponse.json({ message: 'duplicate: already pending', id: existing[0].id });
    }

    const { rows } = await sql`
      INSERT INTO pending_grab_imports (pdf_date, branch_name_pdf, branch_name_bbc, grab_amount, filename)
      VALUES (${pdfDate}::date, ${branchName}, ${branchBBC}, ${grabAmount}, ${filename})
      RETURNING id
    `;

    return NextResponse.json({ message: 'รับข้อมูลแล้ว รอ admin อนุมัติ', id: rows[0].id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/grab-import — returns pending imports
export async function GET() {
  try {
    await ensureTable();
    const { rows } = await sql`
      SELECT * FROM pending_grab_imports
      ORDER BY pdf_date DESC, created_at DESC
    `;
    return NextResponse.json({ rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/grab-import — approve or reject
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body as { id: string; action: 'approve' | 'reject' };

    if (!id || !action) {
      return NextResponse.json({ error: 'ต้องส่ง id และ action' }, { status: 400 });
    }

    if (action === 'reject') {
      await sql`UPDATE pending_grab_imports SET status = 'rejected' WHERE id = ${id}`;
      return NextResponse.json({ message: 'ปฏิเสธแล้ว' });
    }

    // Approve: get the pending row then insert into accounting_entries
    const { rows } = await sql`
      SELECT * FROM pending_grab_imports WHERE id = ${id} AND status = 'pending'
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการ หรือถูกดำเนินการแล้ว' }, { status: 404 });
    }

    const row = rows[0];
    const branchName = row.branch_name_bbc ?? row.branch_name_pdf;

    // Insert into accounting_entries (grab channel only)
    await sql`
      INSERT INTO accounting_entries (entry_date, branch_name, cash, line_man, grab, central, other)
      VALUES (${row.pdf_date}::date, ${branchName}, 0, 0, ${row.grab_amount}, 0, 0)
    `;

    await sql`UPDATE pending_grab_imports SET status = 'approved' WHERE id = ${id}`;

    return NextResponse.json({ message: 'อนุมัติแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
