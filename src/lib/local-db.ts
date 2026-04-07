import { sql } from "@vercel/postgres";
import { randomUUID } from "crypto";
import { Branch, Product, SummaryRow } from "@/types/database";
import { compareCategoryOrder } from "@/lib/category-order";

/**
 * Normalize a product, ensuring empty string for productcode if missing.
 */
function normalizeProduct(raw: Product): Product {
  return {
    ...raw,
    productcode: raw.productcode ?? "",
  };
}

export async function getBranches(): Promise<Branch[]> {
  const { rows } = await sql<Branch>`
    SELECT branchid, branchname, deliverydays
    FROM branches
    ORDER BY branchname ASC
  `;
  return rows;
}

export async function getBranchById(branchid: number): Promise<Branch | null> {
  const { rows } = await sql<Branch>`
    SELECT branchid, branchname, deliverydays
    FROM branches
    WHERE branchid = ${branchid}
  `;
  return rows[0] || null;
}

export async function addBranch(branch: Partial<Branch>): Promise<void> {
  await sql`
    INSERT INTO branches (branchname, deliverydays)
    VALUES (${branch.branchname}, ${branch.deliverydays})
  `;
}

export async function updateBranch(branch: Branch): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE branches
    SET branchname = ${branch.branchname}, deliverydays = ${branch.deliverydays}
    WHERE branchid = ${branch.branchid}
  `;
  return rowCount > 0;
}

export async function deleteBranch(branchid: number): Promise<boolean> {
  try {
    const { rowCount } = await sql`
      DELETE FROM branches
      WHERE branchid = ${branchid}
    `;
    return rowCount > 0;
  } catch (err) {
    return false;
  }
}

export async function getProducts(): Promise<Product[]> {
  const { rows } = await sql<Product>`
    SELECT *
    FROM products
  `;
  // need to normalize and sort as before
  return rows
    .map(normalizeProduct)
    .sort((a, b) => {
      const c = compareCategoryOrder(a.category, b.category);
      if (c !== 0) return c;
      return a.productcode.localeCompare(b.productcode, "en");
    });
}

export async function addProduct(product: Partial<Product>): Promise<void> {
  await sql`
    INSERT INTO products (productcode, productname, unit, costprice, category)
    VALUES (${product.productcode}, ${product.productname}, ${product.unit}, ${product.costprice}, ${product.category})
  `;
}

export async function updateProduct(product: Product): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE products
    SET productcode = ${product.productcode}, productname = ${product.productname}, 
        unit = ${product.unit}, costprice = ${product.costprice}, category = ${product.category}
    WHERE productid = ${product.productid}
  `;
  return rowCount > 0;
}

export async function deleteProduct(productid: number): Promise<boolean> {
  try {
    const { rowCount } = await sql`
      DELETE FROM products
      WHERE productid = ${productid}
    `;
    return rowCount > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Insert a batch of orders into the database for a branch.
 * @returns Number of rows inserted.
 */
export async function insertOrders(
  branchId: number,
  branchName: string,
  items: Array<{ productid: number; quantity: number; customname?: string | null }>,
  customDate?: string
): Promise<number> {
  // Prepare new rows to insert
  const now = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
  const snapshot = branchName.trim();
  const rows = items
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const isSpecial = item.productid === 0;
      const customname = isSpecial ? (item.customname || "").trim() || null : null;
      return {
        orderid: randomUUID(),
        orderdate: now,
        branchid: branchId,
        branchname: snapshot,
        productid: isSpecial ? 0 : item.productid,
        quantity: item.quantity,
        status: "Pending",
        customname: customname,
      };
    })
    .filter((row) => {
      if (row.productid === 0) return Boolean(row.customname);
      return true;
    });

  if (rows.length === 0) return 0;

  if (rows.length === 0) return 0;


  try {
    const nowStr = new Date(now).toISOString();
    
    // Using individual inserts for better compatibility with vercel/postgres 
    // or we can build a single query with multiple parameters if needed.
    // Given @vercel/postgres, let's use a more robust way.
    for (const row of rows) {
      await sql`
        INSERT INTO orders (
          orderid, orderdate, branchid, branchname, productid, quantity, status, customname
        ) VALUES (
          ${row.orderid}, ${row.orderdate}, ${row.branchid}, ${row.branchname}, 
          ${row.productid}, ${row.quantity}, ${row.status}, ${row.customname}
        )
      `;
    }

    return rows.length;
  } catch (err) {
    console.error("Database Error:", err);
    throw err;
  }
}

