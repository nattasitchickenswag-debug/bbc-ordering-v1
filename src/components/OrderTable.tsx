"use client";

import { useMemo, useState } from "react";
import { Product } from "@/types/database";
import { sortCategoryKeys } from "@/lib/category-order";
import { getBranchFilterHintText, isProductInBranchDefaultView } from "@/lib/branch-product-filter";

type Props = {
  branchId: number;
  branchName: string;
  products: Product[];
};

type QuantityMap = Record<number, string>;

type SpecialLine = { id: string; name: string; qty: string };

function newSpecialLine(): SpecialLine {
  return { id: crypto.randomUUID(), name: "", qty: "" };
}

export default function OrderTable({ branchId, branchName, products }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [specialLines, setSpecialLines] = useState<SpecialLine[]>(() => [newSpecialLine()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const searchTrim = search.trim();
  const searchActive = searchTrim.length > 0;

  const branchFilterHint = useMemo(() => {
    if (searchActive) return null;
    return getBranchFilterHintText(branchName);
  }, [branchName, searchActive]);

  const catalogPool = useMemo(() => {
    if (searchActive) return products;
    return products.filter((p) => isProductInBranchDefaultView(p, branchName, false));
  }, [products, branchName, searchActive]);

  const categories = useMemo(() => {
    const set = new Set(catalogPool.map((p) => p.category));
    return ["All", ...sortCategoryKeys(Array.from(set))];
  }, [catalogPool]);

  const filteredProducts = useMemo(() => {
    const lowered = searchTrim.toLowerCase();
    return catalogPool.filter((product) => {
      const categoryMatch = activeCategory === "All" || product.category === activeCategory;
      const code = (product.productcode || "").toLowerCase();
      const textMatch =
        lowered === "" ||
        product.productname.toLowerCase().includes(lowered) ||
        product.category.toLowerCase().includes(lowered) ||
        code.includes(lowered);
      return categoryMatch && textMatch;
    });
  }, [activeCategory, catalogPool, searchTrim]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of filteredProducts) {
      const list = map.get(product.category) ?? [];
      list.push(product);
      map.set(product.category, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.productcode.localeCompare(b.productcode, "en"));
    }
    const orderedKeys = sortCategoryKeys(Array.from(map.keys()));
    return orderedKeys.map((category) => [category, map.get(category)!] as const);
  }, [filteredProducts]);

  function onQuantityChange(productId: number, value: string) {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setQuantities((prev) => ({ ...prev, [productId]: value }));
    }
  }

  function onSpecialQtyChange(id: string, value: string) {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSpecialLines((lines) => lines.map((l) => (l.id === id ? { ...l, qty: value } : l)));
    }
  }

  async function onSubmit() {
    setError("");
    const orderItems: Array<{ productid: number; quantity: number; customname?: string }> = [];

    for (const [productidStr, quantityStr] of Object.entries(quantities)) {
      const quantity = Number(quantityStr);
      if (quantity > 0) {
        orderItems.push({ productid: Number(productidStr), quantity });
      }
    }

    for (const line of specialLines) {
      const name = line.name.trim();
      const quantity = Number(line.qty);
      if (name && quantity > 0) {
        orderItems.push({ productid: 0, quantity, customname: name });
      }
    }

    if (orderItems.length === 0) {
      setError("กรุณาระบุจำนวนสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchid: branchId,
          branchname: branchName,
          items: orderItems
        })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Failed to submit order.");
      }

      setShowSuccess(true);
      setQuantities({});
      setSpecialLines([newSpecialLine()]);
      setSubmittedOnce(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unexpected error while saving order.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="order-search-panel no-print">
        <label htmlFor="order-product-search" className="order-search-label">
          ค้นหาสินค้า (ชื่อหรือรหัส เช่น A0005)
        </label>
        <input
          id="order-product-search"
          className="order-search-input"
          placeholder="พิมพ์ชื่อสินค้า หรือ รหัส — ค้นหาแล้วจะแสดงรายการทั้งหมดที่ตรงเงื่อนไข"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      {branchFilterHint ? (
        <p
          className="branch-filter-hint no-print"
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: 14,
            color: "#3d4a6b",
            background: "#f0f4fc",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d9e1f5"
          }}
        >
          {branchFilterHint}
        </p>
      ) : null}

      <div className="category-tabs no-print" style={{ marginTop: 14, marginBottom: 14 }}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`pill ${activeCategory === category ? "active" : ""}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: 92 }}>รหัส</th>
            <th>ชื่อสินค้า</th>
            <th style={{ width: 72 }}>หน่วย</th>
            <th style={{ width: 88 }}>ราคาต้นทุน</th>
            <th style={{ width: 140 }}>จำนวน</th>
          </tr>
        </thead>
        {productsByCategory.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: "16px", color: "#5c6478" }}>
                ไม่พบสินค้าตามคำค้นหาหรือหมวดที่เลือก — ลองค้นหาชื่อหรือรหัสสินค้า
              </td>
            </tr>
          </tbody>
        ) : (
          productsByCategory.map(([category, categoryProducts]) => (
            <tbody key={category}>
              <tr className="category-section-heading">
                <td colSpan={5}>
                  <span id={`order-section-${category}`} className="category-section-title">
                    {category}
                  </span>
                </td>
              </tr>
              {categoryProducts.map((product) => (
                <tr key={product.productid}>
                  <td>
                    <span className="product-code">{product.productcode || "—"}</span>
                  </td>
                  <td>{product.productname}</td>
                  <td>{product.unit}</td>
                  <td>{product.costprice.toFixed(2)}</td>
                  <td>
                    <input
                      inputMode="decimal"
                      placeholder="0"
                      value={quantities[product.productid] ?? ""}
                      onChange={(e) => onQuantityChange(product.productid, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          ))
        )}
      </table>

      <div className="special-order-block no-print" style={{ marginTop: 20 }}>
        <h3 className="category-section-title" style={{ marginBottom: 10, fontSize: "1.05rem" }}>
          อื่น ๆ / สั่งพิเศษ (ไม่มีในรายการ)
        </h3>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#5c6478" }}>
          ระบุชื่อสินค้าและจำนวนเมื่อต้องการสั่งนอกรายการ
        </p>
        <table>
          <thead>
            <tr>
              <th>ชื่อสินค้า (พิมพ์เอง)</th>
              <th style={{ width: 140 }}>จำนวน</th>
              <th style={{ width: 72 }} />
            </tr>
          </thead>
          <tbody>
            {specialLines.map((line) => (
              <tr key={line.id}>
                <td>
                  <input
                    placeholder="เช่น น้ำแข็งหลอด กระสอบ"
                    value={line.name}
                    onChange={(e) =>
                      setSpecialLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, name: e.target.value } : r))
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    value={line.qty}
                    onChange={(e) => onSpecialQtyChange(line.id, e.target.value)}
                  />
                </td>
                <td>
                  {specialLines.length > 1 ? (
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: "6px 8px" }}
                      onClick={() =>
                        setSpecialLines((rows) => rows.filter((r) => r.id !== line.id))
                      }
                    >
                      ลบ
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 10 }}
          onClick={() => setSpecialLines((rows) => [...rows, newSpecialLine()])}
        >
          + เพิ่มรายการพิเศษ
        </button>
      </div>

      {error ? <p style={{ color: "#aa2033", marginTop: 12 }}>{error}</p> : null}

      <div className="no-print" style={{ marginTop: 16 }}>
        <button
          className="primary"
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || submittedOnce}
        >
          {isSubmitting ? "Saving..." : "Confirm Order"}
        </button>
      </div>

      {showSuccess ? (
        <div className="success-modal" role="dialog" aria-modal="true">
          <div>
            <h3 style={{ marginTop: 0 }}>Order saved</h3>
            <p>Your order has been submitted successfully.</p>
            <button className="primary" type="button" onClick={() => setShowSuccess(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
