/** Fixed display order for menu categories (tabs, tables, pivot sections). */
export const CATEGORY_DISPLAY_ORDER = [
  "หมวดข้าวมันไก่",
  "หมวดขาหมู",
  "หมวดของสดและผัก",
  "หมวดของแห้งและเครื่องปรุง",
  "หมวดบรรจุภัณฑ์",
  "หมวดของใช้และเอกสาร",
  "สั่งพิเศษ"
] as const;

export function compareCategoryOrder(a: string, b: string): number {
  const ia = CATEGORY_DISPLAY_ORDER.indexOf(a as (typeof CATEGORY_DISPLAY_ORDER)[number]);
  const ib = CATEGORY_DISPLAY_ORDER.indexOf(b as (typeof CATEGORY_DISPLAY_ORDER)[number]);
  const oa = ia === -1 ? 999 : ia;
  const ob = ib === -1 ? 999 : ib;
  if (oa !== ob) return oa - ob;
  return a.localeCompare(b, "th", { sensitivity: "base" });
}

export function sortCategoryKeys(categories: string[]): string[] {
  return [...categories].sort(compareCategoryOrder);
}