export async function getSummaryRows(dateStr?: string): Promise<SummaryRow[]> {
  let targetDate = dateStr;
  if (!targetDate) {
    // Get current Thailand date (ICT, UTC+7)
    const now = new Date();
    const offset = 7 * 60; // 7 hours in minutes
    const localDate = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
    targetDate = localDate.toISOString().slice(0, 10);
  }

  // 1. Get regular products orders
  const { rows: regularRows } = await sql`
    SELECT 
      p.productid, 
      p.productcode, 
      p.productname, 
      p.category, 
      o.branchid, 
      SUM(o.quantity)::float as total_qty
    FROM products p
    JOIN orders o ON p.productid = o.productid::integer
    WHERE (o.orderdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date = ${targetDate}::date
    GROUP BY p.productid, p.productcode, p.productname, p.category, o.branchid
  `;

  // 2. Get special orders (productid = 0)
  const { rows: specialRows } = await sql`
    SELECT 
      0 as productid,
      '' as productcode,
      customname as productname, 
      'สั่งพิเศษ' as category, 
      branchid, 
      SUM(quantity)::float as total_qty
    FROM orders
    WHERE productid::integer = 0 
      AND (orderdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date = ${targetDate}::date
    GROUP BY customname, branchid
  `;

  const allRows = [...regularRows, ...specialRows];

  // 3. Pivot the data
  const pivotMap = new Map<string, SummaryRow>();

  for (const row of allRows) {
    const key = `${row.productid}-${row.productname}`;
    if (!pivotMap.has(key)) {
      pivotMap.set(key, {
        productid: Number(row.productid),
        productcode: row.productcode || "",
        productname: row.productname,
        category: row.category,
        byBranch: {}
      });
    }
    const item = pivotMap.get(key)!;
    item.byBranch[Number(row.branchid)] = Number(row.total_qty);
  }

  return Array.from(pivotMap.values());
}

export async function getPackingReport(dateStr?: string) {
  let targetDate = dateStr;
  if (!targetDate) {
    // Get current Thailand date (ICT, UTC+7)
    const now = new Date();
    const offset = 7 * 60; // 7 hours in minutes
    const localDate = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
    targetDate = localDate.toISOString().slice(0, 10);
  }

  // 1. Get kitchen prep (sum by product)
  const { rows: kitchenRows } = await sql`
    SELECT 
      p.productid, 
      p.productcode, 
      p.productname, 
      p.category, 
      p.unit,
      SUM(o.quantity)::float as "totalQty"
    FROM products p
    JOIN orders o ON p.productid = o.productid::integer
    WHERE (o.orderdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date = ${targetDate}::date
    GROUP BY p.productid, p.productcode, p.productname, p.category, p.unit
  `;

  // Include special orders in kitchen prep
  const { rows: specialKitchenRows } = await sql`
    SELECT 
      0 as productid,
      '' as productcode,
      customname as productname, 
      'สั่งพิเศษ' as category, 
      '—' as unit,
      SUM(quantity)::float as "totalQty"
    FROM orders
    WHERE productid::integer = 0 
      AND (orderdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date = ${targetDate}::date
    GROUP BY customname
  `;

  // 2. Get by branch details
  const branches = await getBranches();
  const { rows: orderRows } = await sql`
    SELECT 
      o.branchid,
      o.productid,
      o.customname,
      o.quantity::float as qty,
      o.orderdate,
      p.productcode,
      p.productname,
      p.category,
      p.unit
    FROM orders o
    LEFT JOIN products p ON o.productid::integer = p.productid
    WHERE (o.orderdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date = ${targetDate}::date
  `;

  const byBranch = branches.map(branch => {
    const branchOrders = orderRows.filter(r => Number(r.branchid) === branch.branchid);
    const lastOrder = branchOrders.reduce((latest, current) => {
      if (!latest || new Date(current.orderdate) > new Date(latest)) return current.orderdate;
      return latest;
    }, null as string | null);

    const lines = branchOrders.map(r => ({
      productid: Number(r.productid),
      productcode: r.productid === 0 ? "" : (r.productcode || ""),
      productname: r.productid === 0 ? (r.customname || "สั่งพิเศษ") : (r.productname || ""),
      category: r.productid === 0 ? "สั่งพิเศษ" : (r.category || ""),
      unit: r.productid === 0 ? "—" : (r.unit || ""),
      qty: Number(r.qty)
    }));

    return {
      branchid: branch.branchid,
      branchname: branch.branchname,
      lastOrderAt: lastOrder,
      lines
    };
  });

  return {
    date: targetDate,
    kitchen: [...kitchenRows, ...specialKitchenRows],
    byBranch
  };
}
