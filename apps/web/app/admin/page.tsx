import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { T } from "../../components/I18nProvider";

const modules = [
  { href: "/admin/logistics/orders", titleKey: "admin.module.logistics.title", bodyKey: "admin.module.logistics.body" },
  { href: "/admin/shop/orders", titleKey: "admin.module.shop.title", bodyKey: "admin.module.shop.body" },
  { href: "/admin/customers/recipients", titleKey: "admin.module.customers.title", bodyKey: "admin.module.customers.body" }
];

export default function AdminPage() {
  return (
    <>
      <PageHero eyebrowKey="admin.home.eyebrow" titleKey="admin.home.title" descriptionKey="admin.home.description" />
      <section className="shell section">
        <div className="grid three">
          {modules.map((item) => (
            <Link className="card" href={item.href} key={item.href}>
              <h3><T id={item.titleKey} /></h3>
              <p><T id={item.bodyKey} /></p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
