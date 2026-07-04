import { PageHero } from "../../../../components/PageHero";
import { LogisticsOrderDetailClient } from "./LogisticsOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LogisticsOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero eyebrowKey="tracking.eyebrow" title={id} descriptionKey="orders.detail.description" />
      <section className="shell section">
        <LogisticsOrderDetailClient id={id} />
      </section>
    </>
  );
}
