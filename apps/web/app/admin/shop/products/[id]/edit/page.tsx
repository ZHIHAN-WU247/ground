import { PageHero } from "../../../../../../components/PageHero";
import { ProductEditLoader } from "./ProductEditLoader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero
        eyebrowKey="admin.shop.products.eyebrow"
        titleKey="admin.shop.products.edit"
        descriptionKey="admin.shop.products.editDescription"
      />
      <section className="shell section">
        <ProductEditLoader id={id} />
      </section>
    </>
  );
}
