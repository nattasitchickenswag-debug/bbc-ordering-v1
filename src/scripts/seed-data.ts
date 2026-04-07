import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// เพิ่ม getBranches เข้ามาด้วย
import { insertOrders, getProducts, getBranches } from '../lib/local-db';

async function seed() {
  console.log('⏳ กำลังเริ่มดึงข้อมูลสาขาและสินค้าจริงจากฐานข้อมูล...');

  try {
    // 1. ดึงสาขาที่มีอยู่จริงใน DB (ไม่ระบุชื่อเองแล้ว)
    const dbBranches = await getBranches();
    // 2. ดึงสินค้าที่มีอยู่จริงใน DB
    const products = await getProducts();

    if (dbBranches.length === 0) {
      console.error('❌ ไม่พบข้อมูลสาขาในฐานข้อมูล กรุณาไปเพิ่มสาขาในหน้า Admin ก่อน');
      return;
    }

    if (products.length === 0) {
      console.error('❌ ไม่พบข้อมูลสินค้าข้าวมันไก่ในฐานข้อมูล');
      return;
    }

    console.log(`📢 พบสาขาจริงทั้งหมด ${dbBranches.length} สาขา:`, dbBranches.map(b => b.branchname).join(', '));

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      for (const branch of dbBranches) {
        // สุ่มสินค้าข้าวมันไก่/ขาหมู ที่มีอยู่ใน DB จริงๆ
        const itemCount = Math.floor(Math.random() * 8) + 5;
        const selectedProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, itemCount);

        const items = selectedProducts.map(p => ({
          productid: Number(p.productid),
          quantity: Math.floor(Math.random() * 10) + 1,
          customname: null
        }));

        // ใช้ branchid และ branchname จาก DB โดยตรง
        await insertOrders(
          branch.branchid,
          branch.branchname,
          items,
          date.toISOString()
        );
      }
      console.log(`✅ บันทึกข้อมูลวันที่ ${date.toLocaleDateString('th-TH')} สำเร็จ`);
    }
    console.log('✨ เสร็จสิ้น! ตอนนี้ชื่อสาขาจะตรงตามฐานข้อมูล 100% ครับ');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

seed();