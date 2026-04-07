"use client";

import { useCallback, useEffect, useState } from "react";

type KitchenLine = {
  productid: number;
  productcode: string;
  productname: string;
  category: string;
  unit: string;
  totalQty: number;
};

type BranchLine = {
  productid: number;
  productcode: string;
  productname: string;
  category: string;
  unit: string;
  qty: number;
};

type BranchBlock = {
  branchid: number;
  branchname: string;
  lastOrderAt: string | null;
  lines: BranchLine[];
};

type PackingPayload = {
  date: string | null;
  kitchen: KitchenLine[];
  byBranch: BranchBlock[];
};

function formatThaiDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function printBranchPackingSlip(
  branchname: string,
  lines: BranchLine[],
  filterDate: string,
  lastOrderAt: string | null
) {
  const title = filterDate
    ? `ใบจัดของ — ${branchname} — วันที่ ${filterDate}`
    : `ใบจัดของ — ${branchname} — ทั้งหมด (ไม่กรองวันที่)`;
  // แสดงเฉพาะรายการที่มีการสั่งจริง (qty > 0)
  const rows = lines
    .filter((l) => l.qty > 0)
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.productcode)}</td><td>${escapeHtml(l.productname)}</td><td>${escapeHtml(
          l.category
        )}</td><td>${escapeHtml(l.unit || "—")}</td><td style="text-align:right">${l.qty.toFixed(2)}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", Tahoma, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { color: #444; margin-bottom: 16px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px; font-size: 13px; }
    th { background: #f0f0f0; text-align: left; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">อัปเดตล่าสุดจากระบบ: ${escapeHtml(formatThaiDateTime(lastOrderAt))}</div>
  <table><thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวด</th><th>หน่วย</th><th>จำนวน</th></tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:20px;font-size:12px;color:#666;">พิมพ์เป็น PDF ได้จากกล่องโต้ตอบเครื่องพิมพ์ → เลือก &quot;Microsoft Print to PDF&quot; หรือเทียบเท่า</p>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function PackingPanel({ filterDate }: { filterDate: string }) {
  const [data, setData] = useState<PackingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = filterDate ? `?date=${encodeURIComponent(filterDate)}` : "";
      const res = await fetch(`/api/admin/packing${q}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const json = (await res.json()) as PackingPayload;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}>กำลังโหลดสรุปการจัดของ…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <p style={{ color: "#aa2033" }}>{error}</p>
        <button type="button" className="secondary" onClick={load}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="packing-dashboard no-print" style={{ marginBottom: 24 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>สรุปครัวกลาง (Kitchen prep) — รวมทุกสาขา</h3>
        <p style={{ marginTop: 0, color: "#5c6478", fontSize: 14 }}>
          ใช้ยอดรวมด้านล่างเพื่อเตรียมของในครัวกลาง (ไม่แยกกล่องสาขา)
        </p>
        {data.kitchen.length === 0 ? (
          <p style={{ color: "#5c6478" }}>ไม่มีรายการในช่วงวันที่เลือก</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อสินค้า</th>
                  <th>หมวด</th>
                  <th>หน่วย</th>
                  <th>รวมจำนวน</th>
                </tr>
              </thead>
              <tbody>
                {data.kitchen
                  .filter((row) => row.totalQty > 0)
                  .map((row) => (
                    <tr key={`k-${row.productid}-${row.productname}`}>
                      <td>
                        <span className="product-code">{row.productcode}</span>
                      </td>
                      <td>{row.productname}</td>
                      <td>{row.category}</td>
                      <td>{row.unit || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{row.totalQty.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: 12 }}>แยกตามสาขา (คนจัดของ / กล่อง)</h3>
      <div className="grid" style={{ gap: 16 }}>
        {data.byBranch.map((block) => (
          <div className="card" key={block.branchid} id={`packing-branch-${block.branchid}`}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10
              }}
            >
              <div>
                <h4 style={{ margin: 0 }}>{block.branchname}</h4>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5c6478" }}>
                  ออเดอร์ล่าสุด: {formatThaiDateTime(block.lastOrderAt)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    printBranchPackingSlip(
                      block.branchname,
                      block.lines,
                      filterDate,
                      block.lastOrderAt
                    )
                  }
                  disabled={block.lines.length === 0}
                >
                  พิมพ์ / ส่งออก PDF
                </button>
              </div>
            </div>
            {block.lines.length === 0 ? (
              <p style={{ color: "#5c6478", margin: 0 }}>ไม่มีรายการสำหรับสาขานี้</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่อสินค้า</th>
                      <th>หมวด</th>
                      <th>หน่วย</th>
                      <th>จำนวน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.lines
                      .filter((line) => line.qty > 0)
                      .map((line) => (
                        <tr key={`${block.branchid}-${line.productid}-${line.productname}`}>
                          <td>
                            <span className="product-code">{line.productcode}</span>
                          </td>
                          <td>{line.productname}</td>
                          <td>{line.category}</td>
                          <td>{line.unit || "—"}</td>
                          <td>{line.qty.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
