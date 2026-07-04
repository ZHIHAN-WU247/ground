import { AccountNav } from "../AccountNav";
import { AddressBookClient } from "../AddressBookClient";

export default function SendersPage() {
  return (
    <div className="account-themed-page account-senders-page">
      <AccountNav />
      <section className="shell section account-themed-page-content">
        <AddressBookClient kind="sender" />
      </section>
    </div>
  );
}
