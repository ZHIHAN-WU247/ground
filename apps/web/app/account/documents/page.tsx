import { T } from "../../../components/I18nProvider";
import { AccountNav } from "../AccountNav";

export default function DocumentsPage() {
  return (
    <div className="account-themed-page account-documents-page">
      <AccountNav />
      <section className="shell section account-themed-page-content">
        <div className="panel">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="document"><T id="account.documents.upload" /></label>
              <input id="document" type="file" />
            </div>
          </div>
          <p className="muted"><T id="account.documents.note" /></p>
        </div>
      </section>
    </div>
  );
}
