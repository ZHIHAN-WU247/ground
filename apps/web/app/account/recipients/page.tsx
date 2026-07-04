import { AccountNav } from "../AccountNav";
import { AddressBookClient } from "../AddressBookClient";

export default function RecipientsPage() {
  return (
    <div className="account-themed-page account-recipients-page">
      <AccountNav />
      <section className="shell section account-themed-page-content">
        <AddressBookClient kind="recipient" />
      </section>
    </div>
  );
}
