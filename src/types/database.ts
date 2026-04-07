export type Branch = {
  branchid: number;
  branchname: string;
  deliverydays: string | null;
};

export type Product = {
  productid: number;
  /** Item code e.g. A0005, F0008 */
  productcode: string;
  productname: string;
  unit: string;
  costprice: number;
  category: string;
};

export type OrderInsert = {
  branchid: number;
  productid: number;
  quantity: number;
  status?: string;
};

export type OrderRow = {
  orderid: string;
  orderdate: string;
  branchid: number;
  /** Snapshot of branch name when the order was saved */
  branchname?: string | null;
  productid: number;
  quantity: number;
  status: string;
  /** Set when productid is 0 — manual / special order line */
  customname?: string | null;
};

export type SummaryRow = {
  productid: number;
  productcode?: string;
  productname: string;
  category: string;
  byBranch: Record<number, number>;
};
