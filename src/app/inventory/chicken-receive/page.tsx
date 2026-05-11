"use client";
import { useState, useRef } from "react";

const RECEIVE_PIN = "5678";

function getToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtDate(s: string) {
  const [y, m, dd] = s.split("-");
  return `${dd}/${m}/${parseInt(y) + 543}`;
}

type BagType = "chicken" | "nsot" | "nom" | "kha" | "offal";

const BAG_TYPES: { type: BagType; label: string; emoji: string; color: string; active: string }[] = [
  { type: "chicken", label: "ตอน",    emoji: "🐔", color: "border-orange-200 text-orange-600 bg-white",  active: "bg-orange-500 text-white border-orange-500" },
  { type: "nsot",    label: "นสต.",   emoji: "🍗", color: "border-yellow-200 text-yellow-600 bg-white",  active: "bg-yellow-500 text-white border-yellow-500" },
  { type: "nom",     label: "นม",     emoji: "🥛", color: "border-blue-200 text-blue-600 bg-white",      active: "bg-blue-500 text-white border-blue-500" },
  { type: "kha",     label: "ขาไก่",  emoji: "🦵", color: "border-green-200 text-green-600 bg-white",    active: "bg-green-500 text-white border-green-500" },
  { type: "offal",   label: "เครื่องใน", emoji: "🫀", color: "border-purple-200 text-purple-600 bg-white", active: "bg-purple-500 text-white border-purple-500" },
];

function bagLabel(type: BagType) {
  const t = BAG_TYPES.find(b => b.type === type);
  return t ? `${t.emoji} ${t.label}` : type;
}

function bagStyle(type: BagType, active: boolean) {
  const t = BAG_TYPES.find(b => b.type === type);
  return t ? (active ? t.active : t.color) : "";
}

type Bag = {
  bag_no: number;
  type: BagType;
  weight: number;
};

