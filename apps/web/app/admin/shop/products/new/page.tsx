import { PageHero } from "../../../../../components/PageHero";
import { ProductForm } from "./ProductForm";

export default function AdminNewProductPage() {
  return (
    <>
      <PageHero eyebrowKey="admin.shop.products.eyebrow" titleKey="admin.shop.products.new" descriptionKey="admin.shop.products.newDescription" />
      <section className="shell section">
        <ProductForm />
      </section>
    </>
  );
}
