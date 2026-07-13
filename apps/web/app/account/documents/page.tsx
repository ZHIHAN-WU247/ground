import { AccountNav } from "../AccountNav";
import { DocumentsClient } from "./DocumentsClient";

export default function DocumentsPage() {
  return (
    <div className="account-themed-page account-documents-page">
      <AccountNav />
      <section className="shell section account-themed-page-content">
        <DocumentsClient />
      </section>
    </div>
  );
}
