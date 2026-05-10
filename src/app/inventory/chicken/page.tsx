"use client";
import { useState, useEffect } from "react";

const CHICKEN_PIN = "5678";

function getToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "";
  const s = dateStr.slice(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${parseInt(y) + 543}`;
}

function priceDiff(current: string, last: number) {
  const c = parseFloat(current);
  if (!c || !last) return null;
  const diff = c - last;
  if (Math.abs(diff) < 0.01) return null;
  return diff;
}

type Bill = {
  id: number;
  bill_date: string;
  ton_count: number;
  ton_weight: number;
  ton_price: number;
  ton_total: number;
  nsot_weight: number;
  nsot_price: number;
  nsot_total: number;
  nom_weight: number;
  nom_price: number;
  nom_total: number;
  blood_count: number;
  blood_price: number;
  blood_total: number;
  grand_total: number;
  note: string | null;
};

export default function ChickenBillPage() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [billDate, setBillDate] = useState(getToday());

  // ตอน
  const [tonCount, setTonCount] = useState("");
  const [tonWeight, setTonWeight] = useState("");
  const [tonPrice, setTonPrice] = useState("");

  // นสต.
  const [nsotWeight, setNsotWeight] = useState("");
  const [nsotPrice, setNsotPrice] = useState("");

  // นม (น้ำมันไก่)
  const [nomWeight, setNomWeight] = useState("");
  const [nomPrice, setNomPrice] = useState("");

  // เลือด
  const [bloodCount, setBloodCount] = useState("");
  const [bloodPrice, setBloodPrice] = useState("");

  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<Bill[]>([]);

  // คำนวณยอด
  const tonTotal    = parseFloat(tonWeight  || "0") * parseFloat(tonPrice   || "0");
  const nsotTotal   = parseFloat(nsotWeight || "0") * parseFloat(nsotPrice  || "0");
  const nomTotal    = parseFloat(nomWeight  || "0") * parseFloat(nomPrice   || "0");
  const bloodTotal  = parseFloat(bloodCount || "0") * parseFloat(bloodPrice || "0");
  const grandTotal  = tonTotal + nsotTotal + nomTotal + bloodTotal;

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CHICKEN_PIN) setLoggedIn(true);
      else { alert("PIN ไม่ถูกต้องครับ"); setPin(""); }
    }
  }, [pin]);

  useEffect(() => {
    if (loggedIn) fetchHistory();
  }, [loggedIn]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/inventory/chicken");
      const data = await res.json();
      setHistory(data.bills || []);
    } catch {
      // ignore
    }
  };

  const handleSubmit = () => {
    if (grandTotal === 0) { alert("กรุณากรอกข้อมูลอย่างน้อย 1 รายการครับ"); return; }
    setConfirming(true);
  };

  const doSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/chicken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_date:    billDate,
          ton_count:    parseInt(tonCount   || "0"),
          ton_weight:   parseFloat(tonWeight  || "0"),
          ton_price:    parseFloat(tonPrice   || "0"),
          ton_total:    tonTotal,
          nsot_weight:  parseFloat(nsotWeight || "0"),
          nsot_price:   parseFloat(nsotPrice  || "0"),
          nsot_total:   nsotTotal,
          nom_weight:   parseFloat(nomWeight  || "0"),
          nom_price:    parseFloat(nomPrice   || "0"),
          nom_total:    nomTotal,
          blood_count:  parseInt(bloodCount  || "0"),
          blood_price:  parseFloat(bloodPrice || "0"),
          blood_total:  bloodTotal,
          grand_total:  grandTotal,
          note:         note || null,
        }),
      });
      if (res.ok) {
        setConfirming(false);
        setDone(true);
        await fetchHistory();
      } else {
        alert("เกิดข้อผิดพลาดครับ กรุณาลองใหม่");
      }
    } catch {
      alert("เกิดข้อผิดพลาดครับ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTonCount(""); setTonWeight(""); setTonPrice("");
    setNsotWeight(""); setNsotPrice("");
    setNomWeight(""); setNomPrice("");
    setBloodCount(""); setBloodPrice("");
    setNote("");
    setBillDate(getToday());
    setDone(false);
  };

  const lastBill = history[0] ?? null;

  // ─── PIN ───────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-3">🐔</div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">บิลรับไก่</h1>
          <p className="text-sm text-gray-500 mb-6">กรอก PIN เพื่อเข้าใช้งาน</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full text-center text-3xl tracking-widest border-2 border-gray-200 rounded-xl p-4 focus:outline-none focus:border-amber-400"
            placeholder="••••"
            autoFocus
          />
        </div>
      </div>
    );
  }

  // ─── สำเร็จ ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">บันทึกสำเร็จ</h2>
          <p className="text-gray-500 mb-2">บิลไก่วันที่ {fmtDate(billDate)}</p>
          <p className="text-3xl font-bold text-amber-600 mb-6">฿{fmt(grandTotal)}</p>
          <button onClick={resetForm} className="w-full bg-amber-500 text-white rounded-xl py-3 font-semibold">
            บันทึกบิลใหม่
          </button>
        </div>
      </div>
    );
  }

  // ─── ยืนยัน ────────────────────────────────────────────────────────────
  if (confirming) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">ยืนยันบันทึกบิล</h2>
          <p className="text-sm text-gray-400 text-center mb-4">วันที่ {fmtDate(billDate)} · ซัพไก่</p>

          <div className="space-y-2 mb-4 text-sm">
            {tonTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">ตอน {tonCount} ตัว · {tonWeight} กก. × {tonPrice} บาท</span>
                <span className="font-semibold">฿{fmt(tonTotal)}</span>
              </div>
            )}
            {nsotTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">นสต. {nsotWeight} กก. × {nsotPrice} บาท</span>
                <span className="font-semibold">฿{fmt(nsotTotal)}</span>
              </div>
            )}
            {nomTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">นม {nomWeight} กก. × {nomPrice} บาท</span>
                <span className="font-semibold">฿{fmt(nomTotal)}</span>
              </div>
            )}
            {bloodTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">เลือด {bloodCount} ก้อน × {bloodPrice} บาท</span>
                <span className="font-semibold">฿{fmt(bloodTotal)}</span>
              </div>
            )}
            {note ? (
              <p className="text-gray-400 text-xs">หมายเหตุ: {note}</p>
            ) : null}
          </div>

          <div className="border-t pt-3 flex justify-between font-bold text-lg mb-6">
            <span>รวมทั้งหมด</span>
            <span className="text-amber-600">฿{fmt(grandTotal)}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setConfirming(false)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold">
              แก้ไข
            </button>
            <button onClick={doSubmit} disabled={loading}
              className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50">
              {loading ? "กำลังบันทึก..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ฟอร์มหลัก ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 pb-10">
      {/* Header */}
      <div className="bg-amber-500 text-white p-4 text-center shadow">
        <h1 className="text-lg font-bold">🐔 บิลรับไก่</h1>
        <p className="text-xs opacity-75">ซัพไก่</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* วันที่ */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm text-gray-500 block mb-1">วันที่รับของ</label>
          <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-gray-800" />
        </div>

        {/* ตอน */}
        <ItemCard
          title="ตอน"
          lastPrice={lastBill ? Number(lastBill.ton_price) : 0}
          lastPriceLabel="บาท/กก."
          total={tonTotal}
        >
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="จำนวน (ตัว)" value={tonCount} onChange={setTonCount} diff={null} />
            <NumberField label="น้ำหนัก (กก.)" value={tonWeight} onChange={setTonWeight} diff={null} />
            <NumberField
              label="ราคา/กก."
              value={tonPrice}
              onChange={setTonPrice}
              diff={lastBill ? priceDiff(tonPrice, Number(lastBill.ton_price)) : null}
            />
          </div>
        </ItemCard>

        {/* นสต. */}
        <ItemCard
          title="นสต."
          lastPrice={lastBill ? Number(lastBill.nsot_price) : 0}
          lastPriceLabel="บาท/กก."
          total={nsotTotal}
        >
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="น้ำหนัก (กก.)" value={nsotWeight} onChange={setNsotWeight} diff={null} />
            <NumberField
              label="ราคา/กก."
              value={nsotPrice}
              onChange={setNsotPrice}
              diff={lastBill ? priceDiff(nsotPrice, Number(lastBill.nsot_price)) : null}
            />
          </div>
        </ItemCard>

        {/* นม */}
        <ItemCard
          title="นม"
          subtitle="น้ำมันไก่"
          lastPrice={lastBill ? Number(lastBill.nom_price) : 0}
          lastPriceLabel="บาท/กก."
          total={nomTotal}
        >
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="น้ำหนัก (กก.)" value={nomWeight} onChange={setNomWeight} diff={null} />
            <NumberField
              label="ราคา/กก."
              value={nomPrice}
              onChange={setNomPrice}
              diff={lastBill ? priceDiff(nomPrice, Number(lastBill.nom_price)) : null}
            />
          </div>
        </ItemCard>

        {/* เลือด */}
        <ItemCard
          title="เลือด"
          lastPrice={lastBill ? Number(lastBill.blood_price) : 0}
          lastPriceLabel="บาท/ก้อน"
          total={bloodTotal}
        >
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="จำนวน (ก้อน)" value={bloodCount} onChange={setBloodCount} diff={null} />
            <NumberField
              label="ราคา/ก้อน"
              value={bloodPrice}
              onChange={setBloodPrice}
              diff={lastBill ? priceDiff(bloodPrice, Number(lastBill.blood_price)) : null}
            />
          </div>
        </ItemCard>

        {/* หมายเหตุ */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm text-gray-500 block mb-1">หมายเหตุ (ถ้ามี)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
            placeholder="เช่น ส่งช้า, ของขาด..." />
        </div>

        {/* ยอดรวม + ปุ่มบันทึก */}
        <div className="bg-amber-500 rounded-xl p-4 shadow-sm text-white">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-lg">ยอดรวมทั้งหมด</span>
            <span className="text-2xl font-bold">฿{fmt(grandTotal)}</span>
          </div>
          <button onClick={handleSubmit} disabled={grandTotal === 0}
            className="w-full bg-white text-amber-600 rounded-xl py-3 font-bold text-lg disabled:opacity-40">
            บันทึกบิล
          </button>
        </div>

        {/* ประวัติ */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">ประวัติล่าสุด</h3>
            <div className="space-y-3">
              {history.slice(0, 5).map(bill => (
                <div key={bill.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">{fmtDate(String(bill.bill_date).slice(0, 10))}</span>
                    <span className="font-bold text-amber-600">฿{fmt(Number(bill.grand_total))}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 space-x-3">
                    {Number(bill.ton_count) > 0 && (
                      <span>ตอน {bill.ton_count} ตัว @{fmt(Number(bill.ton_price))}/กก.</span>
                    )}
                    {Number(bill.nsot_price) > 0 && (
                      <span>นสต. @{fmt(Number(bill.nsot_price))}/กก.</span>
                    )}
                    {Number(bill.blood_count) > 0 && (
                      <span>เลือด {bill.blood_count} ก้อน</span>
                    )}
                  </div>
                  {bill.note && <p className="text-xs text-gray-400 mt-1">📝 {bill.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ItemCard({
  title, subtitle, lastPrice, lastPriceLabel, total, children,
}: {
  title: string;
  subtitle?: string;
  lastPrice: number;
  lastPriceLabel: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="font-semibold text-gray-800">{title}</span>
          {subtitle && <span className="text-xs text-gray-400 ml-1">({subtitle})</span>}
        </div>
        {lastPrice > 0 && (
          <span className="text-xs text-gray-400">ครั้งก่อน: {lastPrice.toLocaleString("th-TH")} {lastPriceLabel}</span>
        )}
      </div>
      {children}
      {total > 0 && (
        <div className="mt-2 text-right text-sm font-semibold text-amber-600">
          ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}

function NumberField({
  label, value, onChange, diff,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  diff: number | null;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg p-2 text-center text-gray-800 focus:outline-none focus:border-amber-400"
        placeholder="0"
      />
      {diff !== null && (
        <p className={`text-xs text-center mt-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
          {diff > 0 ? `▲ +${diff.toFixed(2)}` : `▼ ${diff.toFixed(2)}`}
        </p>
      )}
    </div>
  );
}
