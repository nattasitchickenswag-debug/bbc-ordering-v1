'use client';

import React, { useState } from 'react';
import { 
  ChevronRight, LogOut, LayoutGrid, UtensilsCrossed, 
  Leaf, Package, Droplets, Calendar, ChefHat, Search, PlusCircle 
} from 'lucide-react';

const STAFF_MAP: Record<string, { branchName: string }> = {
  "8241": { branchName: "ชิดลม(ไก่)" },
  "3952": { branchName: "เซ็นทรัลเวิลด์(หมู)" },
  "6174": { branchName: "นครปฐม(ไก่)" },
  "2089": { branchName: "เกตย์เวย์(ไก่)" },
  "5437": { branchName: "ลาดพร้าว(หมู)" },
  "9126": { branchName: "ลาดพร้าว(ไก่)" },
  "4703": { branchName: "แจ้งวัฒนะ(ไก่)" },
  "8888": { branchName: "Admin (ครัวกลาง)" },
};

const menuData: Record<string, { id: string, name: string, unit: string, icon: any, type: string }[]> = {
  "🍗 วัตถุดิบหลัก": [
    { id: "A0005", name: "ไก่หมัก", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken" },
    { id: "A0064", name: "ไก่หมักซอสเขียวหวาน", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken" },
    { id: "F0001", name: "ไก่ตอน ตัวต้ม", unit: "ตัว", icon: <UtensilsCrossed size={16}/>, type: "chicken" },
    { id: "F0002", name: "น่องสะโพกต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken" },
    { id: "F0008", name: "ขาหมูต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork" },
    { id: "F0009", name: "คากิต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork" },
    { id: "F0010", name: "ยี่จักต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork" },
    { id: "F0032", name: "ไส้หมูต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "pork" },
    { id: "F0027", name: "ขาไก่พะโล้", unit: "ถุง", icon: <UtensilsCrossed size={16}/>, type: "all" },
    { id: "F0034", name: "ไก่พริกไทยดำ", unit: "ถุง", icon: <UtensilsCrossed size={16}/>, type: "chicken" },
  ],
  "🥬 ผักสด": [
    { id: "B0001", name: "ฟักเขียว", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken" },
    { id: "B0002", name: "แตงกวา", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken" },
    { id: "B0003", name: "ใบเตย", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken" },
    { id: "B0004", name: "พริกขี้หนูสวน", unit: "กก.", icon: <Leaf size={16}/>, type: "all" },
    { id: "B0005", name: "พริกจินดาแดง", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken" },
    { id: "B0007", name: "ผักชี", unit: "กก.", icon: <Leaf size={16}/>, type: "all" },
    { id: "B0009", name: "ขิงซอย", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken" },
    { id: "B0011", name: "กระเทียมกลีบเล็ก", unit: "กก.", icon: <Leaf size={16}/>, type: "pork" },
    { id: "B0015", name: "ผักกาดดองซอย", unit: "กก.", icon: <Leaf size={16}/>, type: "pork" },
    { id: "B0050", name: "คะน้าไทย", unit: "กก.", icon: <Leaf size={16}/>, type: "pork" },
    { id: "F0024", name: "คะน้าฮ่องกง (ชุด)", unit: "ชุด", icon: <Leaf size={16}/>, type: "all" },
  ],
  "🍳 เครื่องปรุง": [
    { id: "C0001", name: "ข้าวสาร ฉัตรทอง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "all" },
    { id: "C0027", name: "ไข่เป็ด เบอร์ 1", unit: "แแผง", icon: <ChefHat size={16}/>, type: "all" },
    { id: "C0002", name: "เกล็ดขนมปัง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken" },
    { id: "C0008", name: "พริกไทยขาวป่น", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken" },
    { id: "C0021", name: "น้ำส้มสายชู คิวพี", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "pork" },
    { id: "C0095", name: "เต้าหู้ก้อน", unit: "ก้อน", icon: <ChefHat size={16}/>, type: "pork" },
    { id: "C0129", name: "กุนเชียงหมู", unit: "แพ็ค", icon: <ChefHat size={16}/>, type: "pork" },
    { id: "F0017", name: "เต้าเจี้ยวปรุงรส", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken" },
    { id: "F0020", name: "น้ำจิ้มขาหมู", unit: "ขวด/ถุง", icon: <ChefHat size={16}/>, type: "pork" },
    { id: "F0022", name: "น้ำจิ้มไก่ทอด", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken" },
  ],
  "📦 บรรจุภัณฑ์": [
    { id: "E0001", name: "ใบตองเทียม 12x12", unit: "แพ็ค", icon: <Package size={16}/>, type: "chicken" },
    { id: "E0002", name: "กล่อง 1 ช่อง", unit: "แพ็ค", icon: <Package size={16}/>, type: "all" },
    { id: "E0003", name: "กล่อง 2 ช่อง", unit: "แพ็ค", icon: <Package size={16}/>, type: "all" },
    { id: "E0025", name: "ถ้วยกระดาษ 750CC", unit: "แพ็ค", icon: <Package size={16}/>, type: "all" },
    { id: "E0033", name: "ถ้วยน้ำจิ้ม 1oz", unit: "แพ็ค", icon: <Package size={16}/>, type: "all" },
    { id: "E0032", name: "ช้อนส้อม", unit: "แพ็ค", icon: <Package size={16}/>, type: "all" },
  ],
  "🧼 อื่นๆ": [
    { id: "G0001", name: "ถุงมือพลาสติก", unit: "แพ็ค", icon: <Droplets size={16}/>, type: "all" },
    { id: "G0005", name: "กระดาษทิชชู่", unit: "ห่อ", icon: <Droplets size={16}/>, type: "all" },
    { id: "G0009", name: "น้ำยาล้างจาน", unit: "ขวด", icon: <Droplets size={16}/>, type: "all" },
    { id: "H0001", name: "กระดาษปริ้นท์บิล", unit: "ม้วน", icon: <Droplets size={16}/>, type: "all" },
  ]
};

export default function BBCSystemFinal() {
  const [step, setStep] = useState(1);
  const [staffCode, setStaffCode] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("🍗 วัตถุดิบหลัก");
  const [searchQuery, setSearchQuery] = useState(""); // เพิ่ม State ค้นหา
  const [cart, setCart] = useState<any>({});
  const [orderRemark, setOrderRemark] = useState(""); // เพิ่ม State หมายเหตุ
  const [loading, setLoading] = useState(false);

  const handlePIN = (e: React.FormEvent) => {
    e.preventDefault();
    const branchInfo = STAFF_MAP[staffCode];
    if (branchInfo) { setSelectedBranch(branchInfo); setStep(2); } 
    else { alert("❌ รหัสไม่ถูกต้อง"); setStaffCode(""); }
  };

  const updateData = (id: string, name: string, field: 'qty' | 'stock', val: number) => {
    const current = cart[id] || { name, qty: 0, stock: 0 };
    setCart({ ...cart, [id]: { ...current, [field]: Math.max(0, isNaN(val) ? 0 : val) } });
  };

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0 && !orderRemark) return alert("กรุณาเลือกสินค้าหรือใส่หมายเหตุ");
    setLoading(true);
    const payload = {
      staffCode,
      branch: selectedBranch.branchName,
      items: Object.keys(cart).filter(id => cart[id].qty > 0 || cart[id].stock > 0).map(id => ({ 
        sku: id, name: cart[id].name, qty: cart[id].qty, stock: cart[id].stock 
      })),
      remark: orderRemark, // ส่งหมายเหตุไปด้วย
      timestamp: new Date().toLocaleString('th-TH')
    };

    try {
      await fetch('https://nattasitpsk.app.n8n.cloud/webhook/2703028c-b955-4797-a36c-85ee691dfafd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert("✅ ส่งใบสั่งของสำเร็จ!");
      setCart({}); setOrderRemark(""); setStep(1); setStaffCode(""); setSearchQuery("");
    } catch (e) { alert("❌ ส่งข้อมูลไม่สำเร็จ"); }
    finally { setLoading(false); }
  };

  if (step === 1) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <div className="bg-[#ea580c] h-48 flex flex-col items-center justify-center text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><UtensilsCrossed size={120}/></div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-1">BBC System</h1>
        <p className="text-xs opacity-90 tracking-widest uppercase font-bold">Central Kitchen Login</p>
      </div>

      <div className="flex-1 -mt-10 bg-white rounded-t-[3rem] p-8 shadow-2xl relative z-10">
        <div className="max-w-xs mx-auto">
          <h2 className="text-center font-bold text-slate-400 mb-8 uppercase tracking-widest text-[10px]">Enter PIN Code</h2>
          <div className="flex justify-center gap-4 mb-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center ${staffCode.length >= i ? 'bg-[#f97316] border-[#f97316] shadow-lg scale-110' : 'bg-slate-50 border-slate-200'}`}>
                {staffCode.length >= i && <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} onClick={() => setStaffCode(prev => prev.length < 4 ? prev + num : prev)} className="h-16 bg-slate-100 rounded-2xl text-2xl font-black text-slate-700 active:bg-orange-100 transition-all shadow-sm">{num}</button>
            ))}
            <button onClick={() => setStaffCode("")} className="h-16 text-slate-400 font-bold text-xs uppercase">Clear</button>
            <button onClick={() => setStaffCode(prev => prev.length < 4 ? prev + "0" : prev)} className="h-16 bg-slate-100 rounded-2xl text-2xl font-black text-slate-700 shadow-sm">0</button>
            <button onClick={(e) => handlePIN(e as any)} className="h-16 bg-[#f97316] rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
              <ChevronRight size={32} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- LOGIC FILTER แยกสาขา + ค้นหา ---
  const isChicken = selectedBranch.branchName.includes("ไก่");
  const isPork = selectedBranch.branchName.includes("หมู");
  const isAdmin = selectedBranch.branchName.includes("Admin");

  const filteredItems = menuData[activeTab].filter(item => {
    const matchBranch = isAdmin || item.type === "all" || (isChicken && item.type === "chicken") || (isPork && item.type === "pork");
    const matchSearch = item.name.includes(searchQuery) || item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBranch && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-44 font-sans text-slate-900">
      <div className="bg-[#ea580c] text-white p-4 sticky top-0 z-50 shadow-md border-b-4 border-[#9a3412]">
        <div className="flex justify-between items-center mb-3">
          <h1 className="font-black text-xl italic tracking-tighter">BBC System</h1>
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[10px] bg-black/20 px-3 py-1 rounded-full border border-white/20 font-bold uppercase">
            <LogOut size={12}/> Logout
          </button>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-black/10 px-3 py-2 rounded-xl flex-1 border border-white/10 shadow-inner">
            <LayoutGrid size={12} className="text-orange-300"/>
            <span className="text-[10px] font-black truncate">{selectedBranch.branchName}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/10 px-3 py-2 rounded-xl flex-1 border border-white/10 shadow-inner">
            <Calendar size={12} className="text-orange-300"/>
            <span className="text-[10px] font-black uppercase">{new Date().toLocaleDateString('th-TH', {day:'2-digit', month:'short'})}</span>
          </div>
        </div>
      </div>

      {/* แถบ Tab และ ช่องค้นหา */}
      <div className="bg-white sticky top-[106px] z-40 shadow-sm">
        <div className="flex overflow-x-auto p-2 gap-2 no-scrollbar border-b">
          {Object.keys(menuData).map(tab => (
            <button 
              key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#ea580c] text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" placeholder="ค้นหาสินค้าหรือรหัส..." 
              className="w-full bg-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* รายการสินค้า */}
      <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="mb-3">
              <div className="flex justify-between items-start mb-1 text-[8px] font-mono text-slate-300">
                <span>{item.id}</span>
                <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded-full font-black uppercase">{item.unit}</span>
              </div>
              <h3 className="font-extrabold text-slate-800 flex items-start gap-1 text-[12px] leading-tight min-h-[32px]">
                <span className="text-[#ea580c] mt-0.5">{item.icon}</span> {item.name}
              </h3>
            </div>

            <div className="space-y-2">
              <input 
                type="number" inputMode="decimal" placeholder="เหลือ"
                className="w-full bg-slate-100 p-2 rounded-xl text-center font-black text-slate-600 text-xs outline-none focus:bg-white border border-transparent focus:border-slate-200"
                value={cart[item.id]?.stock || ''}
                onChange={(e) => updateData(item.id, item.name, 'stock', parseFloat(e.target.value))}
              />
              <div className="flex items-center bg-[#ea580c] rounded-xl p-0.5 shadow-md border border-[#9a3412]">
                <button onClick={() => updateData(item.id, item.name, 'qty', (cart[item.id]?.qty || 0) - 1)} className="w-8 h-8 text-white font-black">−</button>
                <input 
                  type="number" inputMode="decimal" className="flex-1 bg-transparent text-center text-white font-black outline-none text-xs placeholder:text-orange-300"
                  placeholder="สั่ง" value={cart[item.id]?.qty || ''}
                  onChange={(e) => updateData(item.id, item.name, 'qty', parseFloat(e.target.value))}
                />
                <button onClick={() => updateData(item.id, item.name, 'qty', (cart[item.id]?.qty || 0) + 1)} className="w-8 h-8 text-white font-black">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ส่วนท้าย: ช่องหมายเหตุ และ ปุ่ม Confirm */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t z-50">
        <div className="max-w-md mx-auto space-y-3">
          <div className="relative">
            <PlusCircle size={14} className="absolute left-3 top-3 text-orange-500" />
            <textarea 
              placeholder="สั่งของอื่นๆ นอกรายการ หรือใส่หมายเหตุเพิ่มเติม..."
              className="w-full bg-slate-50 pl-10 pr-4 py-2 rounded-2xl text-xs font-bold border-2 border-transparent focus:border-orange-200 outline-none resize-none"
              rows={2} value={orderRemark} onChange={(e) => setOrderRemark(e.target.value)}
            />
          </div>
          {(Object.keys(cart).filter(id => cart[id].qty > 0).length > 0 || orderRemark) && (
            <button 
              onClick={handleOrder} disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "SENDING..." : `CONFIRM ORDER (${Object.keys(cart).filter(id => cart[id].qty > 0).length})`}
              <ChevronRight size={20}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}