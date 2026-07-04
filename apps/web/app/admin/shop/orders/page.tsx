import { PageHero } from "../../../../components/PageHero";
import { AdminShopNavigation } from "../AdminShopNavigation";
import { AdminShopOrdersClient } from "./AdminShopOrdersClient";

export default function AdminShopOrdersPage() {
  return (
    <>
      <PageHero eyebrowKey="admin.shop.orders.eyebrow" titleKey="admin.shop.orders.title" descriptionKey="admin.shop.orders.description" />
      <section className="shell admin-shop-navigation-shell">
        <AdminShopNavigation />
      </section>
      <section className="shell section">
        <AdminShopOrdersClient />
      </section>
    </>
  );
}
