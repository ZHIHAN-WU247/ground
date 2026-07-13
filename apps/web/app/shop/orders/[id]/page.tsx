import { PageHero } from "../../../../components/PageHero";
import { ShopOrderDetailClient } from "./ShopOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShopOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero eyebrowKey="shop.order.detail.eyebrow" title={id} descriptionKey="shop.order.detail.description" />
      <section className="shell section">
        <ShopOrderDetailClient id={id} />
      </section>
    </>
  );
}
