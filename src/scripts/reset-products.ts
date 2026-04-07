import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { sql } from "@vercel/postgres";

async function run() {
  try {
    console.log("Resetting products table to 'Hainanese Chicken Rice' and 'Braised Pork Leg' set...");
    
    // Delete all existing products
    await sql`DELETE FROM orders`; // Delete orders first due to foreign key constraints
    await sql`DELETE FROM products`;

    const products = [
      // หมวดข้าวมันไก่
      { code: 'A0001', name: 'ไก่ต้ม (ตัว)', unit: 'ตัว', price: 380, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0002', name: 'ไก่ทอด (ชิ้น)', unit: 'ชิ้น', price: 45, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0003', name: 'ตับไก่ (กก.)', unit: 'กก.', price: 150, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0004', name: 'เลือดไก่ (ก้อน)', unit: 'ก้อน', price: 10, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0005', name: 'ข้าวมัน (หม้อ)', unit: 'หม้อ', price: 120, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0006', name: 'น้ำจิ้มไก่ (ถุง)', unit: 'ถุง', price: 85, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0007', name: 'แตงกวา (กก.)', unit: 'กก.', price: 35, cat: 'หมวดข้าวมันไก่' },
      { code: 'A0008', name: 'ผักชี (กก.)', unit: 'กก.', price: 180, cat: 'หมวดข้าวมันไก่' },
      
      // หมวดขาหมู
      { code: 'F0001', name: 'ขาหมูต้ม (ขา)', unit: 'ขา', price: 280, cat: 'หมวดขาหมู' },
      { code: 'F0002', name: 'คากิ (ชิ้น)', unit: 'ชิ้น', price: 60, cat: 'หมวดขาหมู' },
      { code: 'F0003', name: 'ไส้หมูพะโล้ (กก.)', unit: 'กก.', price: 220, cat: 'หมวดขาหมู' },
      { code: 'F0004', name: 'ไข่ต้มพะโล้ (ฟอง)', unit: 'ฟอง', price: 12, cat: 'หมวดขาหมู' },
      { code: 'F0005', name: 'ผักกาดดอง (กก.)', unit: 'กก.', price: 55, cat: 'หมวดขาหมู' },
      { code: 'F0006', name: 'น้ำพะโล้ (ถุง)', unit: 'ถุง', price: 40, cat: 'หมวดขาหมู' },
      { code: 'F0007', name: 'พริกน้ำส้ม (ถุง)', unit: 'ถุง', price: 25, cat: 'หมวดขาหมู' },
      { code: 'F0008', name: 'คะน้า (กก.)', unit: 'กก.', price: 45, cat: 'หมวดขาหมู' },

      // หมวดของสดและผัก
      { code: 'V0001', name: 'ฟักเขียว (กก.)', unit: 'กก.', price: 20, cat: 'หมวดของสดและผัก' },
      { code: 'V0002', name: 'ใบเตย (มัด)', unit: 'มัด', price: 15, cat: 'หมวดของสดและผัก' },
      { code: 'V0003', name: 'ขิงซอย (กก.)', unit: 'กก.', price: 65, cat: 'หมวดของสดและผัก' },
      { code: 'V0004', name: 'พริกขี้หนู (กก.)', unit: 'กก.', price: 120, cat: 'หมวดของสดและผัก' },

      // หมวดของแห้งและเครื่องปรุง
      { code: 'D0001', name: 'ข้าวสารหอมมะลิ (ถุง)', unit: 'ถุง', price: 185, cat: 'หมวดของแห้งและเครื่องปรุง' },
      { code: 'D0002', name: 'ซีอิ๊วดำ (แกลลอน)', unit: 'แกลลอน', price: 240, cat: 'หมวดของแห้งและเครื่องปรุง' },
      { code: 'D0003', name: 'น้ำมันพืช (ขวด)', unit: 'ขวด', price: 55, cat: 'หมวดของแห้งและเครื่องปรุง' }
    ];

    for (const p of products) {
      await sql`
        INSERT INTO products (productcode, productname, unit, costprice, category)
        VALUES (${p.code}, ${p.name}, ${p.unit}, ${p.price}, ${p.cat})
      `;
    }

    console.log(`Success! Inserted ${products.length} products.`);
    
    const { rows } = await sql`SELECT productid, productcode, productname, category FROM products ORDER BY category, productcode`;
    console.table(rows);

  } catch (err) {
    console.error("Error resetting products:", err);
  }
}

run();
