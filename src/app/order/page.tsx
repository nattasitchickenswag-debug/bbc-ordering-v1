import Link from "next/link";
import { getBranchById, getProducts } from "@/lib/local-db";
import OrderTable from "@/components/OrderTable";
import { Branch } from "@/types/database";

type Props = {
  searchParams: Promise<{
    branch?: string;
  }>;
};

async function getBranch(branchId: number): Promise<Branch | null> {
  return getBranchById(branchId);
}

export default async function OrderPage({ searchParams }: Props) {
  const params = await searchParams;
  const branchId = Number(params.branch);
  const branch = Number.isFinite(branchId) ? await getBranch(branchId) : null;

  if (!branch) {
    return (
      <main className="container">
        <div className="card">
          <h2>Invalid branch selection</h2>
          <Link href="/">Return to landing page</Link>
        </div>
      </main>
    );
  }

  const products = await getProducts();

  return (
    <main className="container">
      <div className="toolbar no-print" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Order for {branch.branchname}</h2>
        <Link href="/">Change Branch</Link>
      </div>
      <OrderTable branchId={branch.branchid} branchName={branch.branchname} products={products} />
    </main>
  );
}
