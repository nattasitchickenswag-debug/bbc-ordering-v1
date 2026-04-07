import { Product } from "@/types/database";

/** Categories shown for "(ไก่)" branches — excludes ขาหมู menu block */
const CHICKEN_BRANCH_CATEGORIES = new Set([
  "หมวดข้าวมันไก่",
  "หมวดของสดและผัก",
  "หมวดของแห้งและเครื่องปรุง",
  "หมวดบรรจุภัณฑ์",
  "หมวดของใช้และเอกสาร"
]);

/** Categories shown for "(หมู)" branches — excludes ข้าวมันไก่ block */
const PORK_BRANCH_CATEGORIES = new Set([
  "หมวดขาหมู",
  "หมวดของสดและผัก",
  "หมวดของแห้งและเครื่องปรุง",
  "หมวดบรรจุภัณฑ์",
  "หมวดของใช้และเอกสาร"
]);

/** For "(หมู)" branches, hide these fresh items by name (still visible when searching) */
const PORK_HIDDEN_FRESH_SUBSTRINGS = ["ฟักเขียว", "ใบเตย", "ขิงซอย"];

/**
 * Default visibility when search is empty.
 * (ไก่): show chicken-rice + shared categories (not ขาหมู).
 * (หมู): show braised pork + shared categories, hide ข้าวมันไก่ category and specific fresh names.
 */
export function isProductInBranchDefaultView(
  product: Product,
  branchName: string,
  searchIsActive: boolean
): boolean {
  if (searchIsActive) return true;

  const n = branchName.trim();

  if (n.includes("(ไก่)")) {
    return CHICKEN_BRANCH_CATEGORIES.has(product.category);
  }

  if (n.includes("(หมู)")) {
    if (!PORK_BRANCH_CATEGORIES.has(product.category)) return false;
    if (product.category === "หมวดของสดและผัก") {
      const lower = product.productname.toLowerCase();
      for (const sub of PORK_HIDDEN_FRESH_SUBSTRINGS) {
        if (lower.includes(sub.toLowerCase())) return false;
      }
    }
    return true;
  }

  return true;
}

/** Short hint for the order UI when branch filter applies */
export function getBranchFilterHintText(branchName: string): string | null {
  const n = branchName.trim();
  if (n.includes("(ไก่)")) {
    return "แสดงรายการสำหรับสายไก่/ครัวกลาง — พิมพ์ค้นหาเพื่อดูสินค้าทั้งหมดที่ตรงคำ (รวมที่ซ่อน)";
  }
  if (n.includes("(หมู)")) {
    return "แสดงรายการสำหรับสายหมู/ครัวกลาง — พิมพ์ค้นหาเพื่อดูสินค้าทั้งหมดที่ตรงคำ (รวมที่ซ่อน)";
  }
  return null;
}
