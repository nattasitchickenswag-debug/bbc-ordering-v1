"use client";
import { useState, useMemo } from "react";

type KitchenItem = {
  rowNumber: number;
  fullDate: string;
  branchName: string;
  productName: string;
  orderedQty: number;
  actualSentQty: number | null;
  weight: string;
  displayOrder: number;
};

export default function KitchenPage() {
  const [pin, setPin] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState<KitchenItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [view, setView] = useState<"table" | "summary">("table");

  const fetchData = async (currentPin: string) => {
    try {
      const res = await fetch("/api/kitchen", {
        headers: { "X-Kitchen-Pin": currentPin }
      });
      if (res.ok) {
        const json = await res.json();
        const filtered = json.filter((item: KitchenItem) => item.productName && item.productName.trim() !== "");
        setData(filtered);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Fetch error:", err);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await fetchData(pin);
    if (success) setIsAuthorized(true);
    else alert("รหัส PIN ไม่ถูกต้องครับพี่!");
    setLoading(false);
  };

  const isWeightProduct = (name: string) =>
    name.includes("ไก่ตอน") || name.includes("น่องสะโพกต้ม");

  const handleUpdateQty = async (rowNumber: number, val: string, weight?: string) => {
    const body: Record<string, unknown> = { rowNumber, actualSentQty: parseFloat(val) };
    if (weight !== undefined && weight !== "") body.weight = parseFloat(weight);
    const res = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kitchen-Pin": pin },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      alert("บันทึกยอดส่งจริงเรียบร้อย!");
      fetchData(pin);
    }
  };

  const handleUpdateOrder = async (rowNumber: number, newOrder: string, productName: string) => {
    if (!newOrder) return;
    const res = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kitchen-Pin": pin },
      body: JSON.stringify({ action: "updateOrder", rowNumber, productName, newOrder: parseFloat(newOrder) })
    });
    if (res.ok) fetchData(pin);
  };

  const handleAddNew = async () => {
    if (!newItemName || !newItemQty) return alert("กรอกข้อมูลให้ครบครับพี่");
    const res = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kitchen-Pin": pin },
      body: JSON.stringify({ action: "addNew", productName: newItemName, actualSentQty: parseFloat(newItemQty) })
    });
    if (res.ok) {
      alert("เพิ่มรายการพิเศษเรียบร้อย!");
      setNewItemName(""); setNewItemQty("");
      fetchData(pin);
    }
  };

  // --- Summary: pivot data by product × branch, sorted by displayOrder ---
  const summary = useMemo(() => {
    // unique branches in order of appearance
    const branchSet: string[] = [];
    for (const item of data) {
      if (!branchSet.includes(item.branchName)) branchSet.push(item.branchName);
    }
    // group by product
    const productMap = new Map<string, { displayOrder: number; branches: Map<string, number> }>();
    for (const item of data) {
      const qty = item.actualSentQty !== null ? item.actualSentQty : item.orderedQty;
      if (!productMap.has(item.productName)) {
        productMap.set(item.productName, { displayOrder: item.displayOrder, branches: new Map() });
      }
      productMap.get(item.productName)!.branches.set(item.branchName, qty);
    }
    const products = Array.from(productMap.entries()).sort((a, b) => a[1].displayOrder - b[1].displayOrder);
    return { products, branches: branchSet };
  }, [data]);

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const todayLabel = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-black">
        <form onSubmit={handleLogin} className="p-10 bg-white shadow-2xl rounded-2xl border border-gray-200 w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">ระบบครัวกลาง BBC</h1>
          <input
            type="password" value={pin} onChange={(e) => setPin(e.target.value)}
            className="w-full p-4 border-2 border-blue-100 rounded-xl mb-6 text-center text-3xl tracking-[1rem]"
            placeholder="****" maxLength={4}
          />
          <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700">
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto text-black print:p-2 print:max-w-none">
      {/* Header — hidden when printing */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900">รายการจัดส่งวันนี้</h1>
          <p className="text-gray-500">จัดการข้อมูลและ "จัดลำดับสินค้า" ได้เอง</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-red-600 font-medium">ออกจากระบบ</button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 print:hidden">
        <button
          onClick={() => setView("table")}
          className={`px-5 py-2 rounded-xl font-bold transition-all ${view === "table" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          📋 จัดส่ง
        </button>
        <button
          onClick={() => setView("summary")}
          className={`px-5 py-2 rounded-xl font-bold transition-all ${view === "summary" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          📄 ใบสรุปยอด
        </button>
      </div>

      {/* ===== VIEW: TABLE ===== */}
      {view === "table" && (
        <>
          <div className="bg-orange-50 p-6 rounded-2xl mb-8 border border-orange-200 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-bold text-orange-800 mb-2">สินค้าส่งเพิ่ม (นอกใบสั่ง)</label>
              <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full p-3 rounded-xl border-2 border-orange-200" placeholder="ระบุชื่อสินค้า..." />
            </div>
            <div className="w-32">
              <label className="block text-sm font-bold text-orange-800 mb-2">จำนวน</label>
              <input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} className="w-full p-3 rounded-xl border-2 border-orange-200 text-center" />
            </div>
            <button onClick={handleAddNew} className="bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-orange-700">เพิ่มรายการ</button>
          </div>

          <div className="bg-white shadow-xl rounded-2xl overflow-x-auto border">
            <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: "700px" }}>
              <colgroup>
                <col style={{ width: "60px" }} />
                <col style={{ width: "130px" }} />
                <col />
                <col style={{ width: "68px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "72px" }} />
              </colgroup>
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-2 text-center font-bold">ลำดับ</th>
                  <th className="p-2 text-left font-bold">สาขา</th>
                  <th className="p-2 text-left font-bold">สินค้า</th>
                  <th className="p-2 text-center font-bold">ยอดสั่ง</th>
                  <th className="p-2 text-center font-bold text-blue-700">ส่งจริง</th>
                  <th className="p-2 text-center font-bold text-orange-600">นน. (กก.)</th>
                  <th className="p-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-blue-50/40 transition-colors">
                    <td className="p-2 text-center">
                      <input
                        type="number" defaultValue={item.displayOrder}
                        className="w-12 p-1 border-2 border-gray-100 rounded-lg text-center font-bold text-gray-400 focus:border-blue-400 focus:text-blue-600 outline-none transition-all"
                        onBlur={(e) => handleUpdateOrder(item.rowNumber, e.target.value, item.productName)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateOrder(item.rowNumber, (e.target as HTMLInputElement).value, item.productName)}
                      />
                    </td>
                    <td className="p-2 font-semibold text-xs">{item.branchName}</td>
                    <td className="p-2">{item.productName}</td>
                    <td className="p-2 text-center">
                      <span className="bg-yellow-100 px-2 py-1 rounded-full font-bold text-yellow-800 text-xs">{item.orderedQty}</span>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number" defaultValue={item.actualSentQty ?? undefined}
                        className="w-full p-1 border-2 border-blue-100 rounded-lg text-center font-bold text-blue-600 focus:border-blue-500 outline-none"
                        id={`input-${item.rowNumber}`}
                      />
                    </td>
                    <td className="p-2 text-center">
                      {isWeightProduct(item.productName) ? (
                        <input
                          type="number" defaultValue={item.weight || undefined}
                          className="w-full p-1 border-2 border-orange-200 rounded-lg text-center font-bold text-orange-600 focus:border-orange-400 outline-none"
                          id={`weight-${item.rowNumber}`}
                          placeholder="0.00"
                          step="0.01"
                        />
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          const val = (document.getElementById(`input-${item.rowNumber}`) as HTMLInputElement).value;
                          const weightEl = document.getElementById(`weight-${item.rowNumber}`) as HTMLInputElement | null;
                          handleUpdateQty(item.rowNumber, val, weightEl?.value);
                        }}
                        className="bg-green-100 text-green-700 w-full py-1.5 rounded-lg font-bold text-xs hover:bg-green-600 hover:text-white transition-all active:scale-95"
                      >
                        บันทึก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== VIEW: SUMMARY ===== */}
      {view === "summary" && (
        <>
          <style>{`@media print { @page { size: A4 landscape; margin: 1.2cm; } .hide-on-print { display: none !important; } col.hide-on-print { visibility: collapse; } }`}</style>

          {/* Print header */}
          <div className="hidden print:block mb-3 text-center">
            <h1 className="text-lg font-bold">ใบสรุปยอดครัวกลาง BBC</h1>
            <p className="text-sm">วันที่ {todayLabel}</p>
          </div>

          <div className="flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-xl font-bold text-blue-900">ใบสรุปยอดครัวกลาง — {todayLabel}</h2>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow"
            >
              🖨️ พิมพ์
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm print:text-[11pt]" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col className="hide-on-print" style={{ width: "44px" }} />
                <col style={{ width: "45%" }} />
                <col style={{ width: "52px" }} />
                {summary.branches.map(b => <col key={b} />)}
              </colgroup>
              <thead>
                <tr className="bg-blue-900 text-white print:bg-gray-700">
                  <th className="border-2 border-blue-800 px-2 py-2 text-center print:border-gray-500 hide-on-print">ลำดับ</th>
                  <th className="border-2 border-blue-800 px-3 py-2 text-left print:border-gray-500">รายการสินค้า</th>
                  <th className="border-2 border-blue-800 px-2 py-2 text-center print:border-gray-500">รวม</th>
                  {summary.branches.map(b => (
                    <th key={b} className="border-2 border-blue-800 px-2 py-2 text-center print:border-gray-500">
                      {b.replace(/\s*\(ไก่\)/, "").replace(/\s*\(หมู\)/, "").replace("Admin", "ครัวกลาง").replace(/\s*\(ครัวกลาง\)/, "").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.products.map(([name, info], idx) => {
                  const total = Array.from(info.branches.values()).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={name} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-400 text-xs hide-on-print">
                        {info.displayOrder < 999 ? info.displayOrder : ""}
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5 font-medium">{name}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700 print:text-black">{total || ""}</td>
                      {summary.branches.map(b => (
                        <td key={b} className="border border-gray-300 px-2 py-1.5 text-center">
                          {info.branches.get(b) ?? ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
