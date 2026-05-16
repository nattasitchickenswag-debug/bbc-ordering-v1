"use client";
import { useState } from "react";

const PIN = "2569";

const ITEM_CONFIGS = [
  { type: "chicken", label: "ไก่ตอน",     emoji: "🐔", kind: "chicken" },
  { type: "offal",   label: "เครื่องในไก่", emoji: "🫀", kind: "kg"      },
  { type: "nsot",    label: "น่องสะโพก",   emoji: "🍗", kind: "kg"      },
  { type: "nom",     label: "มันไก่",       emoji: "🧈", kind: "kg"      },
  { type: "blood",   label: "เลือด",        emoji: "🩸", kind: "blood"   },
  { type: "kha",     label: "ขาไก่",        emoji: "🦵", kind: "kg"      },
  { type: "other",   label: "อื่นๆ",        emoji: "📦", kind: "other"   },
] as const;

type BagType = "chicken" | "offal" | "nsot" | "nom" | "blood" | "kha" | "other";

interface ItemState {
  enabled:         boolean;
  qty_heads:       string;
  weight_kg:       string;
  price_per_kg:    string;
  qty_pieces:      string;
  price_per_piece: string;
  name:            string;
}

type Items = Record<BagType, ItemState>;

const defaultItem = (): ItemState => ({
  enabled: false, qty_heads: "", weight_kg: "",
  price_per_kg: "", qty_pieces: "", price_per_piece: "", name: "",
});

function calcTotal(type: string, item: ItemState): number {
  if (type === "blood") {
    return (parseFloat(item.qty_pieces) || 0) * (parseFloat(item.price_per_piece) || 0);
  }
  return (parseFloat(item.weight_kg) || 0) * (parseFloat(item.price_per_kg) || 0);
}

function getBangkokDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function getWeighedByType(session: { bags?: Array<{ type: string; weight: number }> } | null): Record<string, number> {
  if (!session?.bags) return {};
  const result: Record<string, number> = {};
  for (const bag of session.bags) {
    result[bag.type] = (result[bag.type] || 0) + bag.weight;
  }
  return result;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function ChickenBillPage() {
  const [pin, setPin]           = useState("");
  const [authed, setAuthed]     = useState(false);
  const [pinError, setPinError] = useState(false);

  const [billDate, setBillDate] = useState(getBangkokDate());
  const [items, setItems]       = useState<Items>({
    chicken: defaultItem(), offal: defaultItem(), nsot: defaultItem(),
    nom: defaultItem(), blood: defaultItem(), kha: defaultItem(), other: defaultItem(),
  });

  const [submitting, setSubmitting]         = useState(false);
  const [done, setDone]                     = useState(false);
  const [weighSession, setWeighSession]     = useState<{ bags?: Array<{ type: string; weight: number }> } | null>(null);
  const [submitError, setSubmitError]       = useState("");

  /* ── PIN ── */
  const handlePin = () => {
    if (pin === PIN) { setAuthed(true); }
    else { setPinError(true); setPin(""); }
  };

  /* ── update item field ── */
  const updateItem = (type: BagType, field: keyof ItemState, value: string | boolean) =>
    setItems(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));

  /* ── total ── */
  const totalBill = ITEM_CONFIGS.reduce((sum, cfg) => {
    const item = items[cfg.type as BagType];
    return item.enabled ? sum + calcTotal(cfg.type, item) : sum;
  }, 0);

  /* ── submit ── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");

    const enabledItems = ITEM_CONFIGS
      .filter(cfg => items[cfg.type as BagType].enabled)
      .map(cfg => {
        const item  = items[cfg.type as BagType];
        const t     = cfg.type;
        const total = calcTotal(t, item);
        if (t === "blood")   return { type: t, qty_pieces: parseFloat(item.qty_pieces) || 0, price_per_piece: parseFloat(item.price_per_piece) || 0, total };
        if (t === "chicken") return { type: t, qty_heads: parseFloat(item.qty_heads) || 0, weight_kg: parseFloat(item.weight_kg) || 0, price_per_kg: parseFloat(item.price_per_kg) || 0, total };
        if (t === "other")   return { type: t, name: item.name, weight_kg: parseFloat(item.weight_kg) || 0, price_per_kg: parseFloat(item.price_per_kg) || 0, total };
        return { type: t, weight_kg: parseFloat(item.weight_kg) || 0, price_per_kg: parseFloat(item.price_per_kg) || 0, total };
      });

    try {
      const res  = await fetch("/api/inventory/bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill_date: billDate, items: enabledItems, total_amount: totalBill }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
      setWeighSession(data.weigh_session);
      setDone(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDone(false);
    setWeighSession(null);
    setItems({
      chicken: defaultItem(), offal: defaultItem(), nsot: defaultItem(),
      nom: defaultItem(), blood: defaultItem(), kha: defaultItem(), other: defaultItem(),
    });
    setBillDate(getBangkokDate());
  };

  /* ══════════════════════════════════════
     PIN screen
  ══════════════════════════════════════ */
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🧾</div>
            <h1 className="text-xl font-bold text-gray-800">บันทึกบิลไก่</h1>
            <p className="text-sm text-gray-500">กรอก PIN เพื่อเข้าใช้งาน</p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === "Enter" && handlePin()}
            className="w-full border rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="••••"
          />
          {pinError && <p className="text-red-500 text-sm text-center">PIN ไม่ถูกต้อง</p>}
          <button
            onClick={handlePin}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-semibold"
          >
            เข้าใช้งาน
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════
     Done / comparison screen
  ══════════════════════════════════════ */
  if (done) {
    const weighedByType  = getWeighedByType(weighSession);
    const enabledItems   = ITEM_CONFIGS.filter(cfg => items[cfg.type as BagType].enabled);
    const comparableTypes = enabledItems.filter(cfg => cfg.type !== "other");

    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-1">✅</div>
            <h2 className="text-lg font-bold text-gray-800">บันทึกบิลสำเร็จ</h2>
            <p className="text-sm text-gray-500">{formatDate(billDate)}</p>
          </div>

          {/* Comparison */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">เปรียบเทียบน้ำหนัก</h3>

            {!weighSession ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
                ⚠️ ยังไม่มีข้อมูลชั่งน้ำหนักสำหรับวันนี้ — เปรียบเทียบได้หลังจากคนรับไก่บันทึกการชั่ง
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-2">รายการ</th>
                      <th className="text-right py-2">บิลซัพ</th>
                      <th className="text-right py-2">ชั่งจริง</th>
                      <th className="text-right py-2">ส่วนต่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparableTypes.map(cfg => {
                      const item      = items[cfg.type as BagType];
                      const isBlood   = cfg.type === "blood";
                      const unit      = isBlood ? "ก้อน" : "กก.";
                      const billVal   = isBlood
                        ? (parseFloat(item.qty_pieces) || 0)
                        : (parseFloat(item.weight_kg) || 0);
                      const weighVal  = weighedByType[cfg.type] || 0;
                      const diff      = billVal - weighVal;
                      const noData    = weighVal === 0 && billVal > 0;
                      const diffColor = noData
                        ? "text-gray-400"
                        : Math.abs(diff) < 0.05
                          ? "text-green-600"
                          : diff > 0
                            ? "text-red-500"
                            : "text-blue-500";

                      return (
                        <tr key={cfg.type} className="border-b last:border-0">
                          <td className="py-2">{cfg.emoji} {cfg.label}</td>
                          <td className="text-right py-2">
                            {billVal.toFixed(isBlood ? 0 : 2)} {unit}
                          </td>
                          <td className="text-right py-2 text-gray-500">
                            {noData ? "—" : `${weighVal.toFixed(isBlood ? 0 : 2)} ${unit}`}
                          </td>
                          <td className={`text-right py-2 font-semibold ${diffColor}`}>
                            {noData ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(isBlood ? 0 : 2)} ${unit}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="font-semibold text-gray-700">ยอดรวมบิล</span>
            <span className="text-xl font-bold text-orange-600">
              ฿{totalBill.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl py-3 font-semibold"
        >
          กรอกบิลใหม่
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════
     Main form
  ══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">

      {/* Header + date */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🧾</span>
          <div>
            <h1 className="text-lg font-bold text-gray-800">บันทึกบิลไก่</h1>
            <p className="text-sm text-gray-500">ครัวกลาง BBC</p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">วันที่บิล</label>
          <input
            type="date"
            value={billDate}
            onChange={e => setBillDate(e.target.value)}
            className="mt-1 w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Item cards */}
      {ITEM_CONFIGS.map(cfg => {
        const type  = cfg.type as BagType;
        const item  = items[type];
        const total = item.enabled ? calcTotal(type, item) : 0;
        const kind  = cfg.kind;

        return (
          <div
            key={type}
            className={`bg-white rounded-2xl shadow overflow-hidden transition-opacity ${!item.enabled ? "opacity-60" : ""}`}
          >
            {/* Toggle header */}
            <button
              onClick={() => updateItem(type, "enabled", !item.enabled)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cfg.emoji}</span>
                <span className="font-semibold text-gray-800">{cfg.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {item.enabled && total > 0 && (
                  <span className="text-orange-600 font-bold text-sm">
                    ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </span>
                )}
                {/* Toggle pill */}
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${item.enabled ? "bg-orange-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200 ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </div>
            </button>

            {/* Fields */}
            {item.enabled && (
              <div className="px-4 pb-4 pt-3 border-t space-y-3">

                {/* ── ไก่ตอน ── */}
                {kind === "chicken" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">จำนวน (ตัว)</label>
                        <input
                          type="number" inputMode="numeric" value={item.qty_heads}
                          onChange={e => updateItem(type, "qty_heads", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">น้ำหนักรวม (กก.)</label>
                        <input
                          type="number" inputMode="decimal" value={item.weight_kg}
                          onChange={e => updateItem(type, "weight_kg", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">ราคา / กก.</label>
                      <input
                        type="number" inputMode="decimal" value={item.price_per_kg}
                        onChange={e => updateItem(type, "price_per_kg", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}

                {/* ── เลือด ── */}
                {kind === "blood" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">จำนวน (ก้อน)</label>
                      <input
                        type="number" inputMode="numeric" value={item.qty_pieces}
                        onChange={e => updateItem(type, "qty_pieces", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">ราคา / ก้อน</label>
                      <input
                        type="number" inputMode="decimal" value={item.price_per_piece}
                        onChange={e => updateItem(type, "price_per_piece", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                {/* ── อื่นๆ ── */}
                {kind === "other" && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">ชื่อสินค้า</label>
                      <input
                        type="text" value={item.name}
                        onChange={e => updateItem(type, "name", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="ระบุชื่อสินค้า"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">น้ำหนัก (กก.)</label>
                        <input
                          type="number" inputMode="decimal" value={item.weight_kg}
                          onChange={e => updateItem(type, "weight_kg", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">ราคา / กก.</label>
                        <input
                          type="number" inputMode="decimal" value={item.price_per_kg}
                          onChange={e => updateItem(type, "price_per_kg", e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── กก. ปกติ ── */}
                {kind === "kg" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">น้ำหนัก (กก.)</label>
                      <input
                        type="number" inputMode="decimal" value={item.weight_kg}
                        onChange={e => updateItem(type, "weight_kg", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">ราคา / กก.</label>
                      <input
                        type="number" inputMode="decimal" value={item.price_per_kg}
                        onChange={e => updateItem(type, "price_per_kg", e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-total */}
                {total > 0 && (
                  <div className="flex justify-end pt-1">
                    <span className="text-sm font-semibold text-orange-600">
                      ยอด: ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Total + Submit */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-700">ยอดรวมทั้งบิล</span>
          <span className="text-2xl font-bold text-orange-600">
            ฿{totalBill.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {submitError && <p className="text-red-500 text-sm mb-3">{submitError}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting || totalBill === 0}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 font-semibold transition-colors"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกบิล"}
        </button>
      </div>

      <div className="h-4" />
    </div>
  );
}
