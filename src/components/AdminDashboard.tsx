"use client";

import { useEffect, useMemo, useState } from "react";
import { Branch, Product } from "@/types/database";
import { CATEGORY_DISPLAY_ORDER, sortCategoryKeys } from "@/lib/category-order";
import PackingPanel from "@/components/PackingPanel";

type SummaryRow = {
  productid: number;
  productcode?: string;
  productname: string;
  category: string;
  byBranch: Record<number, number>;
};

type Props = {
  branches: Branch[];
  products: Product[];
  initialSummary: SummaryRow[];
};

export default function AdminDashboard({ branches, products, initialSummary }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [date, setDate] = useState(() => {
    const now = new Date();
    // Use Thailand time for default date
    const offset = 7 * 60; // ICT is UTC+7
    const localDate = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
    return localDate.toISOString().slice(0, 10);
  });
  const [productForm, setProductForm] = useState({
    productid: "",
    productcode: "",
    productname: "",
    unit: "",
    costprice: "",
    category: ""
  });
  const [branchForm, setBranchForm] = useState({
    branchid: "",
    branchname: "",
    deliverydays: ""
  });
  const [message, setMessage] = useState("");

  const totalByProduct = useMemo(
    () =>
      summary.map((row) => {
        const match = products.find((p) => p.productid === row.productid);
        const productcode = row.productcode ?? match?.productcode ?? "";
        return {
          ...row,
          productcode,
          total: branches.reduce((acc, branch) => acc + (row.byBranch[branch.branchid] ?? 0), 0)
        };
      }),
    [branches, products, summary]
  );

  const pivotByCategory = useMemo(() => {
    const map = new Map<string, typeof totalByProduct>();
    // ซ่อนแถวที่มียอดรวมเป็น 0
    const filteredRows = totalByProduct.filter((row) => row.total > 0);

    for (const row of filteredRows) {
      const category = row.category || "Uncategorized";
      const list = map.get(category) ?? [];
      list.push(row);
      map.set(category, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const c = (a.productcode || "").localeCompare(b.productcode || "", "en");
        if (c !== 0) return c;
        return a.productname.localeCompare(b.productname, "th");
      });
    }
    const orderedCategories = sortCategoryKeys(Array.from(map.keys()));
    return orderedCategories.map((category) => ({
      category,
      rows: map.get(category)!
    }));
  }, [totalByProduct]);

  function branchSubtotal(rows: typeof totalByProduct, branchId: number): number {
    return rows.reduce((acc, row) => acc + (row.byBranch[branchId] ?? 0), 0);
  }

  const grandTotals = useMemo(() => {
    const byBranch: Record<number, number> = {};
    let grand = 0;
    for (const branch of branches) {
      const sum = totalByProduct.reduce((acc, row) => acc + (row.byBranch[branch.branchid] ?? 0), 0);
      byBranch[branch.branchid] = sum;
      grand += sum;
    }
    return { byBranch, grand };
  }, [branches, totalByProduct]);

  async function reloadSummary(filterDate?: string) {
    const query = filterDate ? `?date=${filterDate}` : "";
    const response = await fetch(`/api/admin/summary${query}`);
    if (!response.ok) return;
    const body = (await response.json()) as { rows: SummaryRow[] };
    setSummary(body.rows);
  }

  useEffect(() => {
    void reloadSummary(date);
  }, [date]);

  async function saveProduct() {
    const method = productForm.productid ? "PUT" : "POST";
    const response = await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productid: Number(productForm.productid || 0),
        productcode: productForm.productcode,
        productname: productForm.productname,
        unit: productForm.unit,
        costprice: Number(productForm.costprice),
        category: productForm.category
      })
    });

    if (response.ok) {
      setMessage("Product saved.");
      window.location.reload();
    }
  }

  async function deleteProduct() {
    if (!productForm.productid) return;
    const response = await fetch(`/api/products?productid=${productForm.productid}`, {
      method: "DELETE"
    });
    if (response.ok) {
      setMessage("Product deleted.");
      window.location.reload();
    }
  }

  async function saveBranch() {
    const method = branchForm.branchid ? "PUT" : "POST";
    const response = await fetch("/api/branches", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchid: Number(branchForm.branchid || 0),
        branchname: branchForm.branchname,
        deliverydays: branchForm.deliverydays
      })
    });
    if (response.ok) {
      setMessage("Branch saved.");
      window.location.reload();
    }
  }

  async function deleteBranch() {
    if (!branchForm.branchid) return;
    const response = await fetch(`/api/branches?branchid=${branchForm.branchid}`, {
      method: "DELETE"
    });
    if (response.ok) {
      setMessage("Branch deleted.");
      window.location.reload();
    }
  }

  return (
    <main className="container">
      <div className="toolbar no-print" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 14, color: "#5c6478" }}>วันที่</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="secondary" onClick={() => window.print()}>
            พิมพ์ Pivot (A4 แนวนอน)
          </button>
        </div>
      </div>

      <div className="no-print">
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Packing — คนจัดของ</h3>
        <p style={{ marginTop: 0, color: "#5c6478", fontSize: 14 }}>
          ใช้วันที่เดียวกับด้านบน: สรุปยอดรวมครัวกลาง และแยกตามสาขาเพื่อใส่กล่อง — ปุ่มพิมพ์ต่อสาขา
        </p>
        <PackingPanel filterDate={date} />
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Pivot Summary</h3>
        <table>
          <thead>
            <tr>
              <th>รหัส / ชื่อสินค้า</th>
              {branches.map((branch) => (
                <th key={branch.branchid}>{branch.branchname}</th>
              ))}
              <th>รวม</th>
            </tr>
          </thead>
          {pivotByCategory.map(({ category, rows }) => (
            <tbody key={category}>
              <tr className="category-section-heading">
                <td colSpan={branches.length + 2}>
                  <span className="category-section-title">{category}</span>
                </td>
              </tr>
              {rows.map((row) => (
                <tr key={`${row.productid}-${row.productname}`}>
                  <td>
                    <span className="product-code">{row.productcode || "—"}</span>
                    <span style={{ marginLeft: 8 }}>{row.productname}</span>
                  </td>
                  {branches.map((branch) => (
                    <td key={branch.branchid}>{(row.byBranch[branch.branchid] ?? 0).toFixed(2)}</td>
                  ))}
                  <td>{row.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="category-subtotal">
                <td>รวมหมวด — {category}</td>
                {branches.map((branch) => (
                  <td key={branch.branchid}>{branchSubtotal(rows, branch.branchid).toFixed(2)}</td>
                ))}
                <td>{rows.reduce((acc, row) => acc + row.total, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          ))}
          <tbody>
            <tr className="grand-total">
              <td>รวมทั้งหมด (ทุกหมวด)</td>
              {branches.map((branch) => (
                <td key={branch.branchid}>{(grandTotals.byBranch[branch.branchid] ?? 0).toFixed(2)}</td>
              ))}
              <td>{grandTotals.grand.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-2 no-print" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Manage Products</h3>
          <select
            value={productForm.productid}
            onChange={(e) => {
              const selected = products.find((p) => p.productid === Number(e.target.value));
              if (!selected) {
                setProductForm({
                  productid: "",
                  productcode: "",
                  productname: "",
                  unit: "",
                  costprice: "",
                  category: ""
                });
                return;
              }
              setProductForm({
                productid: String(selected.productid),
                productcode: selected.productcode || "",
                productname: selected.productname,
                unit: selected.unit,
                costprice: String(selected.costprice),
                category: selected.category
              });
            }}
          >
            <option value="">สินค้าใหม่</option>
            {products.map((product) => (
              <option key={product.productid} value={product.productid}>
                {product.productcode} · {product.productname}
              </option>
            ))}
          </select>
          <div className="grid" style={{ marginTop: 10 }}>
            <input
              placeholder="รหัสสินค้า (เช่น A0005, F0008)"
              value={productForm.productcode}
              onChange={(e) => setProductForm((p) => ({ ...p, productcode: e.target.value }))}
            />
            <input
              placeholder="ชื่อสินค้า (ภาษาไทย)"
              value={productForm.productname}
              onChange={(e) => setProductForm((p) => ({ ...p, productname: e.target.value }))}
            />
            <input
              placeholder="หน่วย"
              value={productForm.unit}
              onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))}
            />
            <input
              placeholder="ราคาต้นทุน"
              value={productForm.costprice}
              onChange={(e) => setProductForm((p) => ({ ...p, costprice: e.target.value }))}
            />
            <label htmlFor="product-category" style={{ fontSize: 14, color: "#5c6478" }}>
              หมวดหมู่
            </label>
            <select
              id="product-category"
              value={productForm.category}
              onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
            >
              <option value="">เลือกหมวด</option>
              {CATEGORY_DISPLAY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="button" className="primary" onClick={saveProduct}>
              Save Product
            </button>
            <button type="button" className="danger" onClick={deleteProduct}>
              Delete
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Manage Branches</h3>
          <select
            value={branchForm.branchid}
            onChange={(e) => {
              const selected = branches.find((b) => b.branchid === Number(e.target.value));
              if (!selected) {
                setBranchForm({ branchid: "", branchname: "", deliverydays: "" });
                return;
              }
              setBranchForm({
                branchid: String(selected.branchid),
                branchname: selected.branchname,
                deliverydays: selected.deliverydays || ""
              });
            }}
          >
            <option value="">New Branch</option>
            {branches.map((branch) => (
              <option key={branch.branchid} value={branch.branchid}>
                {branch.branchname}
              </option>
            ))}
          </select>
          <div className="grid" style={{ marginTop: 10 }}>
            <input
              placeholder="Branch Name"
              value={branchForm.branchname}
              onChange={(e) => setBranchForm((b) => ({ ...b, branchname: e.target.value }))}
            />
            <input
              placeholder="Delivery Days (e.g. Mon,Wed,Fri)"
              value={branchForm.deliverydays}
              onChange={(e) => setBranchForm((b) => ({ ...b, deliverydays: e.target.value }))}
            />
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="button" className="primary" onClick={saveBranch}>
              Save Branch
            </button>
            <button type="button" className="danger" onClick={deleteBranch}>
              Delete
            </button>
          </div>
        </div>
      </div>
      {message ? <p className="no-print">{message}</p> : null}
    </main>
  );
}
