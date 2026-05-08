"use client";
import { useState, useEffect, useCallback } from "react";

const GP_RATES = { cash: 0, line_man: 0.27, grab: 0.30, central: 0.30, other: 0 };

const BRANCHES = [
  "ชิดลม(ไก่)",
  "นครปฐม(ไก่)",
  "เกตย์เวย์(ไก่)",
  "ลาดพร้าว(ไก่)",
  "แจ้งวัฒนะ(ไก่)",
  "เซ็นทรัลเวิลด์(หมู)",
  "ลาดพร้าว(หมู)",
];

function getThisMonth() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const first = `${y}-${m}-01`;
  const last = new Date(y, d.getMonth() + 1, 0);
  const lastStr = `${y}-${m}-${String(last.getDate()).padStart(2, "0")}`;
  return { from: first, to: lastStr };
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcGP(row: any) {
  return (
    (row.cash * GP_RATES.cash) +
    (row.line_man * GP_RATES.line_man) +
    (row.grab * GP_RATES.grab) +
    (row.central * GP_RATES.central) +
    (row.other * GP_RATES.other)
  );
}

function calcTotal(row: any) {
  return (row.cash ?? 0) + (row.line_man ?? 0) + (row.grab ?? 0) + (row.central ?? 0) + (row.other ?? 0);
}

type Entry = {
  id: string;
  entry_date: string;
  branch_name: string;
  cash: number;
  line_man: number;
  grab: number;
  central: number;
  other: number;
};

type ViewMode = "daily" | "summary" | "pending";

type PendingImport = {
  id: string;
  pdf_date: string;
  branch_name_pdf: string;
  branch_name_bbc: string | null;
  grab_amount: number;
  filename: string;
  status: string;
};

