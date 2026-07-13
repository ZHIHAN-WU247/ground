import { LogisticsOrderDetailClient } from "./LogisticsOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LogisticsOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="order-detail-page">
      <section className="shell order-detail-content">
        <LogisticsOrderDetailClient id={id} />
      </section>
    </main>
  );
}