export default function ChickenReceivePage() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [weighDate, setWeighDate] = useState(getToday());
  const [bags, setBags] = useState<Bag[]>([]);

  // สถานะถุงปัจจุบัน
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [currentType, setCurrentType] = useState<BagType>("chicken");
  const [pendingBag, setPendingBag] = useState(false); // มีถุงรอยืนยัน

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── PIN ──
  const handlePin = (v: string) => {
    const val = v.replace(/\D/g, "");
    setPin(val);
    if (val.length === 4) {
      if (val === RECEIVE_PIN) setLoggedIn(true);
      else { alert("PIN ไม่ถูกต้องครับ"); setPin(""); }
    }
  };

  // ── สแกนตาชั่ง ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");
    setScanning(true);
    try {
      const dataUrl = await resizeImage(file, 1200);
      const res = await fetch("/api/inventory/chicken-receive/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "อ่านไม่ออก");
      setCurrentWeight(String(data.weight));
      setPendingBag(true);
      // เตือนถ้าน้ำหนักดูผิดปกติ
      if (data.weight > 20) {
        setScanError(`⚠️ อ่านได้ ${data.weight} กก. — ดูเยอะผิดปกติ อาจอ่านจุดทศนิยมผิด กรุณาตรวจสอบก่อนกด บันทึก`);
      }
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "อ่านไม่ออกครับ ลองถ่ายใหม่ให้เห็นจอชัดขึ้น");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── บันทึกถุง ──
  const addBag = () => {
    const w = parseFloat(currentWeight);
    if (!w || w <= 0) { alert("กรุณากรอกน้ำหนักก่อนครับ"); return; }
    setBags(prev => [...prev, { bag_no: prev.length + 1, type: currentType, weight: w }]);
    setCurrentWeight("");
    setPendingBag(false);
    setScanError("");
    setCurrentType("chicken");
  };

  const removeBag = (bag_no: number) => {
    setBags(prev => {
      const filtered = prev.filter(b => b.bag_no !== bag_no);
      return filtered.map((b, i) => ({ ...b, bag_no: i + 1 }));
    });
  };

  const toggleType = (bag_no: number) => {
    const order: BagType[] = ["chicken", "nsot", "nom", "kha", "offal"];
    setBags(prev => prev.map(b => {
      if (b.bag_no !== bag_no) return b;
      const idx = order.indexOf(b.type);
      return { ...b, type: order[(idx + 1) % order.length] };
    }));
  };

  // ── คำนวณยอดรวม ──
  const totalByType = (t: BagType) => bags.filter(b => b.type === t).reduce((s, b) => s + b.weight, 0);
  const countByType = (t: BagType) => bags.filter(b => b.type === t).length;
  const totalChicken = BAG_TYPES.filter(t => t.type !== "offal").reduce((s, t) => s + totalByType(t.type), 0);
  const totalOffal = totalByType("offal");
  const chickenBags = bags.filter(b => b.type !== "offal").length;
  const offalBags = countByType("offal");

  // ── Submit ──
  const doSubmit = async () => {
    if (bags.length === 0) { alert("กรุณาบันทึกอย่างน้อย 1 ถุงก่อนครับ"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/chicken-receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weigh_date: weighDate,
          bags,
          total_chicken: totalChicken,
          total_offal: totalOffal,
          bag_count: bags.length,
        }),
      });
      if (res.ok) setDone(true);
      else alert("เกิดข้อผิดพลาดครับ ลองใหม่อีกครั้ง");
    } catch { alert("เกิดข้อผิดพลาดครับ"); }
    finally { setSubmitting(false); }
  };

  // ────────────────────────────────────────────────────────
  // PIN screen
  if (!loggedIn) return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">⚖️</div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">ชั่งน้ำหนักไก่</h1>
        <p className="text-sm text-gray-500 mb-6">กรอก PIN เพื่อเข้าใช้งาน</p>
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={e => handlePin(e.target.value)}
          className="w-full text-center text-3xl tracking-widest border-2 border-gray-200 rounded-xl p-4 focus:outline-none focus:border-orange-400"
          placeholder="••••" autoFocus />
      </div>
    </div>
  );

  // Done screen — screenshot-friendly สำหรับส่ง LINE
  if (done) return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4 gap-4">

      {/* กรอบหลัก — แคปแล้วส่ง LINE */}
      <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-sm">
        <div className="text-center mb-4 border-b pb-3">
          <p className="text-xs text-gray-400 mb-1">ครัวกลาง BBC</p>
          <p className="text-lg font-bold text-gray-800">รับไก่ {fmtDate(weighDate)}</p>
        </div>

        {/* ยอดหลัก */}
        <div className="space-y-2 mb-4">
          {BAG_TYPES.map(t => {
            const total = totalByType(t.type);
            const count = countByType(t.type);
            if (total === 0) return null;
            return (
              <div key={t.type} className="flex justify-between items-baseline">
                <span className="text-gray-600 font-medium">{t.emoji} {t.label}</span>
                <span className="text-lg font-bold text-gray-800">{fmt(total)} กก. <span className="text-sm font-normal text-gray-400">({count} ถุง)</span></span>
              </div>
            );
          })}
          <div className="flex justify-between text-sm text-gray-400 border-t pt-2">
            <span>รวมทั้งหมด</span>
            <span>{bags.length} ถุง</span>
          </div>
        </div>

        {/* รายการแต่ละถุง */}
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="space-y-1">
            {bags.map(b => (
              <div key={b.bag_no} className="flex justify-between text-sm">
                <span className="text-gray-400">
                  {b.bag_no}. {b.type === "chicken" ? "ตอน" : "เครื่องใน"}
                </span>
                <span className="font-medium text-gray-700">{fmt(b.weight)} กก.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ปุ่มอยู่นอกกรอบ — แคปแค่กรอบข้างบน */}
      <button
        onClick={() => { setBags([]); setDone(false); setWeighDate(getToday()); }}
        className="w-full max-w-sm bg-orange-500 text-white rounded-xl py-3 font-semibold"
      >
        บันทึกรอบใหม่
      </button>
    </div>
  );

  // ── Main screen ──
  return (
    <div className="min-h-screen bg-orange-50 pb-12">
      <div className="bg-orange-500 text-white p-4 text-center shadow">
        <h1 className="text-lg font-bold">⚖️ ชั่งน้ำหนักไก่</h1>
        <p className="text-xs opacity-75">ถ่ายรูปตาชั่งทีละถุง</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* วันที่ */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm text-gray-500 block mb-1">วันที่รับของ</label>
          <input type="date" value={weighDate} onChange={e => setWeighDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-gray-800" />
        </div>

        {/* ── ถ่ายรูปตาชั่ง ── */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-gray-700">บันทึกถุงใหม่</p>

          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFileChange} />

          {!pendingBag ? (
            <div className="space-y-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                className="w-full bg-orange-500 text-white rounded-xl py-4 font-semibold flex flex-col items-center gap-1 disabled:opacity-50 active:bg-orange-600"
              >
                <span className="text-3xl">{scanning ? "⏳" : "📷"}</span>
                <span>{scanning ? "กำลังอ่าน..." : "ถ่ายรูปตาชั่ง"}</span>
                <span className="text-xs opacity-75">ถุงที่ {bags.length + 1}</span>
              </button>
              <button
                onClick={() => { setCurrentWeight(""); setPendingBag(true); }}
                className="w-full bg-white border-2 border-orange-300 text-orange-600 rounded-xl py-3 font-semibold text-sm"
              >
                ⌨️ พิมพ์น้ำหนักเอง
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* น้ำหนักที่ AI อ่านได้ */}
              <div>
                <p className="text-xs text-gray-400 mb-1">น้ำหนัก (กก.) — แก้ได้ถ้าอ่านผิด</p>
                <input
                  type="number" inputMode="decimal" value={currentWeight}
                  onChange={e => setCurrentWeight(e.target.value)}
                  className="w-full border-2 border-orange-300 rounded-xl p-3 text-center text-2xl font-bold focus:outline-none focus:border-orange-500"
                  placeholder="0.00"
                />
              </div>

              {/* เลือกประเภท */}
              <div className="grid grid-cols-3 gap-2">
                {BAG_TYPES.map(t => (
                  <button
                    key={t.type}
                    onClick={() => setCurrentType(t.type)}
                    className={`py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1 border-2 transition-all
                      ${currentType === t.type ? t.active : t.color}`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setPendingBag(false); setCurrentWeight(""); setScanError(""); }}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={addBag}
                  className="flex-1 bg-green-500 text-white rounded-xl py-3 font-semibold"
                >
                  ✓ บันทึกถุงนี้
                </button>
              </div>
            </div>
          )}

          {scanError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              ⚠️ {scanError}
              <button onClick={() => fileRef.current?.click()} className="ml-2 underline">ถ่ายใหม่</button>
            </div>
          )}
        </div>

        {/* ── รายการถุงที่บันทึกแล้ว ── */}
        {bags.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-gray-700">ถุงที่บันทึกแล้ว ({bags.length} ถุง)</p>
            </div>
            <div className="space-y-2">
              {bags.map(b => (
                <div key={b.bag_no} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500">ถุง {b.bag_no}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleType(b.bag_no)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium border ${bagStyle(b.type, false)}`}
                    >
                      {bagLabel(b.type)}
                    </button>
                    <span className="font-semibold">{fmt(b.weight)} กก.</span>
                    <button onClick={() => removeBag(b.bag_no)} className="text-red-400 text-xs px-1">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* สรุปย่อ */}
            <div className="border-t mt-3 pt-3 space-y-1 text-sm">
              {BAG_TYPES.map(t => {
                const total = totalByType(t.type);
                if (total === 0) return null;
                return (
                  <div key={t.type} className="flex justify-between font-medium text-gray-700">
                    <span>{t.emoji} {t.label}</span><span>{fmt(total)} กก.</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ปุ่มส่งข้อมูล ── */}
        {bags.length > 0 && (
          <button
            onClick={doSubmit}
            disabled={submitting || pendingBag}
            className="w-full bg-green-500 text-white rounded-xl py-4 font-bold text-lg shadow disabled:opacity-50"
          >
            {submitting ? "กำลังส่ง..." : `✅ ส่งข้อมูลวันนี้ (${bags.length} ถุง)`}
          </button>
        )}

      </div>
    </div>
  );
}

// ─── Resize image ──────────────────────────────────────────────────────────
function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}
