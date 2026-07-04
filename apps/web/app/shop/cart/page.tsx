import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { T } from "../../../components/I18nProvider";

export default function CartPage() {
  return (
    <>
      <PageHero eyebrowKey="shop.cart.eyebrow" titleKey="shop.cart.title" descriptionKey="shop.cart.description" />
      <section className="shell section">
        <div className="empty-state">
          <T id="shop.cart.empty" />
          <div className="button-row">
            <Link className="button primary" href="/shop/products"><T id="shop.home.browse" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
