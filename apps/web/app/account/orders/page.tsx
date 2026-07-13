import { T } from "../../../components/I18nProvider";
import { AccountNav } from "../AccountNav";
import { AccountOrdersClient } from "./AccountOrdersClient";

export default function AccountOrdersPage() {
  return (
    <div className="account-themed-page account-orders-page">
      <AccountNav />
      <section className="shell section account-themed-page-content">
        <div className="section-heading-row">
          <div>
            <h1><T id="account.orders.title" /></h1>
            <p><T id="account.orders.description" /></p>
          </div>
        </div>
        <AccountOrdersClient />
      </section>
    </div>
  );
}
