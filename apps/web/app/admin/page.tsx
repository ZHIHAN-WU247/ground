import Link from "next/link";
import { T } from "../../components/I18nProvider";

const modules = [
  { href: "/admin/logistics/orders", titleKey: "admin.module.logistics.title", bodyKey: "admin.module.logistics.body" },
  { href: "/admin/shop/orders", titleKey: "admin.module.shop.title", bodyKey: "admin.module.shop.body" },
  { href: "/admin/customers/recipients", titleKey: "admin.module.customers.title", bodyKey: "admin.module.customers.body" }
];

export default function AdminPage() {
  return (
    <div className="admin-home-page">
      <section className="shell section admin-home-page-content">
        <div className="grid three admin-home-grid">
          {modules.map((item) => (
            <Link className="card admin-home-card" href={item.href} key={item.href}>
              <h3><T id={item.titleKey} /></h3>
              <p><T id={item.bodyKey} /></p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
