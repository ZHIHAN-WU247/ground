import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminShopOrderLogisticsPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/logistics/shop-orders/${id}`);
}
