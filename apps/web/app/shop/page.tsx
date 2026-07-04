import Link from "next/link";
import { T } from "../../components/I18nProvider";
import { ShopProductCatalog } from "./ShopProductCatalog";
import { shopHomeActions } from "./shop-home-actions";

export default function ShopHomePage() {
  return (
    <div className="shop-home">
      <section className="shell shop-home-intro">
        <div className="button-row">
          {shopHomeActions.map((action) => (
            <Link className={`button${action.primary ? " primary" : ""}`} href={action.href} key={action.href}>
              <T id={action.labelKey} />
            </Link>
          ))}
        </div>
      </section>
      <section className="shell section shop-home-catalog">
        <ShopProductCatalog />
      </section>
    </div>
  );
}
