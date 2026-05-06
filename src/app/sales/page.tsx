"use client";
import { useState, useEffect } from "react";

const STAFF_MAP: Record<string, { branchName: string; type: "chicken" | "pork" | "floating" }> = {
  "8241": { branchName: "ชิดลม(ไก่)",           type: "chicken" },
  "6174": { branchName: "นครปฐม(ไก่)",          type: "chicken" },
  "2089": { branchName: "เกตย์เวย์(ไก่)",       type: "chicken" },
  "9126": { branchName: "ลาดพร้าว(ไก่)",        type: "chicken" },
  "4703": { branchName: "แจ้งวัฒนะ(ไก่)",      type: "chicken" },
  "3952": { branchName: "เซ็นทรัลเวิลด์(หมู)", type: "pork"    },
  "5437": { branchName: "ลาดพร้าว(หมู)",        type: "pork"    },
  "7531": { branchName: "พนักงานลอย",           type: "floating" },
  "4815": { branchName: "พนักงานลอย 2",         type: "floating" },
};

const BRANCH_LIST: { branchName: string; type: "chicken" | "pork" }[] = [
  { branchName: "ชิดลม(ไก่)",           type: "chicken" },
  { branchName: "นครปฐม(ไก่)",          type: "chicken" },
  { branchName: "เกตย์เวย์(ไก่)",       type: "chicken" },
  { branchName: "ลาดพร้าว(ไก่)",        type: "chicken" },
  { branchName: "แจ้งวัฒนะ(ไก่)",      type: "chicken" },
  { branchName: "เซ็นทรัลเวิลด์(หมู)", type: "pork"    },
  { branchName: "ลาดพร้าว(หมู)",        type: "pork"    },
];

function getToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SalesPage() {
  const [pin, setPin] = useState("");
  const [branch, setBranch] = useState<{ branchName: string; type: "chicken" | "pork" } | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [saleDate, setSaleDate] = useState(getToday());
  const [revenue, setRevenue] = useState("");
  const [kaiTon, setKaiTon] = useState("");
  const [nongSaPok, setNongSaPok] = useState("");
  const [porkLeg, setPorkLeg] = useState("");
  const [kaki, setKaki] = useState("");
  const [yiChak, setYiChak] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const doLogin = (code: string) => {
    const found = STAFF_MAP[code];
    if (!found) { alert("รหัส PIN ไม่ถูกต้องครับ"); setPin(""); return; }
    if (found.type === "floating") { setIsFloating(true); }
    else setBranch(found as { branchName: string; type: "chicken" | "pork" });
  };

  useEffect(() => {
    if (pin.length === 4) doLogin(pin);
  }, [pin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenue) return alert("กรุณากรอกยอดขายครับ");
    setConfirming(true);
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: branch!.branchName,
          saleDate,
          revenue: parseFloat(revenue),
          kai_ton:     branch!.type === "chicken" ? parseFloat(kaiTon || "0")    : 0,
          nong_sa_pok: branch!.type === "chicken" ? parseFloat(nongSaPok || "0") : 0,
          pork_leg:    branch!.type === "pork"    ? parseFloat(porkLeg || "0")  : 0,
          kaki:        branch!.type === "pork"    ? parseFloat(kaki || "0")     : 0,
          yi_chak:     branch!.type === "pork"    ? parseFloat(yiChak || "0")   : 0,
        }),
      });
      if (res.ok) { setConfirming(false); setDone(true); }
      else alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ");
    } finally {
      setLoading(false);
    }
  };

  // Branch picker screen (floating employee)
  if (isFloating && !branch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 text-black px-4">
        <div className="p-8 bg-white shadow-2xl rounded-2xl border border-orange-100 w-full max-w-sm">
          <h1 className="text-xl font-extrabold mb-1 text-center text-orange-600">เลือกสาขา</h1>
          <p className="text-center text-gray-400 text-xs mb-6">วันนี้ไปช่วยสาขาไหน?</p>
          <div className="space-y-3">
            {BRANCH_LIST.map((b) => (
              <button
                key={b.branchName}
                onClick={() => setBranch(b)}
                className="w-full p-3 rounded-xl border-2 border-orange-100 font-bold text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
              >
                {b.branchName}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsFloating(false)}
            className="mt-5 w-full text-xs text-gray-400 hover:text-red-500"
          >
            ← ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  // Login screen
  if (!branch) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <div className="bg-[#ea580c] h-40 flex flex-col items-center justify-center text-white shadow-lg">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-1">BBC System</h1>
          <p className="text-xs opacity-90 tracking-widest uppercase font-bold">บันทึกยอดขายประจำวัน</p>
        </div>
        <div className="flex-1 -mt-8 bg-white rounded-t-[3rem] p-8 shadow-2xl relative z-10">
          <div className="max-w-xs mx-auto">
            <h2 className="text-center font-bold text-slate-400 mb-6 uppercase tracking-widest text-[10px]">Enter PIN Code</h2>
            <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${pin.length >= i ? "bg-[#f97316] border-[#f97316] shadow-lg scale-110" : "bg-slate-50 border-slate-200"}`}>
                  {pin.length >= i && <div className="w-3 h-3 bg-white rounded-full"></div>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => setPin(prev => prev.length < 4 ? prev + num : prev)}
                  className="h-16 bg-slate-100 rounded-2xl text-2xl font-black text-slate-700 active:bg-orange-100 transition-all shadow-sm">
                  {num}
                </button>
              ))}
              <button onClick={() => setPin("")} className="h-16 text-slate-400 font-bold text-xs uppercase">Clear</button>
              <button onClick={() => setPin(prev => prev.length < 4 ? prev + "0" : prev)}
                className="h-16 bg-slate-100 rounded-2xl text-2xl font-black text-slate-700 shadow-sm">0</button>
              <button onClick={() => doLogin(pin)}
                className="h-16 bg-[#f97316] rounded-2xl text-white text-2xl font-black shadow-lg active:scale-90 transition-all">
                →
              </button>
            </div>
            <div className="mt-6 text-center">
              <a href="/" className="text-xs text-slate-400 hover:text-orange-500 transition-colors">← กลับหน้าสั่งของ</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm screen
  if (confirming) {
    const rows: { label: string; value: string }[] = [
      { label: "สาขา",        value: branch!.branchName },
      { label: "วันที่ขาย",  value: saleDate },
      { label: "ยอดขาย",     value: `${parseFloat(revenue).toLocaleString()} บาท` },
      ...(branch!.type === "chicken" ? [
        { label: "ไก่ตอน",     value: `${kaiTon || "0"} ตัว` },
        { label: "น่องสะโพก", value: `${nongSaPok || "0"} กก.` },
      ] : [
        { label: "ขาหมู",     value: `${porkLeg || "0"} ตัว` },
        { label: "คากิ",      value: `${kaki || "0"} ตัว` },
        { label: "ยี่จัก",   value: `${yiChak || "0"} ตัว` },
      ]),
    ];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 text-black px-4">
        <div className="bg-white shadow-2xl rounded-2xl border border-orange-100 w-full max-w-sm p-6">
          <h2 className="text-lg font-extrabold text-orange-600 mb-1">ตรวจสอบข้อมูล</h2>
          <p className="text-xs text-gray-400 mb-5">ข้อมูลถูกต้องไหม? กด ยืนยัน เพื่อบันทึก</p>
          <div className="space-y-3 mb-6">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400">{r.label}</span>
                <span className="font-black text-gray-800">{r.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={doSubmit} disabled={loading}
            className="w-full bg-orange-500 text-white p-4 rounded-xl font-bold text-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 mb-3"
          >
            {loading ? "กำลังบันทึก..." : "ยืนยัน"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="w-full p-3 rounded-xl border-2 border-gray-100 font-bold text-gray-500 hover:border-orange-300 transition-all"
          >
            แก้ไข
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 text-black">
        <div className="p-10 bg-white shadow-2xl rounded-2xl border border-orange-100 w-80 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-600 mb-2">บันทึกสำเร็จ!</h2>
          <p className="text-gray-500 text-sm mb-6">{branch.branchName}</p>
          <button
            onClick={() => { setDone(false); setRevenue(""); setKaiTon(""); setNongSaPok(""); setPorkLeg(""); setKaki(""); setYiChak(""); setSaleDate(getToday()); }}
            className="w-full bg-orange-500 text-white p-3 rounded-xl font-bold hover:bg-orange-600"
          >
            กรอกอีกครั้ง
          </button>
          <button onClick={() => { setBranch(null); if (!isFloating) setIsFloating(false); }} className="mt-3 w-full text-gray-400 text-sm">
            {isFloating ? "เปลี่ยนสาขา" : "ออกจากระบบ"}
          </button>
          <a href="/" className="mt-2 block text-center text-xs text-gray-300 hover:text-orange-400 transition-colors">
            ← กลับหน้าสั่งของ
          </a>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 text-black px-4 py-8">
      <div className="bg-white shadow-2xl rounded-2xl border border-orange-100 w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-extrabold text-orange-600">บันทึกยอดขาย</h1>
            <p className="text-xs text-gray-400">{branch.branchName}</p>
          </div>
          <button onClick={() => setBranch(null)} className="text-xs text-gray-400 hover:text-red-500">
            {isFloating ? "เปลี่ยนสาขา" : "ออก"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* วันที่ขาย */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">วันที่ขาย</label>
            <input
              type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)}
              className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-medium"
            />
          </div>

          {/* ยอดขาย */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">ยอดขาย (บาท)</label>
            <input
              type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)}
              className="w-full p-3 border-2 border-orange-200 rounded-xl text-center text-xl font-bold text-orange-600 focus:border-orange-400 outline-none"
              placeholder="0" inputMode="numeric"
            />
          </div>

          {/* ไก่ */}
          {branch.type === "chicken" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ไก่ตอน (ตัว)</label>
                <input
                  type="number" value={kaiTon} onChange={(e) => setKaiTon(e.target.value)}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-bold focus:border-orange-300 outline-none"
                  placeholder="0" inputMode="decimal" step="0.5"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">น่องสะโพก (กก.)</label>
                <input
                  type="number" value={nongSaPok} onChange={(e) => setNongSaPok(e.target.value)}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-bold focus:border-orange-300 outline-none"
                  placeholder="0" inputMode="decimal" step="0.5"
                />
              </div>
            </>
          )}

          {/* หมู */}
          {branch.type === "pork" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ขาหมู (ตัว)</label>
                <input
                  type="number" value={porkLeg} onChange={(e) => setPorkLeg(e.target.value)}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-bold focus:border-orange-300 outline-none"
                  placeholder="0" inputMode="decimal" step="0.5"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">คากิ (ตัว)</label>
                <input
                  type="number" value={kaki} onChange={(e) => setKaki(e.target.value)}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-bold focus:border-orange-300 outline-none"
                  placeholder="0" inputMode="decimal" step="0.5"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ยี่จัก (ตัว)</label>
                <input
                  type="number" value={yiChak} onChange={(e) => setYiChak(e.target.value)}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl text-center font-bold focus:border-orange-300 outline-none"
                  placeholder="0" inputMode="decimal" step="0.5"
                />
              </div>
            </>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-orange-500 text-white p-4 rounded-xl font-bold text-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกยอดขาย"}
          </button>
        </form>
      </div>
    </div>
  );
}
