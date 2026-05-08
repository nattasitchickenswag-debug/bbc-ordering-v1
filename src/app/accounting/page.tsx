"use client";
import { useState, useEffect } from "react";

const STAFF_MAP: Record<string, { branchName: string; type: "branch" | "admin" }> = {
  "8241": { branchName: "ชิดลม(ไก่)",           type: "branch" },
  "6174": { branchName: "นครปฐม(ไก่)",          type: "branch" },
  "2089": { branchName: "เกตย์เวย์(ไก่)",       type: "branch" },
  "9126": { branchName: "ลาดพร้าว(ไก่)",        type: "branch" },
  "4703": { branchName: "แจ้งวัฒนะ(ไก่)",      type: "branch" },
  "3952": { branchName: "เซ็นทรัลเวิลด์(หมู)", type: "branch" },
  "5437": { branchName: "ลาดพร้าว(หมู)",        type: "branch" },
  "8888": { branchName: "Admin",                  type: "admin"  },
};

const BRANCH_LIST = [
  "ชิดลม(ไก่)",
  "นครปฐม(ไก่)",
  "เกตย์เวย์(ไก่)",
  "ลาดพร้าว(ไก่)",
  "แจ้งวัฒนะ(ไก่)",
  "เซ็นทรัลเวิลด์(หมู)",
  "ลาดพร้าว(หมู)",
];

const CENTRAL_BRANCHES = new Set([
  "ชิดลม(ไก่)",
  "นครปฐม(ไก่)",
  "แจ้งวัฒนะ(ไก่)",
  "เซ็นทรัลเวิลด์(หมู)",
  "ลาดพร้าว(ไก่)",
  "ลาดพร้าว(หมู)",
]);

const GP = { cash: 0, line_man: 0.27, grab: 0.30, central: 0.30, other: 0 };

function getToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function gpDeduct(amount: number, rate: number) {
  return Math.round(amount * rate * 100) / 100;
}

