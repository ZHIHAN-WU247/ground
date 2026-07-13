import { AdminCustomerDetailClient } from "./AdminCustomerDetailClient";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  return <AdminCustomerDetailClient email={decodeURIComponent(email)} />;
}
