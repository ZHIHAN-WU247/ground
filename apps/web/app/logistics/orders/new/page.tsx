import { OrderCreateForm } from "./OrderCreateForm";

export default function NewLogisticsOrderPage() {
  return (
    <div className="order-create-page">
      <section className="shell section order-create-page-content">
        <OrderCreateForm />
      </section>
    </div>
  );
}
