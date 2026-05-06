"use client";
import { useState } from "react";

const STAFF_MAP: Record<string, { branchName: string; type: "chicken" | "pork" }> = {
  "8241": { branchName: "ชิดลม(ไก่)",         type: "chicken" },
  "6174": { branchName: "นครปฐม(ไก่)",        type: "chicken" },
  "2089": { branchName: "เกตย์เวย์(ไก่)",     type: "chicken" },
  "9126": { branchName: "ลาดพร้าว(ไก่)",      type: "chicken" },
  "4703": { branchName: "แจ้งวัฒนะ(ไก่)",    type: "chicken" },
  "3952": { branchName: "เซ็นทรัลเวิลด์(หมู)", type: "pork"    },
  "5437": { branchName: "ลาดพร้าว(หมู)",      type: "pork"    },
};

function getYesterday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SalesPage() {
  const [pin, setPin] = useState("");
  const [branch, setBranch] = useState<{ branchName: string; type: "chicken" | "pork" } | null>(null);
  const [saleDate, setSaleDate] = useState(getYesterday());
  const [revenue, setRevenue] = useState("");
  const [kaiTon, setKaiTon] = useState("");
  const [nongSaPok, setNongSaPok] = useState("");
  const [porkLeg, setPorkLeg] = useState("");
  const [kaki, setKaki] = useState("");
  const [yiChak, setYiChak] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = STAFF_MAP[pin];
    if (found) setBranch(found);
    else alert("รหัส PIN ไม่ถูกต้องครับ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenue) return alert("กรุณากรอกยอดขายครับ");
    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: branch!.branchName,
          saleDate,
          revenue: parseFloat(revenue),
          kai_ton:    branch!.type === "chicken" ? parseFloat(kaiTon || "0")    : 0,
          nong_sa_pok: branch!.type === "chicken" ? parseFloat(nongSaPok || "0") : 0,
          pork_leg:   branch!.type === "pork"    ? parseFloat(porkLeg || "0")  : 0,
          kaki:       branch!.type === "pork"    ? parseFloat(kaki || "0")     : 0,
          yi_chak:    branch!.type === "pork"    ? parseFloat(yiChak || "0")   : 0,
        }),
      });
      if (res.ok) setDone(true);
      else alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ");
    } finally {
      setLoading(false);
    }
  };

  // Login screen
  if (!branch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 text-black">
        <form onSubmit={handleLogin} className="p-10 bg-white shadow-2xl rounded-2xl border border-orange-100 w-80">
          <h1 className="text-2xl font-extrabold mb-2 text-center text-orange-600">BBC</h1>
          <p className="text-center text-gray-500 text-sm mb-6">บันทึกยอดขายประจำวัน</p>
          <input
            type="password" value={pin} onChange={(e) => setPin(e.target.value)}
            className="w-full p-4 border-2 border-orange-100 rounded-xl mb-4 text-center text-3xl tracking-[1rem]"
            placeholder="****" maxLength={4} autoFocus
          />
          <button className="w-full bg-orange-500 text-white p-3 rounded-xl font-bold hover:bg-orange-600">
            เข้าสู่ระบบ
          </button>
          <a href="/" className="mt-4 block text-center text-xs text-gray-400 hover:text-orange-500 transition-colors">
            ← กลับหน้าสั่งของ
          </a>
        </form>
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
            onClick={() => { setDone(false); setRevenue(""); setKaiTon(""); setNongSaPok(""); setPorkLeg(""); setKaki(""); setYiChak(""); setSaleDate(getYesterday()); }}
            className="w-full bg-orange-500 text-white p-3 rounded-xl font-bold hover:bg-orange-600"
          >
            กรอกอีกครั้ง
          </button>
          <button onClick={() => setBranch(null)} className="mt-3 w-full text-gray-400 text-sm">
            ออกจากระบบ
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
          <button onClick={() => setBranch(null)} className="text-xs text-gray-400 hover:text-red-500">ออก</button>
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
