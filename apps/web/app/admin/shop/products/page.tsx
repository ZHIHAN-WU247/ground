import { PageHero } from "../../../../components/PageHero";
import { AdminShopNavigation } from "../AdminShopNavigation";
import { ProductAdminList } from "./ProductAdminList";

export default function AdminShopProductsPage() {
  return (
    <>
      <PageHero
        eyebrowKey="admin.shop.products.eyebrow"
        titleKey="admin.shop.products.title"
        descriptionKey="admin.shop.products.description"
        actions={[{ href: "/admin/shop/products/new", labelKey: "admin.shop.products.new", primary: true }]}
      />
      <section className="shell admin-shop-navigation-shell">
        <AdminShopNavigation />
      </section>
      <section className="shell section">
        <ProductAdminList />
      </section>
    </>
  );
}
