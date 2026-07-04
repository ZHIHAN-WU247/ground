import Link from "next/link";
import { PageHero } from "../../../../components/PageHero";
import { StatusBadge } from "../../../../components/StatusBadge";
import { T } from "../../../../components/I18nProvider";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShopOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero eyebrowKey="shop.order.detail.eyebrow" title={id} descriptionKey="shop.order.detail.description" />
      <section className="shell section">
        <div className="panel">
          <StatusBadge status="CONFIRMED" />
          <p><T id="shop.order.detail.confirmed" /></p>
          <Link className="button primary" href="/logistics/tracking"><T id="shop.order.detail.gotoTracking" /></Link>
        </div>
      </section>
    </>
  );
}
