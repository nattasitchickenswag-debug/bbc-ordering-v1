"use client";
import { useState, useEffect, useRef } from "react";

const CHICKEN_PIN = "2569";

function getToday() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  const d = String(s).slice(0, 10);
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${parseInt(y) + 543}`;
}

type ScannedData = {
  ton_count?: number; ton_weight?: number; ton_price?: number;
  nsot_weight?: number; nsot_price?: number;
  nom_weight?: number; nom_price?: number;
  kha_weight?: number; kha_price?: number;
  blood_count?: number; blood_price?: number;
};

type Bill = {
  id: number; bill_date: string;
  ton_count: number; ton_weight: number; ton_price: number; ton_total: number;
  nsot_weight: number; nsot_price: number; nsot_total: number;
  nom_weight: number; nom_price: number; nom_total: number;
  kha_weight: number; kha_price: number; kha_total: number;
  blood_count: number; blood_price: number; blood_total: number;
  grand_total: number; note: string | null;
};

type WeighSession = {
  id: number;
  weigh_date: string;
  total_chicken: number;
  total_offal: number;
  bag_count: number;
};

type Fields = {
  tonCount: string; tonWeight: string; tonPrice: string;
  nsotWeight: string; nsotPrice: string;
  nomWeight: string; nomPrice: string;
  khaWeight: string; khaPrice: string;
  bloodCount: string; bloodPrice: string;
};

const EMPTY: Fields = {
  tonCount: "", tonWeight: "", tonPrice: "",
  nsotWeight: "", nsotPrice: "",
  nomWeight: "", nomPrice: "",
  khaWeight: "", khaPrice: "",
  bloodCount: "", bloodPrice: "",
};

export default function ChickenBillPage() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [billDate, setBillDate] = useState(getToday());
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<Bill[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [weighSession, setWeighSession] = useState<WeighSession | null>(null);

  // AI scan
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Voice
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const set = (k: keyof Fields, v: string) => setFields(f => ({ ...f, [k]: v }));

  // คำนวณ
  const tonTotal   = +fields.tonWeight   * +fields.tonPrice;
  const nsotTotal  = +fields.nsotWeight  * +fields.nsotPrice;
  const nomTotal   = +fields.nomWeight   * +fields.nomPrice;
  const khaTotal   = +fields.khaWeight   * +fields.khaPrice;
  const bloodTotal = +fields.bloodCount  * +fields.bloodPrice;
  const grandTotal = tonTotal + nsotTotal + nomTotal + khaTotal + bloodTotal;

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CHICKEN_PIN) setLoggedIn(true);
      else { alert("PIN ไม่ถูกต้องครับ"); setPin(""); }
    }
  }, [pin]);

  useEffect(() => { if (loggedIn) fetchHistory(); }, [loggedIn]);

  const fetchWeighSession = async (date: string) => {
    try {
      const res = await fetch(`/api/inventory/chicken-receive?date=${date}`);
      const data = await res.json();
      setWeighSession(data.session || null);
    } catch { /* ignore */ }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/inventory/chicken");
      const data = await res.json();
      const bills: Bill[] = data.bills || [];
      setHistory(bills);
      // ล็อคราคาจากบิลล่าสุด
      if (bills.length > 0) {
        const last = bills[0];
        setFields(f => ({
          ...f,
          tonPrice:   last.ton_price   > 0 ? String(last.ton_price)   : f.tonPrice,
          nsotPrice:  last.nsot_price  > 0 ? String(last.nsot_price)  : f.nsotPrice,
          nomPrice:   last.nom_price   > 0 ? String(last.nom_price)   : f.nomPrice,
          khaPrice:   last.kha_price   > 0 ? String(last.kha_price)   : f.khaPrice,
          bloodPrice: last.blood_price > 0 ? String(last.blood_price) : f.bloodPrice,
        }));
      }
    } catch { /* ignore */ }
  };

  // ── Scan รูป ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");
    setScanning(true);
    try {
      // resize ก่อนส่ง
      const dataUrl = await resizeImage(file, 1200);
      const res = await fetch("/api/inventory/chicken/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "image", image: dataUrl }),
      });
      if (!res.ok) throw new Error("scan failed");
      const data: ScannedData = await res.json();
      applyScanned(data);
    } catch {
      setScanError("อ่านไม่ออกครับ ลองใหม่หรือกรอกเองได้เลย");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Voice ─────────────────────────────────────────────────────────────
  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { alert("เบราว์เซอร์ไม่รองรับการพูด กรุณาใช้ Chrome ครับ"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = "th-TH";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      setScanning(true);
      setScanError("");
      try {
        const res = await fetch("/api/inventory/chicken/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "voice", text }),
        });
        if (!res.ok) throw new Error();
        const data: ScannedData = await res.json();
        applyScanned(data);
      } catch {
        setScanError("แปลงเสียงไม่สำเร็จครับ ลองใหม่ได้เลย");
      } finally {
        setScanning(false);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript("");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ── Apply scanned data ────────────────────────────────────────────────
  const applyScanned = (d: ScannedData) => {
    setFields(f => ({
      tonCount:   d.ton_count   ? String(d.ton_count)   : f.tonCount,
      tonWeight:  d.ton_weight  ? String(d.ton_weight)  : f.tonWeight,
      tonPrice:   d.ton_price   ? String(d.ton_price)   : f.tonPrice,
      nsotWeight: d.nsot_weight ? String(d.nsot_weight) : f.nsotWeight,
      nsotPrice:  d.nsot_price  ? String(d.nsot_price)  : f.nsotPrice,
      nomWeight:  d.nom_weight  ? String(d.nom_weight)  : f.nomWeight,
      nomPrice:   d.nom_price   ? String(d.nom_price)   : f.nomPrice,
      khaWeight:  d.kha_weight  ? String(d.kha_weight)  : f.khaWeight,
      khaPrice:   d.kha_price   ? String(d.kha_price)   : f.khaPrice,
      bloodCount: d.blood_count ? String(d.blood_count) : f.bloodCount,
      bloodPrice: d.blood_price ? String(d.blood_price) : f.bloodPrice,
    }));
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const doSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/chicken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_date:   billDate,
          ton_count:   +fields.tonCount,
          ton_weight:  +fields.tonWeight,
          ton_price:   +fields.tonPrice,
          ton_total:   tonTotal,
          nsot_weight: +fields.nsotWeight,
          nsot_price:  +fields.nsotPrice,
          nsot_total:  nsotTotal,
          nom_weight:  +fields.nomWeight,
          nom_price:   +fields.nomPrice,
          nom_total:   nomTotal,
          kha_weight:  +fields.khaWeight,
          kha_price:   +fields.khaPrice,
          kha_total:   khaTotal,
          blood_count: +fields.bloodCount,
          blood_price: +fields.bloodPrice,
          blood_total: bloodTotal,
          grand_total: grandTotal,
          note: note || null,
        }),
      });
      if (res.ok) { setConfirming(false); setDone(true); await fetchHistory(); await fetchWeighSession(billDate); }
      else alert("เกิดข้อผิดพลาดครับ");
    } catch { alert("เกิดข้อผิดพลาดครับ"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFields(EMPTY);
    setNote("");
    setTranscript("");
    setScanError("");
    setBillDate(getToday());
    setDone(false);
    // ล็อคราคาใหม่จากประวัติล่าสุด
    if (history.length > 0) {
      const last = history[0];
      setFields(f => ({
        ...f,
        tonPrice:   last.ton_price   > 0 ? String(last.ton_price)   : f.tonPrice,
        nsotPrice:  last.nsot_price  > 0 ? String(last.nsot_price)  : f.nsotPrice,
        nomPrice:   last.nom_price   > 0 ? String(last.nom_price)   : f.nomPrice,
        khaPrice:   last.kha_price   > 0 ? String(last.kha_price)   : f.khaPrice,
        bloodPrice: last.blood_price > 0 ? String(last.blood_price) : f.bloodPrice,
      }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // PIN
  if (!loggedIn) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🐔</div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">บิลรับไก่</h1>
        <p className="text-sm text-gray-500 mb-6">กรอก PIN เพื่อเข้าใช้งาน</p>
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full text-center text-3xl tracking-widest border-2 border-gray-200 rounded-xl p-4 focus:outline-none focus:border-amber-400"
          placeholder="••••" autoFocus />
      </div>
    </div>
  );

  // Done
  if (done) {
    const billChicken = +fields.tonWeight + +fields.nsotWeight + +fields.nomWeight + +fields.khaWeight;
    const actualChicken = weighSession ? Number(weighSession.total_chicken) : null;
    const diffChicken = actualChicken !== null ? billChicken - actualChicken : null;
    const isAlert = diffChicken !== null && Math.abs(diffChicken) > 5;
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">บันทึกสำเร็จ</h2>
          <p className="text-gray-500 mb-2">{fmtDate(billDate)} · ซัพไก่</p>
          <p className="text-3xl font-bold text-amber-600 mb-4">฿{fmt(grandTotal)}</p>

          {/* Cross-check กับการชั่งน้ำหนัก */}
          {weighSession ? (
            <div className={`rounded-xl p-4 mb-5 text-left text-sm ${isAlert ? "bg-red-50 border border-red-300" : "bg-green-50 border border-green-200"}`}>
              <p className="font-semibold mb-2 text-gray-700">📊 เปรียบเทียบกับการชั่ง</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">ไก่จากบิล</span>
                  <span className="font-medium">{fmt(billChicken)} กก.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ไก่ที่ชั่งจริง</span>
                  <span className="font-medium">{fmt(actualChicken!)} กก.</span>
                </div>
                <div className={`flex justify-between font-semibold pt-1 border-t ${isAlert ? "text-red-600" : "text-green-700"}`}>
                  <span>ส่วนต่างไก่</span>
                  <span>{diffChicken! >= 0 ? "+" : ""}{fmt(diffChicken!)} กก. {isAlert ? "⚠️" : "✓"}</span>
                </div>
                <div className="flex justify-between pt-1 border-t text-gray-500">
                  <span>เครื่องในที่ชั่ง</span>
                  <span className="font-medium">{fmt(Number(weighSession.total_offal))} กก.</span>
                </div>
              </div>
              {isAlert && <p className="text-red-600 text-xs mt-2 font-medium">⚠️ น้ำหนักไก่ต่างจากบิลเกิน 5 กก. กรุณาตรวจสอบ</p>}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm text-gray-400 text-left">
              📊 ยังไม่มีข้อมูลการชั่งน้ำหนักวันนี้
            </div>
          )}

          <button onClick={resetForm} className="w-full bg-amber-500 text-white rounded-xl py-3 font-semibold">
            บันทึกบิลใหม่
          </button>
        </div>
      </div>
    );
  }

  // Confirm
  if (confirming) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-center mb-1">ยืนยันบันทึกบิล</h2>
        <p className="text-sm text-gray-400 text-center mb-4">{fmtDate(billDate)} · ซัพไก่</p>
        <div className="space-y-2 mb-4 text-sm">
          {tonTotal    > 0 && <Row label={`ตอน ${fields.tonCount} ตัว · ${fields.tonWeight} กก. × ${fields.tonPrice}`} val={tonTotal} />}
          {nsotTotal   > 0 && <Row label={`นสต. ${fields.nsotWeight} กก. × ${fields.nsotPrice}`} val={nsotTotal} />}
          {nomTotal    > 0 && <Row label={`นม ${fields.nomWeight} กก. × ${fields.nomPrice}`} val={nomTotal} />}
          {khaTotal    > 0 && <Row label={`ขาไก่ ${fields.khaWeight} กก. × ${fields.khaPrice}`} val={khaTotal} />}
          {bloodTotal  > 0 && <Row label={`เลือด ${fields.bloodCount} ก้อน × ${fields.bloodPrice}`} val={bloodTotal} />}
          {note        &&    <p className="text-gray-400 text-xs">📝 {note}</p>}
        </div>
        <div className="border-t pt-3 flex justify-between font-bold text-lg mb-5">
          <span>รวมทั้งหมด</span>
          <span className="text-amber-600">฿{fmt(grandTotal)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setConfirming(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold">แก้ไข</button>
          <button onClick={doSubmit} disabled={loading} className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50">
            {loading ? "กำลังบันทึก..." : "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Main form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 pb-12">
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

        {/* ── ปุ่ม สแกน / พูด ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* สแกนบิล */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="w-full bg-white border-2 border-amber-400 text-amber-600 rounded-xl py-4 font-semibold flex flex-col items-center gap-1 disabled:opacity-50 active:bg-amber-50"
            >
              <span className="text-2xl">📷</span>
              <span className="text-sm">{scanning ? "กำลังอ่าน..." : "สแกนบิล"}</span>
            </button>
          </div>

          {/* พูด */}
          <button
            onClick={listening ? stopListening : startListening}
            disabled={scanning}
            className={`w-full border-2 rounded-xl py-4 font-semibold flex flex-col items-center gap-1 disabled:opacity-50 active:scale-95 transition-all
              ${listening ? "bg-red-500 border-red-500 text-white animate-pulse" : "bg-white border-amber-400 text-amber-600"}`}
          >
            <span className="text-2xl">{listening ? "⏹" : "🎤"}</span>
            <span className="text-sm">{listening ? "กำลังฟัง..." : "พูด"}</span>
          </button>
        </div>

        {/* แสดง transcript */}
        {transcript && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-gray-600">
            🗣 "{transcript}"
          </div>
        )}

        {/* Error */}
        {scanError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            ⚠️ {scanError}
          </div>
        )}

        {/* ── ตารางกรอก ── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 font-medium grid grid-cols-12 gap-1">
            <span className="col-span-3">รายการ</span>
            <span className="col-span-2 text-center">จำนวน/กก.</span>
            <span className="col-span-2 text-center">ตัว (ถ้ามี)</span>
            <span className="col-span-3 text-center">ราคา/หน่วย 🔒</span>
            <span className="col-span-2 text-right">รวม</span>
          </div>

          <ItemRow
            label="ตอน"
            qty={fields.tonWeight} onQty={v => set("tonWeight", v)} qtyPlaceholder="กก."
            count={fields.tonCount} onCount={v => set("tonCount", v)} countPlaceholder="ตัว"
            price={fields.tonPrice} onPrice={v => set("tonPrice", v)} priceUnit="บาท/กก."
            total={tonTotal}
          />
          <ItemRow
            label="นสต."
            qty={fields.nsotWeight} onQty={v => set("nsotWeight", v)} qtyPlaceholder="กก."
            price={fields.nsotPrice} onPrice={v => set("nsotPrice", v)} priceUnit="บาท/กก."
            total={nsotTotal}
          />
          <ItemRow
            label="นม"
            qty={fields.nomWeight} onQty={v => set("nomWeight", v)} qtyPlaceholder="กก."
            price={fields.nomPrice} onPrice={v => set("nomPrice", v)} priceUnit="บาท/กก."
            total={nomTotal}
          />
          <ItemRow
            label="ขาไก่"
            qty={fields.khaWeight} onQty={v => set("khaWeight", v)} qtyPlaceholder="กก."
            price={fields.khaPrice} onPrice={v => set("khaPrice", v)} priceUnit="บาท/กก."
            total={khaTotal}
          />
          <ItemRow
            label="เลือด"
            qty={fields.bloodCount} onQty={v => set("bloodCount", v)} qtyPlaceholder="ก้อน"
            price={fields.bloodPrice} onPrice={v => set("bloodPrice", v)} priceUnit="บาท/ก้อน"
            total={bloodTotal}
            last
          />
        </div>

        {/* หมายเหตุ */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm text-gray-500 block mb-1">หมายเหตุ (ถ้ามี)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
            placeholder="เช่น ส่งช้า, ของขาด..." />
        </div>

        {/* ยอดรวม */}
        <div className="bg-amber-500 rounded-xl p-4 text-white shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-lg">ยอดรวมทั้งหมด</span>
            <span className="text-2xl font-bold">฿{fmt(grandTotal)}</span>
          </div>
          <button onClick={() => { if (grandTotal === 0) { alert("กรุณากรอกข้อมูลอย่างน้อย 1 รายการครับ"); return; } setConfirming(true); }}
            disabled={grandTotal === 0}
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
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{fmtDate(String(bill.bill_date).slice(0, 10))}</span>
                    <span className="font-bold text-amber-600">฿{fmt(Number(bill.grand_total))}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3">
                    {Number(bill.ton_count) > 0 && <span>ตอน {bill.ton_count} ตัว @{fmt(Number(bill.ton_price))}/กก.</span>}
                    {Number(bill.nsot_price) > 0 && <span>นสต. @{fmt(Number(bill.nsot_price))}/กก.</span>}
                    {Number(bill.kha_price) > 0 && <span>ขาไก่ @{fmt(Number(bill.kha_price))}/กก.</span>}
                    {Number(bill.blood_count) > 0 && <span>เลือด {bill.blood_count} ก้อน</span>}
                  </div>
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

function Row({ label, val }: { label: string; val: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold">฿{val.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

function ItemRow({
  label, qty, onQty, qtyPlaceholder,
  count, onCount, countPlaceholder,
  price, onPrice, priceUnit, total, last,
}: {
  label: string;
  qty: string; onQty: (v: string) => void; qtyPlaceholder: string;
  count?: string; onCount?: (v: string) => void; countPlaceholder?: string;
  price: string; onPrice: (v: string) => void; priceUnit: string;
  total: number; last?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${!last ? "border-b border-gray-100" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700 w-12 shrink-0">{label}</span>
        {total > 0 && (
          <span className="ml-auto text-sm font-semibold text-amber-600">
            ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">{qtyPlaceholder}</p>
          <input type="number" inputMode="decimal" value={qty} onChange={e => onQty(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-center text-sm focus:outline-none focus:border-amber-400"
            placeholder="0" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">{countPlaceholder || "—"}</p>
          {count !== undefined && onCount ? (
            <input type="number" inputMode="numeric" value={count} onChange={e => onCount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-center text-sm focus:outline-none focus:border-amber-400"
              placeholder="0" />
          ) : (
            <div className="w-full border border-gray-100 rounded-lg p-2 bg-gray-50" />
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">🔒 {priceUnit}</p>
          <input type="number" inputMode="decimal" value={price} onChange={e => onPrice(e.target.value)}
            className="w-full border border-amber-200 rounded-lg p-2 text-center text-sm bg-amber-50 focus:outline-none focus:border-amber-400"
            placeholder="0" />
        </div>
      </div>
    </div>
  );
}

// ─── Resize image ─────────────────────────────────────────────────────────

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