export default function AdminAccountingPage() {
  const { from: defaultFrom, to: defaultTo } = getThisMonth();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("summary");
  const [pending, setPending] = useState<PendingImport[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting?from=${from}&to=${to}`);
      const data = await res.json();
      setEntries(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch('/api/grab-import');
      const data = await res.json();
      setPending((data.rows ?? []).filter((r: PendingImport) => r.status === 'pending'));
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id + action);
    try {
      await fetch('/api/grab-import', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      await fetchPending();
      if (action === 'approve') await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Per-branch summary
  const branchSummary = BRANCHES.map((b) => {
    const rows = entries.filter((e) => e.branch_name === b);
    const cash     = rows.reduce((s, r) => s + (r.cash ?? 0), 0);
    const line_man = rows.reduce((s, r) => s + (r.line_man ?? 0), 0);
    const grab     = rows.reduce((s, r) => s + (r.grab ?? 0), 0);
    const central  = rows.reduce((s, r) => s + (r.central ?? 0), 0);
    const other    = rows.reduce((s, r) => s + (r.other ?? 0), 0);
    const agg = { cash, line_man, grab, central, other };
    const total = calcTotal(agg);
    const gp    = calcGP(agg);
    const net   = total - gp;
    return { branch: b, cash, line_man, grab, central, other, total, gp, net, count: rows.length };
  }).filter((r) => r.total > 0);

  const grandTotal   = branchSummary.reduce((s, r) => s + r.total, 0);
  const grandGP      = branchSummary.reduce((s, r) => s + r.gp, 0);
  const grandNet     = branchSummary.reduce((s, r) => s + r.net, 0);
  const grandCash    = branchSummary.reduce((s, r) => s + r.cash, 0);
  const grandLineman = branchSummary.reduce((s, r) => s + r.line_man, 0);
  const grandGrab    = branchSummary.reduce((s, r) => s + r.grab, 0);
  const grandCentral = branchSummary.reduce((s, r) => s + r.central, 0);
  const grandOther   = branchSummary.reduce((s, r) => s + r.other, 0);

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-emerald-700 text-white px-6 py-5 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">รายรับ &amp; P&L</h1>
            <p className="text-emerald-200 text-xs mt-0.5">BBC Ordering System</p>
          </div>
          <a href="/accounting" className="text-xs bg-white text-emerald-700 px-3 py-2 rounded-lg font-bold hover:bg-emerald-50 transition-colors">
            + กรอกรายรับ
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">จาก</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="p-2 border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-emerald-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">ถึง</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="p-2 border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-emerald-400 outline-none" />
            </div>
            <button onClick={fetchData}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
              {loading ? "โหลด..." : "ดึงข้อมูล"}
            </button>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setView("summary")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${view === "summary" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                สรุปสาขา
              </button>
              <button onClick={() => setView("daily")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${view === "daily" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                รายวัน
              </button>
              <button onClick={() => setView("pending")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors relative ${view === "pending" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                Grab รออนุมัติ
                {pending.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">
                    {pending.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">ยอดรวม</p>
              <p className="text-2xl font-black text-gray-800">{fmt(grandTotal)}</p>
              <p className="text-xs text-gray-400">บาท</p>
            </div>
            <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-5 text-center">
              <p className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wider">GP หัก</p>
              <p className="text-2xl font-black text-red-500">- {fmt(grandGP)}</p>
              <p className="text-xs text-red-300">บาท ({grandTotal > 0 ? ((grandGP / grandTotal) * 100).toFixed(1) : 0}%)</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl shadow-sm border border-emerald-100 p-5 text-center">
              <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">รับสุทธิ</p>
              <p className="text-2xl font-black text-emerald-700">{fmt(grandNet)}</p>
              <p className="text-xs text-emerald-400">บาท</p>
            </div>
          </div>
        )}

        {/* No data */}
        {!loading && entries.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-bold">ยังไม่มีข้อมูลในช่วงนี้</p>
            <p className="text-sm mt-1">ลองเปลี่ยนช่วงวันที่ หรือ <a href="/accounting" className="text-emerald-600 underline">กรอกรายรับ</a></p>
          </div>
        )}

        {/* Summary view */}
        {!loading && view === "summary" && branchSummary.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-black text-gray-700">สรุปรายรับแยกสาขา</h2>
              <p className="text-xs text-gray-400">{from} ถึง {to}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 font-bold uppercase">
                    <th className="text-left px-4 py-3">สาขา</th>
                    <th className="text-right px-3 py-3">เงินสด</th>
                    <th className="text-right px-3 py-3">LINE MAN</th>
                    <th className="text-right px-3 py-3">Grab</th>
                    <th className="text-right px-3 py-3">เซ็นทรัล</th>
                    <th className="text-right px-3 py-3">อื่นๆ</th>
                    <th className="text-right px-4 py-3">ยอดรวม</th>
                    <th className="text-right px-3 py-3 text-red-400">GP หัก</th>
                    <th className="text-right px-4 py-3 text-emerald-600">รับสุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {branchSummary.map((r) => (
                    <tr key={r.branch} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700">{r.branch}</td>
                      <td className="text-right px-3 py-3 text-gray-500">{r.cash > 0 ? fmt(r.cash) : "—"}</td>
                      <td className="text-right px-3 py-3 text-gray-500">{r.line_man > 0 ? fmt(r.line_man) : "—"}</td>
                      <td className="text-right px-3 py-3 text-gray-500">{r.grab > 0 ? fmt(r.grab) : "—"}</td>
                      <td className="text-right px-3 py-3 text-gray-500">{r.central > 0 ? fmt(r.central) : "—"}</td>
                      <td className="text-right px-3 py-3 text-gray-500">{r.other > 0 ? fmt(r.other) : "—"}</td>
                      <td className="text-right px-4 py-3 font-bold text-gray-800">{fmt(r.total)}</td>
                      <td className="text-right px-3 py-3 font-bold text-red-400">- {fmt(r.gp)}</td>
                      <td className="text-right px-4 py-3 font-black text-emerald-700">{fmt(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-100 font-black">
                    <td className="px-4 py-3 text-emerald-800">รวมทุกสาขา</td>
                    <td className="text-right px-3 py-3 text-gray-600">{fmt(grandCash)}</td>
                    <td className="text-right px-3 py-3 text-gray-600">{fmt(grandLineman)}</td>
                    <td className="text-right px-3 py-3 text-gray-600">{fmt(grandGrab)}</td>
                    <td className="text-right px-3 py-3 text-gray-600">{fmt(grandCentral)}</td>
                    <td className="text-right px-3 py-3 text-gray-600">{fmt(grandOther)}</td>
                    <td className="text-right px-4 py-3 text-gray-800 text-base">{fmt(grandTotal)}</td>
                    <td className="text-right px-3 py-3 text-red-500 text-base">- {fmt(grandGP)}</td>
                    <td className="text-right px-4 py-3 text-emerald-700 text-base">{fmt(grandNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Pending Grab imports */}
        {view === "pending" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-700">Grab รออนุมัติ</h2>
                <p className="text-xs text-gray-400">ดึงจาก email อัตโนมัติ — กด อนุมัติ เพื่อบันทึกเข้าระบบ</p>
              </div>
              <button onClick={fetchPending} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1 border rounded-lg">
                รีเฟรช
              </button>
            </div>
            {pendingLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">กำลังโหลด...</div>
            ) : pending.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-bold">ไม่มีรายการรออนุมัติ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 font-bold uppercase">
                      <th className="text-left px-4 py-3">วันที่</th>
                      <th className="text-left px-3 py-3">ชื่อในไฟล์</th>
                      <th className="text-left px-3 py-3">สาขาในระบบ</th>
                      <th className="text-right px-3 py-3">ยอดรายการ Grab</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((row) => (
                      <tr key={row.id} className="border-t border-gray-50 hover:bg-orange-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.pdf_date?.toString().slice(0, 10)}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs max-w-xs truncate">{row.branch_name_pdf}</td>
                        <td className="px-3 py-3 font-bold">
                          {row.branch_name_bbc
                            ? <span className="text-gray-800">{row.branch_name_bbc}</span>
                            : <span className="text-red-400 text-xs">ไม่รู้จักสาขา</span>}
                        </td>
                        <td className="text-right px-3 py-3 font-black text-gray-800">{fmt(row.grab_amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleAction(row.id, 'approve')}
                              disabled={actionLoading === row.id + 'approve'}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                              {actionLoading === row.id + 'approve' ? '...' : 'อนุมัติ'}
                            </button>
                            <button
                              onClick={() => handleAction(row.id, 'reject')}
                              disabled={actionLoading === row.id + 'reject'}
                              className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors">
                              {actionLoading === row.id + 'reject' ? '...' : 'ปฏิเสธ'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Daily view */}
        {!loading && view === "daily" && sortedEntries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-black text-gray-700">รายวัน</h2>
              <p className="text-xs text-gray-400">{sortedEntries.length} รายการ</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 font-bold uppercase">
                    <th className="text-left px-4 py-3">วันที่</th>
                    <th className="text-left px-3 py-3">สาขา</th>
                    <th className="text-right px-3 py-3">เงินสด</th>
                    <th className="text-right px-3 py-3">LINE MAN</th>
                    <th className="text-right px-3 py-3">Grab</th>
                    <th className="text-right px-3 py-3">เซ็นทรัล</th>
                    <th className="text-right px-3 py-3">อื่นๆ</th>
                    <th className="text-right px-4 py-3">ยอดรวม</th>
                    <th className="text-right px-3 py-3 text-red-400">GP</th>
                    <th className="text-right px-4 py-3 text-emerald-600">สุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((e) => {
                    const total = calcTotal(e);
                    const gp    = calcGP(e);
                    const net   = total - gp;
                    return (
                      <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.entry_date?.toString().slice(0, 10)}</td>
                        <td className="px-3 py-3 font-bold text-gray-700">{e.branch_name}</td>
                        <td className="text-right px-3 py-3 text-gray-500">{e.cash > 0 ? fmt(e.cash) : "—"}</td>
                        <td className="text-right px-3 py-3 text-gray-500">{e.line_man > 0 ? fmt(e.line_man) : "—"}</td>
                        <td className="text-right px-3 py-3 text-gray-500">{e.grab > 0 ? fmt(e.grab) : "—"}</td>
                        <td className="text-right px-3 py-3 text-gray-500">{e.central > 0 ? fmt(e.central) : "—"}</td>
                        <td className="text-right px-3 py-3 text-gray-500">{e.other > 0 ? fmt(e.other) : "—"}</td>
                        <td className="text-right px-4 py-3 font-bold text-gray-800">{fmt(total)}</td>
                        <td className="text-right px-3 py-3 font-bold text-red-400">- {fmt(gp)}</td>
                        <td className="text-right px-4 py-3 font-black text-emerald-700">{fmt(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
