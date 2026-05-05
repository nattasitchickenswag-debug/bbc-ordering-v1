'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, ChevronDown, ChevronUp, LogOut, LayoutGrid, UtensilsCrossed,
  Leaf, Package, Droplets, Calendar, ChefHat, Search, PlusCircle, X, ClipboardCheck, History
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

const STORAGE_KEY = 'BBC_ORDER_STATE';

const loadStoredState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export default function BBCSystemFinal() {
  const storedState = useMemo(() => loadStoredState(), []);
  const [step, setStep] = useState(storedState?.step ?? 1); 
  const [staffCode, setStaffCode] = useState(storedState?.staffCode ?? "");
  const [selectedBranch, setSelectedBranch] = useState<any>(storedState?.selectedBranch ?? null);
  const [activeTab, setActiveTab] = useState(storedState?.activeTab ?? "รายการสั่งประจำ");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any>(storedState?.cart ?? {});
  const [orderRemark, setOrderRemark] = useState(storedState?.orderRemark ?? "");
  const [loading, setLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<{ timestamp: string; items: { name: string; qty: string }[]; remark: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const menuData = useMemo(() => {
    const isChicken = selectedBranch?.branchName.includes("ไก่");
    const isPork = selectedBranch?.branchName.includes("หมู");
    const isAdmin = selectedBranch?.branchName.includes("Admin");

    const chickenItems = [
      { id: "A0005", name: "ไก่หมัก", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 1 },
      { id: "F0001", name: "ไก่ตอน ตัวต้ม", unit: "ตัว", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 2 },
      { id: "F0002", name: "น่องสะโพกต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 3 },
      { id: "F0006", name: "เลือดไก่ต้ม", unit: "ก้อน", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 4 },
      { id: "F0038", name: "เครื่องในไก่ต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 5 },
      { id: "F0027", name: "ขาไก่พะโล้", unit: "ถุง", icon: <UtensilsCrossed size={16}/>, type: "all", sortOrder: 6 },
      { id: "F0029", name: "ซุปผักกาดดองกระดูกหมู", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 6 },
      { id: "F0030", name: "ต้มแซ่บ", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 7 },
      { id: "B0001", name: "ฟักเขียว", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 17 },
      { id: "B0002", name: "แตงกวา", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 18 },
      { id: "B0003", name: "ใบเตย", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 19 },
      { id: "B0004", name: "พริกขี้หนูสวน", unit: "กก.", icon: <Leaf size={16}/>, type: "all", sortOrder: 20 },
      { id: "B0005", name: "พริกจินดาแดง", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 21 },
      { id: "B0007", name: "ผักชี", unit: "กก.", icon: <Leaf size={16}/>, type: "all", sortOrder: 22 },
      { id: "B0009", name: "ขิงซอย", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 23 },
    ];

    const chickenRiceSeasonings = [
      { id: "F0012", name: "เครื่องปรุงข้าว 1 กก. (ชุด)", unit: "ชุด", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 8 },
      { id: "F0013", name: "เครื่องปรุงข้าว 2 กก. (ชุด)", unit: "ชุด", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 9 },
      { id: "F0014", name: "เครื่องปรุงข้าว 3 กก. (ชุด)", unit: "ชุด", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 10 },
      { id: "F0015", name: "เครื่องปรุงข้าว 4 กก. (ชุด)", unit: "ชุด", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 11 },
      { id: "F0036", name: "3 เกลอครึ่งสูตร", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 12 },
      { id: "C0030", name: "3 เกลอเต็มสูตร", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 13 },
    ];

    const chickenRiceExtras = [
      { id: "C0001", name: "ข้าวสาร ฉัตรทอง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "all", sortOrder: 12 },
      { id: "C0002", name: "เกล็ดขนมปัง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 13 },
    ];

    const chickenSaucesAndOils = [
      { id: "F0022", name: "น้ำจิ้มไก่ทอด", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 14 },
      { id: "F0017", name: "เต้าเจี้ยวปรุงรสใส่พริกขิง 4,300 มล. (แกลลอน)", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 15 },
      { id: "F0035", name: "ซีอิ๊วหวาน", unit: "ขวด", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 16 },
      { id: "F0016", name: "น้ำมันทอดไก่ (4300 มล./แกลลอน)", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 17 },
    ];

    const porkItems = [
      { id: "F0008", name: "ขาหมูต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 1 },
      { id: "F0009", name: "คากิต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 2 },
      { id: "F0010", name: "ยี่จักต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 3 },
      { id: "F0032", name: "ไส้หมูต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 4 },
      { id: "F0027", name: "ขาไก่พะโล้", unit: "ถุง", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 5 },
      { id: "F0020", name: "น้ำจิ้มขาหมู", unit: "ขวด/ถุง", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 6 },
      { id: "F0037", name: "น้ำขาหมู", unit: "ถุง", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 7 },
      { id: "F0029", name: "ซุปผักกาดดองกระดูกหมู", unit: "ถุง", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 8 },
      { id: "F0030", name: "ต้มแซ่บ", unit: "ถุง", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 8 },
      { id: "C0001", name: "ข้าวสาร ฉัตรทอง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "all", sortOrder: 9 },
      { id: "C0021", name: "น้ำส้มสายชู คิวพี", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 10 },
      { id: "C0026", name: "น้ำมันทอดไก่", unit: "ขวด", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 11 },
      { id: "C0027", name: "ไข่เป็ด เบอร์ 1", unit: "แผง", icon: <ChefHat size={16}/>, type: "all", sortOrder: 12 },
      { id: "C0095", name: "เต้าหู้ก้อน", unit: "ก้อน", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 13 },
      { id: "C0129", name: "กุนเชียงหมู", unit: "แพ็ค", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 14 },
      { id: "F0024", name: "คะน้าฮ่องกงน้ำมันหอย (ชุด)", unit: "ชุด", icon: <Leaf size={16}/>, type: "all", sortOrder: 15 },
      { id: "B0004", name: "พริกขี้หนูสวน", unit: "กก.", icon: <Leaf size={16}/>, type: "all", sortOrder: 16 },
      { id: "B0007", name: "ผักชี", unit: "กก.", icon: <Leaf size={16}/>, type: "all", sortOrder: 17 },
      { id: "B0011", name: "กระเทียมกลีบเล็ก", unit: "กก.", icon: <Leaf size={16}/>, type: "pork", sortOrder: 18 },
      { id: "B0015", name: "ผักกาดดองซอย", unit: "กก.", icon: <Leaf size={16}/>, type: "pork", sortOrder: 19 },
      { id: "B0050", name: "คะน้ายอดเล็ก", unit: "กก.", icon: <Leaf size={16}/>, type: "pork", sortOrder: 20 },
    ];

    const regularPackagingItems = [
      { id: "E0034", name: "ถุงขยะ 30 × 40", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 101 },
      { id: "E0035", name: "ถุงร้อน 4 × 6", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 102 },
    ];

    let regularOrderItems = [];
    if (isAdmin) {
      regularOrderItems = [
        ...chickenItems,
        ...chickenRiceSeasonings,
        ...chickenRiceExtras,
        ...chickenSaucesAndOils,
        ...porkItems.filter(item => ![...chickenItems, ...chickenRiceSeasonings, ...chickenRiceExtras, ...chickenSaucesAndOils].some(c => c.id === item.id)),
        ...regularPackagingItems
      ];
    } else if (isChicken) {
      regularOrderItems = [
        ...chickenItems.filter(item => !['F0008', 'F0009', 'F0010', 'F0032'].includes(item.id)),
        ...chickenRiceSeasonings,
        ...chickenRiceExtras,
        ...chickenSaucesAndOils,
        ...regularPackagingItems
      ];
    } else if (isPork) {
      regularOrderItems = [
        ...porkItems.filter(item => !['F0001', 'F0002', 'C0026', 'F0021'].includes(item.id)),
        ...regularPackagingItems
      ];
    }

    return {
      "รายการสั่งประจำ": regularOrderItems,
      "🍗 วัตถุดิบหลัก": [
        { id: "A0005", name: "ไก่หมัก", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 1 },
        { id: "F0001", name: "ไก่ตอน ตัวต้ม", unit: "ตัว", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 2 },
        { id: "F0002", name: "น่องสะโพกต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 3 },
        { id: "F0008", name: "ขาหมูต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 4 },
        { id: "F0009", name: "คากิต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 6 },
        { id: "F0010", name: "ยี่จักต้ม", unit: "กก./ขา", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 7 },
        { id: "F0032", name: "ไส้หมูต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "pork", sortOrder: 8 },
        { id: "F0038", name: "เครื่องในไก่ต้ม", unit: "กก.", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 9 },
        { id: "F0027", name: "ขาไก่พะโล้", unit: "ถุง", icon: <UtensilsCrossed size={16}/>, type: "all", sortOrder: 10 },
        { id: "F0034", name: "ไก่พริกไทยดำ", unit: "ถุง", icon: <UtensilsCrossed size={16}/>, type: "chicken", sortOrder: 11 },
      ],
      "🥬 ผักสด": [
        { id: "B0001", name: "ฟักเขียว", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 1 },
        { id: "B0002", name: "แตงกวา", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 2 },
        { id: "B0003", name: "ใบเตย", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 3 },
        { id: "B0004", name: "พริกขี้หนูสวน", unit: "กก.", icon: <Leaf size={16}/>, type: "all", sortOrder: 4 },
        { id: "B0005", name: "พริกจินดาแดง", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 5 },
        { id: "B0007", name: "ผักชี", unit: "กก.", icon: <Leaf size={16}/>, type: "all", sortOrder: 6 },
        { id: "B0009", name: "ขิงซอย", unit: "กก.", icon: <Leaf size={16}/>, type: "chicken", sortOrder: 7 },
        { id: "B0011", name: "กระเทียมกลีบเล็ก", unit: "กก.", icon: <Leaf size={16}/>, type: "pork", sortOrder: 8 },
        { id: "B0015", name: "ผักกาดดองซอย", unit: "กก.", icon: <Leaf size={16}/>, type: "pork", sortOrder: 9 },
        { id: "B0050", name: "คะน้ายอดเล็ก", unit: "กก.", icon: <Leaf size={16}/>, type: "pork", sortOrder: 10 },
        { id: "F0024", name: "คะน้าฮ่องกงน้ำมันหอย (ชุด)", unit: "ชุด", icon: <Leaf size={16}/>, type: "all", sortOrder: 11 },
      ],
      "🍳 เครื่องปรุง": [
        { id: "C0001", name: "ข้าวสาร ฉัตรทอง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "all", sortOrder: 1 },
        { id: "C0027", name: "ไข่เป็ด เบอร์ 1", unit: "แผง", icon: <ChefHat size={16}/>, type: "all", sortOrder: 2 },
        { id: "C0002", name: "เกล็ดขนมปัง", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 3 },
        { id: "C0008", name: "พริกไทยขาวป่น", unit: "ถุง", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 4 },
        { id: "C0021", name: "น้ำส้มสายชู คิวพี", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 5 },
        { id: "C0026", name: "น้ำมันทอดไก่", unit: "ขวด", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 6 },
        { id: "F0029", name: "ซุปผักกาดดองกระดูกหมู", unit: "ถุง", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 7 },
        { id: "C0095", name: "เต้าหู้ก้อน", unit: "ก้อน", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 8 },
        { id: "C0129", name: "กุนเชียงหมู", unit: "แพ็ค", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 9 },
        { id: "F0017", name: "เต้าเจี้ยวปรุงรสใส่พริกขิง 4,300 มล. (แกลลอน)", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 10 },
        { id: "F0020", name: "น้ำจิ้มขาหมู", unit: "ขวด/ถุง", icon: <ChefHat size={16}/>, type: "pork", sortOrder: 11 },
        { id: "F0022", name: "น้ำจิ้มไก่ทอด", unit: "แกลลอน", icon: <ChefHat size={16}/>, type: "chicken", sortOrder: 12 },
      ],
      "📦 บรรจุภัณฑ์": [
        { id: "E0001", name: "ใบตองเทียม 12x12", unit: "แพ็ค", icon: <Package size={16}/>, type: "chicken", sortOrder: 1 },
        { id: "E0002", name: "กล่อง 1 ช่อง", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 2 },
        { id: "E0003", name: "กล่อง 2 ช่อง", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 3 },
        { id: "E0010", name: "ถุงร้อน 3x5", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 4 },
        { id: "E0012", name: "ถุงร้อน 5x8", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 5 },
        { id: "E0025", name: "ถ้วยกระดาษ 750CC", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 6 },
        { id: "E0033", name: "ถ้วยน้ำจิ้ม 1oz", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 7 },
        { id: "E0032", name: "ช้อนส้อม", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 8 },
        { id: "E0016", name: "ถุงหูหิ้ว 6x14", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 9 },
        { id: "E0017", name: "ถุงหูหิ้ว 8x16", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 10 },
        { id: "E0034", name: "ถุงขยะ 30 × 40", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 11 },
        { id: "E0035", name: "ถุงร้อน 4 × 6", unit: "แพ็ค", icon: <Package size={16}/>, type: "all", sortOrder: 12 },
      ],
      "🧼 อื่นๆ": [
        { id: "G0001", name: "ถุงมือพลาสติก", unit: "แพ็ค", icon: <Droplets size={16}/>, type: "all", sortOrder: 1 },
        { id: "G0003", name: "ถุงมือยาง Size M", unit: "แพ็ค", icon: <Droplets size={16}/>, type: "all", sortOrder: 2 },
        { id: "G0004", name: "ถุงมือยาง L", unit: "แพ็ค", icon: <Droplets size={16}/>, type: "all", sortOrder: 3 },
        { id: "G0005", name: "กระดาษทิชชู่", unit: "ห่อ", icon: <Droplets size={16}/>, type: "all", sortOrder: 3 },
        { id: "G0009", name: "น้ำยาล้างจาน", unit: "ขวด", icon: <Droplets size={16}/>, type: "all", sortOrder: 4 },
      ]
    };
  }, [selectedBranch]);

  const handlePIN = (e: React.FormEvent) => {
    e.preventDefault();
    const branchInfo = STAFF_MAP[staffCode];
    if (branchInfo) {
      setSelectedBranch(branchInfo);
      setStep(2);
    } else {
      alert("❌ รหัสไม่ถูกต้อง");
      setStaffCode("");
    }
  };

  const handleLogout = () => {
    setStep(1);
    setStaffCode("");
    setSelectedBranch(null);
    setActiveTab("รายการสั่งประจำ");
    setSearchQuery("");
    setCart({});
    setOrderRemark("");
    setOrderHistory([]);
    setHistoryExpanded(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const updateData = (id: string, name: string, unit: string, field: 'qty' | 'stock', val: number) => {
    setCart(prevCart => {
      const current = prevCart[id] || { name, unit, qty: 0, stock: 0 };
      return {
        ...prevCart,
        [id]: {
          ...current,
          [field]: Math.max(0, isNaN(val) ? 0 : val),
        },
      };
    });
  };

  const handleOrder = async () => {
    setLoading(true);
    const payload = {
      staffCode,
      branch: selectedBranch.branchName,
      items: Object.keys(cart).filter(id => cart[id].qty > 0).map(id => ({ 
        sku: id, name: cart[id].name, qty: cart[id].qty, stock: cart[id].stock 
      })),
      remark: orderRemark,
      timestamp: new Date().toLocaleString('th-TH')
    };

    try {
      await fetch('https://nattasitpsk.app.n8n.cloud/webhook/2703028c-b955-4797-a36c-85ee691dfafd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert("✅ ส่งใบสั่งของสำเร็จ!");
      setCart({}); setOrderRemark(""); setStep(1); setStaffCode(""); setSearchQuery(""); setSelectedBranch(null); setActiveTab("รายการสั่งประจำ");
      setHistoryExpanded(false);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      alert("❌ ส่งข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const isChicken = selectedBranch?.branchName.includes("ไก่");
  const isPork = selectedBranch?.branchName.includes("หมู");
  const isAdmin = selectedBranch?.branchName.includes("Admin");

  const filteredItems = useMemo(() => {
    if (!selectedBranch || !menuData[activeTab]) return [];
    return menuData[activeTab]
      .filter(item => {
        // Hidden items based on branch type
        const isHiddenChickenItem = !isAdmin && isChicken && ['F0008', 'F0009', 'F0010', 'F0032'].includes(item.id);
        const isHiddenPorkItem = !isAdmin && isPork && ['F0001', 'F0002'].includes(item.id);
        
        // Type filtering
        const isAllowedType = isAdmin || item.type === "all" || (isChicken && item.type === "chicken") || (isPork && item.type === "pork");
        const matchSearch = item.name.includes(searchQuery) || item.id.toLowerCase().includes(searchQuery.toLowerCase());
        
        return isAllowedType && matchSearch && !isHiddenChickenItem && !isHiddenPorkItem;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [activeTab, searchQuery, selectedBranch, menuData, isChicken, isPork, isAdmin]);

  const cartItems = Object.keys(cart).filter(id => cart[id].qty > 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      staffCode,
      selectedBranch,
      activeTab,
      cart,
      orderRemark,
      step,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [staffCode, selectedBranch, activeTab, cart, orderRemark, step]);

  useEffect(() => {
    if (step !== 2 || !selectedBranch?.branchName) return;
    const branchName = selectedBranch.branchName;
    setHistoryLoading(true);
    fetch(`/api/orders/history?branch=${encodeURIComponent(branchName)}`)
      .then(r => r.json())
      .then(data => setOrderHistory(Array.isArray(data) ? data : []))
      .catch(() => setOrderHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [step, selectedBranch?.branchName]);

  const goToReview = () => {
    window.scrollTo(0, 0);
    setStep(3);
  };

  const goToOrdering = () => {
    window.scrollTo(0, 0);
    setStep(2);
  };

  // --- 1. Login Page ---
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

  // --- 2. Ordering Page ---
  if (step === 2) return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans text-slate-900">
      <div className="bg-[#ea580c] text-white p-2 shadow-sm border-b border-[#9a3412]">
        <div className="flex justify-between items-center mb-0.5">
          <h1 className="font-black text-sm italic tracking-tighter">BBC System</h1>
          <button onClick={handleLogout} className="flex items-center gap-1 text-[8px] bg-black/20 px-2 py-0.5 rounded-full border border-white/20 font-bold uppercase">
            <LogOut size={10}/> Logout
          </button>
        </div>
        <div className="flex gap-1 text-white text-[8px] font-black">
          <div className="flex items-center gap-1 bg-black/10 px-1.5 py-0.5 rounded-md flex-1 border border-white/10">
            <LayoutGrid size={8} className="text-orange-300 flex-shrink-0"/>
            <span className="truncate">{selectedBranch.branchName}</span>
          </div>
          <div className="flex items-center gap-1 bg-black/10 px-1.5 py-0.5 rounded-md flex-1 border border-white/10">
            <Calendar size={8} className="text-orange-300 flex-shrink-0"/>
            <span>{new Date().toLocaleDateString('th-TH', {day:'2-digit', month:'short'})}</span>
          </div>
        </div>
      </div>

      <div className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="flex overflow-x-auto p-1 gap-1 no-scrollbar border-b">
          {Object.keys(menuData).map(tab => (
            <button 
              key={tab} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab(tab); setSearchQuery(""); }}
              className={`px-2 py-1 rounded-md text-[8px] font-black whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#ea580c] text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12}/>
            <input 
              type="text" placeholder="ค้นหาสินค้า..." 
              className="w-full bg-slate-100 pl-8 pr-3 py-1.5 rounded-md text-[11px] font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Order History Panel — collapsible, loads on login */}
      <div className="px-2 pt-2 max-w-4xl mx-auto">
        <button
          onClick={() => setHistoryExpanded(prev => !prev)}
          className="w-full flex items-center justify-between bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-2">
            <History size={13} className="text-orange-400 flex-shrink-0" />
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ประวัติการสั่ง</span>
            {historyLoading && <span className="text-[10px] text-orange-400 font-bold animate-pulse">กำลังโหลด...</span>}
            {!historyLoading && orderHistory.length > 0 && (
              <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                {orderHistory.length} ครั้งล่าสุด
              </span>
            )}
          </div>
          {historyExpanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
        </button>

        {historyExpanded && (
          <div className="mt-1.5 space-y-2 pb-1">
            {!historyLoading && orderHistory.length === 0 ? (
              <p className="text-center text-slate-400 text-[11px] font-bold py-4">ยังไม่มีประวัติการสั่ง</p>
            ) : (
              orderHistory.map((order, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-black text-[#ea580c] mb-2">{order.timestamp}</p>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600">{item.name}</span>
                        <span className="text-[11px] font-black text-slate-900">{item.qty}</span>
                      </div>
                    ))}
                  </div>
                  {order.remark ? (
                    <p className="mt-2 text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-1.5">หมายเหตุ: {order.remark}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className={`p-2 pb-20 grid gap-2 max-w-4xl mx-auto ${activeTab === "รายการสั่งประจำ" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2"}`}>
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="mb-1">
              <div className="flex justify-between items-start mb-0.5 text-[7px] font-mono text-slate-300">
                <span>{item.id}</span>
                <span className="bg-slate-900 text-white px-1 py-0.5 rounded-full font-black uppercase tracking-tighter">{item.unit}</span>
              </div>
              <h3 className="font-extrabold text-slate-800 flex items-start gap-0.5 text-[10px] leading-tight min-h-[28px] line-clamp-2">
                <span className="text-[#ea580c] mt-0.5 flex-shrink-0">{item.icon}</span> <span>{item.name}</span>
              </h3>
            </div>

            <div className="space-y-1">
              <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                <span className="text-[8px] font-black text-slate-400 px-0.5 flex-shrink-0">เหลือ:</span>
                <input 
                  type="number" inputMode="decimal"
                  className="w-full bg-transparent text-center font-black text-slate-700 text-[9px] outline-none"
                  value={cart[item.id]?.stock || ''}
                  onChange={(e) => updateData(item.id, item.name, item.unit, 'stock', parseFloat(e.target.value))}
                />
              </div>
              <div className="flex flex-nowrap items-center bg-[#ea580c] rounded-lg p-1 shadow-md gap-0.5">
                <button
                  type="button"
                  onClick={() => updateData(item.id, item.name, item.unit, 'qty', (cart[item.id]?.qty || 0) - 1)}
                  className="text-white font-black text-base sm:text-lg flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 min-w-[2.25rem] sm:min-w-[2.5rem] md:min-w-[3rem] rounded-lg sm:rounded-xl transition-all active:scale-95 flex-shrink-0"
                  aria-label={`ลดจำนวน ${item.name}`}
                >
                  −
                </button>
                <input 
                  type="number" inputMode="decimal" className="flex-1 bg-transparent text-center text-white font-black outline-none text-xs sm:text-sm placeholder:text-orange-200 min-w-0"
                  placeholder="สั่ง" value={cart[item.id]?.qty || ''}
                  onChange={(e) => updateData(item.id, item.name, item.unit, 'qty', parseFloat(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => updateData(item.id, item.name, item.unit, 'qty', (cart[item.id]?.qty || 0) + 1)}
                  className="text-white font-black text-base sm:text-lg flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 min-w-[2.25rem] sm:min-w-[2.5rem] md:min-w-[3rem] rounded-lg sm:rounded-xl transition-all active:scale-95 flex-shrink-0"
                  aria-label={`เพิ่มจำนวน ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex justify-center">
          <button 
            onClick={goToReview}
            className="w-full max-w-md bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 animate-bounce"
          >
            <ClipboardCheck size={24} />
            ตรวจทานรายการ ({cartItems.length})
          </button>
        </div>
      )}
    </div>
  );

  // --- 3. Review Page (Full Screen) ---
  if (step === 3) return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      <div className="bg-[#ea580c] text-white p-6 shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black italic">สรุปใบสั่งของ</h2>
            <p className="text-sm font-bold opacity-80 uppercase tracking-widest">{selectedBranch.branchName}</p>
          </div>
          <button onClick={() => setStep(2)} className="bg-black/20 p-2 rounded-full border border-white/20"><X size={24}/></button>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-md mx-auto w-full space-y-4">
        {cartItems.map(id => (
          <div key={id} className="flex justify-between items-center border-b-2 border-slate-50 pb-4">
            <div>
              <p className="font-extrabold text-slate-800 text-base">{cart[id].name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">สต็อกเดิม: {cart[id].stock} {cart[id].unit}</p>
            </div>
            <div className="text-right">
              <p className="text-[#ea580c] font-black text-2xl">{cart[id].qty}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase">{cart[id].unit}</p>
            </div>
          </div>
        ))}

        <div className="pt-4">
          <label className="text-xs font-black text-slate-400 uppercase mb-2 block">หมายเหตุเพิ่มเติม</label>
          <div className="relative">
            <PlusCircle size={16} className="absolute left-3 top-3 text-orange-500" />
            <textarea 
              placeholder="สั่งของอื่นๆ หรือระบุรายละเอียดเพิ่ม..."
              className="w-full bg-slate-50 pl-10 pr-4 py-4 rounded-2xl text-sm font-bold border-2 border-slate-100 focus:border-orange-500 outline-none resize-none"
              rows={4} value={orderRemark} onChange={(e) => setOrderRemark(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t sticky bottom-0">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleOrder} disabled={loading}
            className="w-full bg-[#ea580c] text-white py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "กำลังส่งข้อมูล..." : "ยืนยันส่งใบสั่งของ"}
            {!loading && <ChevronRight size={24}/>}
          </button>
          <button onClick={goToOrdering} className="w-full mt-4 bg-white border border-slate-200 text-slate-700 font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-sm">กลับไปแก้ไขรายการ</button>
        </div>
      </div>
    </div>
  );

  return null;
}