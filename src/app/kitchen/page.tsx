"use client";
import { useState, useEffect } from "react";

export default function KitchenPage() {
  const [pin, setPin] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");

  const fetchData = async (currentPin: string) => {
    try {
      const res = await fetch("/api/kitchen", {
        headers: { "X-Kitchen-Pin": currentPin }
      });
      if (res.ok) {
        const json = await res.json();
        // กรองเฉพาะแถวที่มีข้อมูลจริง
        const filtered = json.filter((item: any) => item.productName && item.productName.trim() !== "");
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
    if (success) {
      setIsAuthorized(true);
    } else {
      alert("รหัส PIN ไม่ถูกต้องครับพี่!");
    }
    setLoading(false);
  };

  const handleUpdateQty = async (rowNumber: number, val: string) => {
    const res = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kitchen-Pin": pin },
      body: JSON.stringify({ rowNumber, actualSentQty: parseFloat(val) })
    });
    if (res.ok) {
      alert("บันทึกยอดส่งจริงเรียบร้อย!");
      fetchData(pin); 
    }
  };

  // --- ฟังก์ชันใหม่: จัดลำดับสินค้า ---
  const handleUpdateOrder = async (rowNumber: number, newOrder: string, productName: string) => {
    if (!newOrder) return;
    const res = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kitchen-Pin": pin },
      body: JSON.stringify({
        action: 'updateOrder',
        rowNumber,
        productName,
        newOrder: parseFloat(newOrder)
      })
    });
    if (res.ok) {
      fetchData(pin);
    }
  };

  const handleAddNew = async () => {
    if (!newItemName || !newItemQty) return alert("กรอกข้อมูลให้ครบครับพี่");
    const res = await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kitchen-Pin": pin },
      body: JSON.stringify({ action: 'addNew', productName: newItemName, actualSentQty: parseFloat(newItemQty) })
    });
    if (res.ok) {
      alert("เพิ่มรายการพิเศษเรียบร้อย!");
      setNewItemName("");
      setNewItemQty("");
      fetchData(pin);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-black">
        <form onSubmit={handleLogin} className="p-10 bg-white shadow-2xl rounded-2xl border border-gray-200 w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">ระบบครัวกลาง BBC</h1>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-4 border-2 border-blue-100 rounded-xl mb-6 text-center text-3xl tracking-[1rem]"
            placeholder="****"
            maxLength={4}
          />
          <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700">
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto text-black">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900">รายการจัดส่งวันนี้</h1>
          <p className="text-gray-500">จัดการข้อมูลและ "จัดลำดับสินค้า" ได้เอง</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-red-600 font-medium">ออกจากระบบ</button>
      </div>

      {/* ส่วนเพิ่มรายการ (Case พิเศษ) */}
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

      {/* ตารางข้อมูล */}
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="p-4 text-center font-bold w-20">ลำดับ</th>
              <th className="p-4 text-left font-bold">สาขา</th>
              <th className="p-4 text-left font-bold">สินค้า</th>
              <th className="p-3 text-center font-bold">ยอดสั่ง</th>
              <th className="p-3 text-center font-bold text-blue-700">ส่งจริง</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any, index) => (
              <tr key={index} className="border-b hover:bg-blue-50/40 transition-colors">
                {/* --- ช่องใส่เลขลำดับ --- */}
                <td className="p-3 text-center">
                  <input 
                    type="number"
                    defaultValue={item.displayOrder}
                    className="w-14 p-2 border-2 border-gray-100 rounded-lg text-center font-bold text-gray-400 focus:border-blue-400 focus:text-blue-600 outline-none transition-all"
                    onBlur={(e) => handleUpdateOrder(item.rowNumber, e.target.value, item.productName)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateOrder(item.rowNumber, (e.target as HTMLInputElement).value, item.productName)}
                  />
                </td>
                <td className="p-4 font-semibold">{item.branchName}</td>
                <td className="p-4">{item.productName}</td>
                <td className="p-3 text-center">
                  <span className="bg-yellow-100 px-3 py-1 rounded-full font-bold text-yellow-800">{item.orderedQty}</span>
                </td>
                <td className="p-3 text-center">
                  <input 
                    type="number" 
                    defaultValue={item.actualSentQty} 
                    className="w-24 p-2 border-2 border-blue-100 rounded-lg text-center font-bold text-blue-600 focus:border-blue-500 outline-none" 
                    id={`input-${item.rowNumber}`}
                  />
                </td>
                <td className="p-3 text-center">
                  <button 
                    onClick={() => {
                      const val = (document.getElementById(`input-${item.rowNumber}`) as HTMLInputElement).value;
                      handleUpdateQty(item.rowNumber, val);
                    }}
                    className="bg-green-100 text-green-700 px-6 py-2 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    บันทึก
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}