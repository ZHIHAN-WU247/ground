import { T } from "../../components/I18nProvider";
import { ProtectedLogisticsActions } from "./ProtectedLogisticsActions";

export default function LogisticsHomePage() {
  return (
    <div className="logistics-home">
      <section className="shell logistics-landing">
        <div className="logistics-hero-copy">
          <h1>
            <T id="logistics.home.titleLead" />
            <span className="logistics-title-accent">
              <T id="logistics.home.titleAccent" />
              <T id="logistics.home.titleEnd" />
            </span>
          </h1>
          <div className="protected-logistics-actions">
            <ProtectedLogisticsActions />
          </div>
        </div>
      </section>
    </div>
  );
}
