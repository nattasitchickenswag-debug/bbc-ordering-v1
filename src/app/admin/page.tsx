import AdminDashboard from "@/components/AdminDashboard";

import { getBranches, getProducts, getSummaryRows } from "@/lib/local-db";



export default async function AdminPage() {

  const [products, branches] = await Promise.all([getProducts(), getBranches()]);

  const initialSummary = await getSummaryRows();

  return <AdminDashboard branches={branches} products={products} initialSummary={initialSummary} />;

}

