"use client";
import { useState, useRef, useEffect } from "react";

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

type BagType = "chicken" | "offal" | "nsot" | "nom" | "kha" | "blood";

const BAG_TYPES: { type: BagType; label: string; emoji: string; color: string; active: string }[] = [
  { type: "chicken", label: "ตอน",       emoji: "🐔", color: "border-orange-200 text-orange-600 bg-white",  active: "bg-orange-500 text-white border-orange-500" },
  { type: "offal",   label: "เครื่องใน", emoji: "🫀", color: "border-purple-200 text-purple-600 bg-white",  active: "bg-purple-500 text-white border-purple-500" },
  { type: "nsot",    label: "นสต.",      emoji: "🍗", color: "border-yellow-200 text-yellow-600 bg-white",  active: "bg-yellow-500 text-white border-yellow-500" },
  { type: "nom",     label: "มันไก่",    emoji: "🧈", color: "border-blue-200 text-blue-600 bg-white",      active: "bg-blue-500 text-white border-blue-500" },
  { type: "kha",     label: "ขาไก่",     emoji: "🦵", color: "border-green-200 text-green-600 bg-white",    active: "bg-green-500 text-white border-green-500" },
  { type: "blood",   label: "เลือด",     emoji: "🩸", color: "border-red-200 text-red-600 bg-white",        active: "bg-red-500 text-white border-red-500" },
];

const TYPE_ORDER: BagType[] = ["chicken", "nsot", "nom", "kha", "offal", "blood"];

function bagLabel(type: BagType) {
  const t = BAG_TYPES.find(b => b.type === type);
  return t ? `${t.emoji} ${t.label}` : type;
}

function bagStyle(type: BagType, active: boolean) {
  const t = BAG_TYPES.find(b => b.type === type);
  return t ? (active ? t.active : t.color) : "";
}

function bagUnit(type: BagType) { return type === "blood" ? "ก้อน" : "กก."; }
function bagFmt(type: BagType, val: number) {
  return type === "blood" ? String(Math.round(val)) : fmt(val);
}

const WEIGH_TYPES: BagType[] = ["chicken", "offal", "nsot", "nom", "kha"];

type Bag = { bag_no: number; type: BagType; weight: number };

type QueueItem = {
  id: number;
  weight: string;
  type: BagType;
  loading: boolean;
  error: string;
};