export default function AccountingPage() {
  const [pin, setPin] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [entryDate, setEntryDate] = useState(getToday());
  const [cash, setCash] = useState("");
  const [lineman, setLineman] = useState("");
  const [grab, setGrab] = useState("");
  const [central, setCentral] = useState("");
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const doLogin = (code: string) => {
    const found = STAFF_MAP[code];
    if (!found) { alert("รหัส PIN ไม่ถูกต้องครับ"); setPin(""); return; }
    if (found.type === "admin") { setIsAdmin(true); }
    else setBranch(found.branchName);
  };

  useEffect(() => {
    if (pin.length === 4) doLogin(pin);
  }, [pin]);

  const hasCentral = branch ? CENTRAL_BRANCHES.has(branch) : false;

  const v = {
    cash: parseFloat(cash || "0"),
    line_man: parseFloat(lineman || "0"),
    grab: parseFloat(grab || "0"),
    central: parseFloat(central || "0"),
    other: parseFloat(other || "0"),
  };

  const gpCash     = gpDeduct(v.cash, GP.cash);
  const gpLineman  = gpDeduct(v.line_man, GP.line_man);
  const gpGrab     = gpDeduct(v.grab, GP.grab);
  const gpCentral  = gpDeduct(v.central, GP.central);
  const gpOther    = gpDeduct(v.other, GP.other);

  const totalRevenue = v.cash + v.line_man + v.grab + v.central + v.other;
  const totalGP      = gpCash + gpLineman + gpGrab + gpCentral + gpOther;
  const netRevenue   = totalRevenue - totalGP;

  const hasData = totalRevenue > 0;

  const doSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: entryDate,
          branch_name: branch,
          cash: v.cash,
          line_man: v.line_man,
          grab: v.grab,
          central: hasCentral ? v.central : 0,
          other: v.other,
        }),
      });
      if (res.ok) { setConfirming(false); setDone(true); }
      else alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCash(""); setLineman(""); setGrab(""); setCentral(""); setOther("");
    setEntryDate(getToday());
    setDone(false);
    setConfirming(false);
  };

  // Admin branch picker
  if (isAdmin && !branch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 text-black px-4">
        <div className="p-8 bg-white shadow-2xl rounded-2xl border border-emerald-100 w-full max-w-sm">
          <h1 className="text-xl font-extrabold mb-1 text-center text-emerald-700">เลือกสาขา</h1>
          <p className="text-center text-gray-400 text-xs mb-6">กรอกรายรับของสาขาไหน?</p>
          <div className="space-y-3">
            {BRANCH_LIST.map((b) => (
              <button
                key={b}
                onClick={() => setBranch(b)}
                className="w-full p-3 rounded-xl border-2 border-emerald-100 font-bold text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
              >
                {b}
              </button>
            ))}
          </div>
          <button onClick={() => setIsAdmin(false)} className="mt-5 w-full text-xs text-gray-400 hover:text-red-500">
            ← ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  // Login screen
  if (!branch) {
    return (
      <div className="min-h-screen bg-[#f0fdf4] flex flex-col font-sans">
        <div className="bg-emerald-700 h-40 flex flex-col items-center justify-center text-white shadow-lg">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-1">BBC System</h1>
          <p className="text-xs opacity-90 tracking-widest uppercase font-bold">บันทึกรายรับ</p>
        </div>
        <div className="flex-1 -mt-8 bg-white rounded-t-[3rem] p-8 shadow-2xl relative z-10">
          <div className="max-w-xs mx-auto">
            <h2 className="text-center font-bold text-slate-400 mb-6 uppercase tracking-widest text-[10px]">Enter PIN Code</h2>
            <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${pin.length >= i ? "bg-emerald-600 border-emerald-600 shadow-lg scale-110" : "bg-slate-50 border-slate-200"}`}>
                  {pin.length >= i && <div className="w-3 h-3 bg-white rounded-full" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => setPin(prev => prev.length < 4 ? prev + num : prev)}
                  className="h-16 bg-slate-100 rounded-2xl text-2xl font-black text-slate-700 active:bg-emerald-100 transition-all shadow-sm">
                  {num}
                </button>
              ))}
              <button onClick={() => setPin("")} className="h-16 text-slate-400 font-bold text-xs uppercase">Clear</button>
              <button onClick={() => setPin(prev => prev.length < 4 ? prev + "0" : prev)}
                className="h-16 bg-slate-100 rounded-2xl text-2xl font-black text-slate-700 shadow-sm">0</button>
              <button onClick={() => doLogin(pin)}
                className="h-16 bg-emerald-600 rounded-2xl text-white text-2xl font-black shadow-lg active:scale-90 transition-all">→</button>
            </div>
            <div className="mt-6 text-center">
              <a href="/" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">← กลับหน้าหลัก</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm screen
  if (confirming) {
    const rows = [
      { label: "สาขา",        value: branch },
      { label: "วันที่",      value: entryDate },
      { label: "เงินสด",     value: `${fmt(v.cash)} บาท`, gp: null },
      { label: "LINE MAN",   value: `${fmt(v.line_man)} บาท`, gp: `หัก GP 27% = ${fmt(gpLineman)} บาท` },
      { label: "Grab",        value: `${fmt(v.grab)} บาท`, gp: `หัก GP 30% = ${fmt(gpGrab)} บาท` },
      ...(hasCentral ? [{ label: "เซ็นทรัล", value: `${fmt(v.central)} บาท`, gp: `หัก GP 30% = ${fmt(gpCentral)} บาท` }] : []),
      { label: "อื่นๆ",      value: `${fmt(v.other)} บาท`, gp: null },
      { label: "ยอดรวม",     value: `${fmt(totalRevenue)} บาท`, gp: null },
      { label: "GP รวม",     value: `- ${fmt(totalGP)} บาท`, gp: null },
      { label: "รับสุทธิ",  value: `${fmt(netRevenue)} บาท`, gp: null },
    ];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 text-black px-4">
        <div className="bg-white shadow-2xl rounded-2xl border border-emerald-100 w-full max-w-sm p-6">
          <h2 className="text-lg font-extrabold text-emerald-700 mb-1">ตรวจสอบข้อมูล</h2>
          <p className="text-xs text-gray-400 mb-5">ข้อมูลถูกต้องไหม? กด ยืนยัน เพื่อบันทึก</p>
          <div className="space-y-2 mb-6">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                  <span className="text-xs font-bold text-gray-400">{r.label}</span>
                  <span className={`font-black text-sm ${r.label === "GP รวม" ? "text-red-500" : r.label === "รับสุทธิ" ? "text-emerald-700 text-base" : "text-gray-800"}`}>{r.value}</span>
                </div>
                {r.gp && <div className="text-right text-xs text-red-400 -mt-1 pb-1">{r.gp}</div>}
              </div>
            ))}
          </div>
          <button onClick={doSubmit} disabled={loading}
            className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 mb-3">
            {loading ? "กำลังบันทึก..." : "ยืนยัน"}
          </button>
          <button onClick={() => setConfirming(false)}
            className="w-full p-3 rounded-xl border-2 border-gray-100 font-bold text-gray-500 hover:border-emerald-300 transition-all">
            แก้ไข
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 text-black">
        <div className="p-10 bg-white shadow-2xl rounded-2xl border border-emerald-100 w-80 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-emerald-700 mb-2">บันทึกสำเร็จ!</h2>
          <p className="text-gray-500 text-sm mb-1">{branch}</p>
          <p className="text-gray-400 text-xs mb-2">{entryDate}</p>
          <div className="bg-emerald-50 rounded-xl p-3 mb-6 text-left space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-500">ยอดรวม</span><span className="font-bold">{fmt(totalRevenue)} บาท</span></div>
            <div className="flex justify-between text-sm"><span className="text-red-400">GP หัก</span><span className="font-bold text-red-400">- {fmt(totalGP)} บาท</span></div>
            <div className="flex justify-between text-sm border-t border-emerald-100 pt-1"><span className="text-emerald-700 font-bold">รับสุทธิ</span><span className="font-black text-emerald-700">{fmt(netRevenue)} บาท</span></div>
          </div>
          <button onClick={resetForm}
            className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700 mb-2">
            กรอกอีกครั้ง
          </button>
          <button onClick={() => { resetForm(); setBranch(null); setIsAdmin(false); }}
            className="w-full text-gray-400 text-sm hover:text-red-400">
            {isAdmin ? "เปลี่ยนสาขา" : "ออกจากระบบ"}
          </button>
          <a href="/admin/accounting" className="mt-2 block text-xs text-emerald-600 hover:underline">ดูรายงาน P&L →</a>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 text-black px-4 py-8">
      <div className="bg-white shadow-2xl rounded-2xl border border-emerald-100 w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-lg font-extrabold text-emerald-700">บันทึกรายรับ</h1>
            <p className="text-xs text-gray-400">{branch}</p>
          </div>
          <button onClick={() => { setBranch(null); setIsAdmin(false); }} className="text-xs text-gray-400 hover:text-red-500">
            {isAdmin ? "เปลี่ยนสาขา" : "ออก"}
          </button>
        </div>

        <div className="space-y-4">
          {/* วันที่ */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">วันที่</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
              className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-medium focus:border-emerald-300 outline-none" />
          </div>

          {/* Channel inputs */}
          {[
            { key: "cash",    label: "เงินสด",   rate: 0,    value: cash,    set: setCash,    note: null },
            { key: "lineman", label: "LINE MAN", rate: 0.27, value: lineman, set: setLineman, note: "GP 27%" },
            { key: "grab",    label: "Grab",     rate: 0.30, value: grab,    set: setGrab,    note: "GP 30%" },
            ...(hasCentral ? [{ key: "central", label: "เซ็นทรัล", rate: 0.30, value: central, set: setCentral, note: "GP 30%" }] : []),
            { key: "other",   label: "อื่นๆ",    rate: 0,    value: other,   set: setOther,   note: null },
          ].map(({ key, label, rate, value, set, note }) => {
            const amt = parseFloat(value || "0");
            const gp  = gpDeduct(amt, rate);
            const net = amt - gp;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-500">{label}</label>
                  {note && <span className="text-[10px] text-red-400 font-bold">{note}</span>}
                </div>
                <input
                  type="number" value={value} onChange={(e) => set(e.target.value)}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-bold focus:border-emerald-400 outline-none transition-colors"
                  placeholder="0" inputMode="decimal"
                />
                {amt > 0 && rate > 0 && (
                  <div className="flex justify-between text-xs mt-1 px-1">
                    <span className="text-red-400">หัก GP: {fmt(gp)} บาท</span>
                    <span className="text-emerald-600 font-bold">สุทธิ: {fmt(net)} บาท</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary */}
          {hasData && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-2 border border-emerald-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ยอดรวม</span>
                <span className="font-bold">{fmt(totalRevenue)} บาท</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400">GP หัก</span>
                <span className="font-bold text-red-400">- {fmt(totalGP)} บาท</span>
              </div>
              <div className="flex justify-between text-base border-t border-emerald-200 pt-2">
                <span className="text-emerald-700 font-extrabold">รับสุทธิ</span>
                <span className="font-black text-emerald-700">{fmt(netRevenue)} บาท</span>
              </div>
            </div>
          )}

          <button
            onClick={() => { if (!hasData) return alert("กรุณากรอกยอดอย่างน้อย 1 ช่องทางครับ"); setConfirming(true); }}
            disabled={loading}
            className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
          >
            บันทึกรายรับ
          </button>
        </div>
      </div>
    </div>
  );
}
