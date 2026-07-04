import { PageHero } from "../../../components/PageHero";
import { ShopProductCatalog } from "../ShopProductCatalog";

export default function ProductsPage() {
  return (
    <>
      <PageHero eyebrowKey="shop.products.eyebrow" titleKey="shop.products.title" descriptionKey="shop.products.description" />
      <section className="shell section">
        <ShopProductCatalog />
      </section>
    </>
  );
}