export default function ChickenReceivePage() {
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("chicken_receive_auth") === "1";
    return false;
  });
  const [weighDate, setWeighDate] = useState(getToday());
  const [bags, setBags] = useState<Bag[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("chicken_receive_bags");
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [currentType, setCurrentType] = useState<BagType>("chicken");
  const [pendingBag, setPendingBag] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // batch album queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.setItem("chicken_receive_bags", JSON.stringify(bags));
  }, [bags]);

  // ── PIN ──
  const handlePin = (v: string) => {
    const val = v.replace(/\D/g, "");
    setPin(val);
    if (val.length === 4) {
      if (val === RECEIVE_PIN) { setLoggedIn(true); sessionStorage.setItem("chicken_receive_auth", "1"); }
      else { alert("PIN ไม่ถูกต้องครับ"); setPin(""); }
    }
  };

  // ── ถ่ายรูปตาชั่ง (ทีละใบ) ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");
    setCapturedImage(null);
    setScanning(true);
    try {
      const dataUrl = await resizeImage(file, 1200);
      const res = await fetch("/api/inventory/chicken/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "อ่านไม่ออก");
      setCapturedImage(dataUrl);
      setCurrentWeight(String(data.weight));
      setPendingBag(true);
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

  // ── บันทึกรูปลงอัลบั้ม (Web Share API) ──
  const handleSaveImage = async () => {
    if (!capturedImage) return;
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `scale-${Date.now()}.jpg`, { type: "image/jpeg" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = capturedImage;
        a.download = `scale-${Date.now()}.jpg`;
        a.click();
      }
    } catch { /* user cancelled */ }
  };

  // ── โยนรูปจากอัลบั้ม (batch) ──
  const handleAlbumChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBatchLoading(true);

    const newItems: QueueItem[] = files.map((_, i) => ({
      id: Date.now() + i,
      weight: "",
      type: currentType,
      loading: true,
      error: "",
    }));
    setQueue(prev => [...prev, ...newItems]);

    await Promise.all(files.map(async (file, i) => {
      const itemId = newItems[i].id;
      try {
        const dataUrl = await resizeImage(file, 1200);
        const res = await fetch("/api/inventory/chicken/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "อ่านไม่ออก");
        setQueue(prev => prev.map(item =>
          item.id === itemId ? { ...item, weight: String(data.weight), loading: false } : item
        ));
      } catch {
        setQueue(prev => prev.map(item =>
          item.id === itemId ? { ...item, loading: false, error: "อ่านไม่ออก — กรอกเอง" } : item
        ));
      }
    }));

    setBatchLoading(false);
    if (albumRef.current) albumRef.current.value = "";
  };

  const cycleQueueType = (id: number) => {
    setQueue(prev => prev.map(item => {
      if (item.id !== id) return item;
      const idx = TYPE_ORDER.indexOf(item.type);
      return { ...item, type: TYPE_ORDER[(idx + 1) % TYPE_ORDER.length] };
    }));
  };

  const removeQueueItem = (id: number) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const confirmQueue = () => {
    const valid = queue.filter(item => !item.loading && parseFloat(item.weight) > 0);
    if (valid.length === 0) { alert("ยังไม่มีถุงที่พร้อมบันทึกครับ"); return; }
    setBags(prev => {
      const next = [...prev];
      valid.forEach(item => {
        next.push({ bag_no: next.length + 1, type: item.type, weight: parseFloat(item.weight) });
      });
      return next;
    });
    setQueue([]);
  };

  // ── บันทึกถุงเดี่ยว ──
  const addBag = () => {
    const w = parseFloat(currentWeight);
    if (!w || w <= 0) { alert("กรุณากรอกน้ำหนักก่อนครับ"); return; }
    setBags(prev => [...prev, { bag_no: prev.length + 1, type: currentType, weight: w }]);
    setCurrentWeight("");
    setPendingBag(false);
    setScanError("");
    setCapturedImage(null);
  };

  const removeBag = (bag_no: number) => {
    const bag = bags.find(b => b.bag_no === bag_no);
    if (!bag) return;
    if (!confirm(`ลบถุงที่ ${bag_no} (${bagLabel(bag.type)} ${fmt(bag.weight)} กก.) ?`)) return;
    setBags(prev => prev.filter(b => b.bag_no !== bag_no).map((b, i) => ({ ...b, bag_no: i + 1 })));
  };

  const toggleType = (bag_no: number) => {
    setBags(prev => prev.map(b => {
      if (b.bag_no !== bag_no) return b;
      const idx = TYPE_ORDER.indexOf(b.type);
      return { ...b, type: TYPE_ORDER[(idx + 1) % TYPE_ORDER.length] };
    }));
  };

  // ── คำนวณ ──
  const totalByType = (t: BagType) => bags.filter(b => b.type === t).reduce((s, b) => s + b.weight, 0);
  const countByType = (t: BagType) => bags.filter(b => b.type === t).length;
  const totalChicken = WEIGH_TYPES.filter(t => t !== "offal").reduce((s, t) => s + totalByType(t), 0);
  const totalOffal = totalByType("offal");

  // ── Submit ──
  const doSubmit = async () => {
    if (bags.length === 0) { alert("กรุณาบันทึกอย่างน้อย 1 ถุงก่อนครับ"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/chicken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weigh_date: weighDate, bags, total_chicken: totalChicken, total_offal: totalOffal, bag_count: bags.length }),
      });
      if (res.ok) { sessionStorage.removeItem("chicken_receive_bags"); setDone(true); }
      else alert("เกิดข้อผิดพลาดครับ ลองใหม่อีกครั้ง");
    } catch { alert("เกิดข้อผิดพลาดครับ"); }
    finally { setSubmitting(false); }
  };

  // ── PIN screen ──
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

  // ── Done screen ──
  if (done) return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4 gap-4">
      <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-sm">
        <div className="text-center mb-4 border-b pb-3">
          <p className="text-xs text-gray-400 mb-1">ครัวกลาง BBC</p>
          <p className="text-lg font-bold text-gray-800">รับไก่ {fmtDate(weighDate)}</p>
        </div>
        <div className="space-y-2 mb-4">
          {BAG_TYPES.map(t => {
            const total = totalByType(t.type);
            const count = countByType(t.type);
            if (total === 0) return null;
            return (
              <div key={t.type} className="flex justify-between items-baseline">
                <span className="text-gray-600 font-medium">{t.emoji} {t.label}</span>
                <span className="text-lg font-bold text-gray-800">
                  {bagFmt(t.type, total)} {bagUnit(t.type)}{" "}
                  <span className="text-sm font-normal text-gray-400">({count}{t.type === "blood" ? "" : " ถุง"})</span>
                </span>
              </div>
            );
          })}
          <div className="flex justify-between text-sm text-gray-400 border-t pt-2">
            <span>รวมทั้งหมด</span><span>{bags.length} ถุง</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="space-y-1">
            {bags.map(b => (
              <div key={b.bag_no} className="flex justify-between text-sm">
                <span className="text-gray-400">{b.bag_no}. {bagLabel(b.type)}</span>
                <span className="font-medium text-gray-700">{bagFmt(b.type, b.weight)} {bagUnit(b.type)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => { setBags([]); setDone(false); setWeighDate(getToday()); sessionStorage.removeItem("chicken_receive_bags"); }}
        className="w-full max-w-sm bg-orange-500 text-white rounded-xl py-3 font-semibold"
      >
        บันทึกรอบใหม่
      </button>
    </div>
  );

  const activeTab = BAG_TYPES.find(t => t.type === currentType)!;

  // ── Main screen ──
  return (
    <div className="min-h-screen bg-orange-50 pb-12">

      {/* Header */}
      <div className="bg-orange-500 text-white px-4 pt-4 pb-0 shadow">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">⚖️ ชั่งน้ำหนักไก่</h1>
          <input type="date" value={weighDate} onChange={e => setWeighDate(e.target.value)}
            className="text-sm bg-orange-400 text-white rounded-lg px-2 py-1 border border-orange-300 focus:outline-none" />
        </div>
        <div className="flex overflow-x-auto gap-1 pb-0 scrollbar-hide">
          {BAG_TYPES.map(t => {
            const count = countByType(t.type);
            const isActive = currentType === t.type;
            return (
              <button key={t.type}
                onClick={() => { setCurrentType(t.type); setPendingBag(false); setCurrentWeight(""); setScanError(""); setCapturedImage(null); }}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-t-xl text-sm font-semibold transition-all
                  ${isActive ? "bg-white text-gray-800" : "bg-orange-400 text-white opacity-80"}`}
              >
                {t.emoji} {t.label}
                {count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-orange-100 text-orange-600" : "bg-orange-600 text-white"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* ── การ์ดบันทึกถุงเดี่ยว ── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className={`px-4 py-2 text-sm font-medium text-white flex items-center gap-2 ${activeTab.active.split(" ")[0]}`}>
            <span>{activeTab.emoji}</span>
            <span>บันทึกถุง {activeTab.label} — ถุงที่ {bags.filter(b => b.type === currentType).length + 1}</span>
          </div>

          <div className="p-4 space-y-3">
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleFileChange} />
            <input ref={albumRef} type="file" accept="image/*" multiple
              className="hidden" onChange={handleAlbumChange} />

            {!pendingBag ? (
              <div className="space-y-2">
                {currentType === "blood" ? (
                  <button onClick={() => { setCurrentWeight(""); setPendingBag(true); }}
                    className="w-full bg-red-500 text-white rounded-xl py-5 font-semibold flex flex-col items-center gap-1">
                    <span className="text-3xl">🩸</span>
                    <span>กรอกจำนวนก้อน</span>
                  </button>
                ) : (
                  <>
                    <button onClick={() => fileRef.current?.click()} disabled={scanning}
                      className={`w-full text-white rounded-xl py-4 font-semibold flex flex-col items-center gap-1 disabled:opacity-50 active:opacity-80 ${activeTab.active.split(" ")[0]}`}>
                      <span className="text-3xl">{scanning ? "⏳" : "📷"}</span>
                      <span>{scanning ? "กำลังอ่าน..." : "ถ่ายรูปตาชั่ง"}</span>
                    </button>
                    <button onClick={() => albumRef.current?.click()} disabled={batchLoading}
                      className="w-full bg-white border-2 border-orange-300 text-orange-600 rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      <span>🖼️</span>
                      <span>{batchLoading ? "กำลังอ่าน..." : "โยนรูปจากอัลบั้ม (หลายถุง)"}</span>
                    </button>
                    <button onClick={() => { setCurrentWeight(""); setPendingBag(true); }}
                      className="w-full bg-white border-2 border-gray-200 text-gray-600 rounded-xl py-3 font-semibold text-sm">
                      ⌨️ พิมพ์น้ำหนักเอง
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* thumbnail + บันทึกรูป */}
                {capturedImage && (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={capturedImage} alt="scale" className="h-14 w-14 object-cover rounded-lg border border-gray-200 shrink-0" />
                    <button onClick={handleSaveImage}
                      className="flex-1 bg-white border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium active:bg-gray-100">
                      💾 บันทึกรูปลงอัลบั้ม
                    </button>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {currentType === "blood" ? "จำนวน (ก้อน)" : "น้ำหนัก (กก.) — แก้ได้ถ้าอ่านผิด"}
                  </p>
                  <input type="number" inputMode={currentType === "blood" ? "numeric" : "decimal"}
                    value={currentWeight} onChange={e => setCurrentWeight(e.target.value)}
                    className="w-full border-2 border-orange-300 rounded-xl p-3 text-center text-2xl font-bold focus:outline-none focus:border-orange-500"
                    placeholder={currentType === "blood" ? "0" : "0.000"} autoFocus />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setPendingBag(false); setCurrentWeight(""); setScanError(""); setCapturedImage(null); }}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-semibold">
                    ยกเลิก
                  </button>
                  <button onClick={addBag}
                    className="flex-1 bg-green-500 text-white rounded-xl py-3 font-semibold">
                    ✓ บันทึก
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
        </div>

        {/* ── Queue จากอัลบั้ม ── */}
        {queue.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-orange-100 text-orange-700 text-sm font-medium flex items-center justify-between">
              <span>🖼️ รูปจากอัลบั้ม — แตะ badge เพื่อเปลี่ยนประเภท</span>
              <button onClick={() => setQueue([])} className="text-orange-400 text-xs">ล้างทั้งหมด</button>
            </div>
            <div className="divide-y divide-gray-100">
              {queue.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-gray-400 text-xs w-5 shrink-0">{i + 1}.</span>
                  <button onClick={() => cycleQueueType(item.id)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium border shrink-0 ${bagStyle(item.type, false)}`}>
                    {bagLabel(item.type)}
                  </button>
                  {item.loading ? (
                    <span className="flex-1 text-center text-gray-400 text-sm">⏳ กำลังอ่าน...</span>
                  ) : item.error ? (
                    <input type="number" inputMode="decimal" placeholder="กรอกเอง"
                      value={item.weight}
                      onChange={e => setQueue(prev => prev.map(q => q.id === item.id ? { ...q, weight: e.target.value, error: "" } : q))}
                      className="flex-1 border border-red-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none" />
                  ) : (
                    <input type="number" inputMode="decimal"
                      value={item.weight}
                      onChange={e => setQueue(prev => prev.map(q => q.id === item.id ? { ...q, weight: e.target.value } : q))}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:border-orange-400" />
                  )}
                  <span className="text-xs text-gray-400 shrink-0">{bagUnit(item.type)}</span>
                  <button onClick={() => removeQueueItem(item.id)} className="text-red-300 text-xs shrink-0">✕</button>
                </div>
              ))}
            </div>
            <div className="p-3">
              <button onClick={confirmQueue}
                disabled={queue.some(i => i.loading) || queue.every(i => !parseFloat(i.weight))}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold disabled:opacity-40">
                ✓ บันทึกทั้งหมด ({queue.filter(i => !i.loading && parseFloat(i.weight) > 0).length} ถุง)
              </button>
            </div>
          </div>
        )}

        {/* ── รายการถุงทั้งหมด ── */}
        {bags.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">ถุงที่บันทึกแล้ว ({bags.length} ถุง)</p>
            <div className="space-y-1.5">
              {bags.map(b => (
                <div key={b.bag_no} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-400 w-6">{b.bag_no}.</span>
                  <button onClick={() => toggleType(b.bag_no)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium border ${bagStyle(b.type, false)}`}>
                    {bagLabel(b.type)}
                  </button>
                  <span className="font-semibold flex-1 text-right mr-2">{bagFmt(b.type, b.weight)} {bagUnit(b.type)}</span>
                  <button onClick={() => removeBag(b.bag_no)} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 space-y-1 text-sm">
              {BAG_TYPES.map(t => {
                const total = totalByType(t.type);
                if (total === 0) return null;
                return (
                  <div key={t.type} className="flex justify-between font-medium text-gray-700">
                    <span>{t.emoji} {t.label}</span>
                    <span>{bagFmt(t.type, total)} {bagUnit(t.type)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ส่งข้อมูล ── */}
        {bags.length > 0 && (
          <button onClick={doSubmit} disabled={submitting || pendingBag || queue.length > 0}
            className="w-full bg-green-500 text-white rounded-xl py-4 font-bold text-lg shadow disabled:opacity-50">
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
