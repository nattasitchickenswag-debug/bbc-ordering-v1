'use client';

import React, { useState } from 'react';

const STAFF = ["สมชาย", "วิภา", "มานะ", "สมรักษ์"]; // เพิ่มชื่อพนักงานได้ตรงนี้
const BRANCHES = [
  { id: "B01", name: "ชิดลม(ไก่)" }, { id: "B02", name: "เซ็นทรัลเวิลด์(หมู)" },
  { id: "B03", name: "นครปฐม(ไก่)" }, { id: "B04", name: "เกตย์เวย์(ไก่)" },
  { id: "B05", name: "ลาดพร้าว(หมู)" }, { id: "B06", name: "ลาดพร้าว(ไก่)" },
  { id: "B07", name: "แจ้งวัฒนะ(ไก่)" },
];

const menuData = {
  "🍗 ข้าวมันไก่": [
    { id: "A0005", name: "ไก่หมัก (กก.)", step: 0.1 }, 
    { id: "B0002", name: "แตงกวา (กก.)", step: 0.1 },
    { id: "F0001", name: "ไก่ตอนต้ม (ตัว)", step: 1 },
  ],
  "🐷 ข้าวขาหมู": [
    { id: "F0008", name: "ขาหมูต้ม (ขา)", step: 1 },
    { id: "B0050", name: "คะน้า (กก.)", step: 0.5 },
  ],
  "📦 อุปกรณ์": [
    { id: "E0002", name: "กล่อง 1 ช่อง", step: 1 },
    { id: "E0016", name: "ถุงหูหิ้ว", step: 1 },
  ]
};

export default function BBCSystemV2() {
  const [step, setStep] = useState(1); // 1: Staff, 2: Branch, 3: Ordering
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("🍗 ข้าวมันไก่");
  const [cart, setCart] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const updateQty = (id: string, name: string, val: number) => {
    if (val <= 0) {
      const { [id]: removed, ...rest } = cart;
      setCart(rest);
    } else {
      setCart({ ...cart, [id]: { name, qty: val } });
    }
  };

  const handleOrder = async () => {
    setLoading(true);
    const payload = {
      staff: selectedStaff,
      branch: selectedBranch.name,
      items: Object.keys(cart).map(id => ({ sku: id, name: cart[id].name, qty: cart[id].qty })),
      timestamp: new Date().toLocaleString('th-TH')
    };

    try {
      await fetch('https://nattasitpsk.app.n8n.cloud/webhook/2703028c-b955-4797-a36c-85ee691dfafd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert("✅ ส่งข้อมูลสำเร็จ!");
      setCart({});
      setStep(1);
    } catch (e) { alert("❌ Error"); } finally { setLoading(false); }
  };

  // --- UI หน้าเลือกพนักงาน ---
  if (step === 1) return (
    <div className="p-8 bg-slate-900 min-h-screen text-white flex flex-col items-center">
      <h1 className="text-2xl font-black mb-10 text-orange-500">ใครเป็นคนสั่งของครับ?</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {STAFF.map(s => (
          <button key={s} onClick={() => { setSelectedStaff(s); setStep(2); }} className="bg-slate-800 p-6 rounded-3xl border-2 border-slate-700 active:border-orange-500 font-bold text-xl">{s}</button>
        ))}
      </div>
    </div>
  );

  // --- UI หน้าเลือกสาขา ---
  if (step === 2) return (
    <div className="p-8 bg-slate-900 min-h-screen text-white flex flex-col items-center">
      <h1 className="text-2xl font-black mb-10 text-orange-500 italic uppercase">BBC Central Kitchen</h1>
      <div className="grid gap-3 w-full max-w-sm">
        {BRANCHES.map(b => (
          <button key={b.id} onClick={() => { setSelectedBranch(b); setStep(3); }} className="bg-slate-800 p-5 rounded-2xl border-l-4 border-orange-500 text-left font-bold text-lg">{b.name}</button>
        ))}
      </div>
      <button onClick={() => setStep(1)} className="mt-8 text-slate-400">⬅️ ย้อนกลับไปหน้าเลือกพนักงาน</button>
    </div>
  );

  // --- UI หน้าสั่งของ ---
  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-40 relative">
      <div className="p-4 bg-orange-600 text-white font-bold flex justify-between sticky top-0 z-50 shadow-md">
        <div>
          <p className="text-[10px] opacity-70">สาขา: {selectedBranch.name}</p>
          <p className="text-sm">ผู้สั่ง: {selectedStaff}</p>
        </div>
        <button onClick={() => setStep(2)} className="text-[10px] bg-orange-800 px-2 py-1 rounded">เปลี่ยนสาขา</button>
      </div>

      <div className="flex bg-white sticky top-[56px] z-40 border-b overflow-x-auto p-2 gap-2 shadow-sm">
        {Object.keys(menuData).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap ${activeTab === t ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{t}</button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {menuData[activeTab as keyof typeof menuData].map(item => (
          <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
            <div className="flex flex-col flex-1">
              <span className="text-[10px] text-slate-300 font-mono tracking-tighter">{item.id}</span>
              <span className="font-bold text-slate-700 text-sm leading-tight">{item.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={cart[item.id]?.qty || ''} 
                onChange={(e) => updateQty(item.id, item.name, parseFloat(e.target.value))}
                placeholder="0"
                className="w-20 p-2 text-center bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-orange-600 outline-none focus:border-orange-500"
              />
              <span className="text-[10px] font-bold text-slate-400">หน่วย</span>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <button onClick={handleOrder} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all border-4 border-white">
            {loading ? "กำลังบันทึก..." : `ยืนยันส่งข้อมูล (${Object.keys(cart).length} รายการ)`}
          </button>
        </div>
      )}
    </div>
  );
}