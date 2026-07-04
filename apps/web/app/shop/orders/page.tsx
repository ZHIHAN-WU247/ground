import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { StatusBadge } from "../../../components/StatusBadge";
import { T } from "../../../components/I18nProvider";

const orders = [
  {
    id: "shop-1001",
    orderNo: "SH202600000001",
    status: "CONFIRMED" as const,
    total: "89 USD",
    logisticsReferenceNo: "GLB10010001"
  }
];

export default function ShopOrdersPage() {
  return (
    <>
      <PageHero eyebrowKey="shop.orders.eyebrow" titleKey="shop.orders.title" descriptionKey="shop.orders.description" />
      <section className="shell section">
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th><T id="common.orderNo" /></th>
                <th><T id="common.amount" /></th>
                <th><T id="common.status" /></th>
                <th><T id="shop.orders.logisticsRef" /></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNo}</td>
                  <td>{order.total}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td><Link className="button" href="/logistics/tracking">{order.logisticsReferenceNo}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
