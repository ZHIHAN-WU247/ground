import { Suspense } from "react";
import { PageHero } from "../../../components/PageHero";
import { CheckoutForm } from "./CheckoutForm";

export default function CheckoutPage() {
  return (
    <>
      <PageHero eyebrowKey="shop.checkout.eyebrow" titleKey="shop.checkout.title" descriptionKey="shop.checkout.description" />
      <section className="shell section">
        <Suspense fallback={<div className="empty-state">Loading checkout…</div>}>
          <CheckoutForm />
        </Suspense>
      </section>
    </>
  );
}
