import { sampleRecipients } from "@ground/shared";
import { PageHero } from "../../../../components/PageHero";

export default function AdminRecipientsPage() {
  return (
    <>
      <PageHero eyebrowKey="admin.customers.recipients.eyebrow" titleKey="admin.customers.recipients.title" descriptionKey="admin.customers.recipients.description" />
      <section className="shell section">
        <div className="grid">
          {sampleRecipients.map((recipient) => (
            <div className="card" key={recipient.id}>
              <h3>{recipient.name}</h3>
              <p>{recipient.phone} · {recipient.email}</p>
              <p>{recipient.addressLine}, {recipient.city}, {recipient.country}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
