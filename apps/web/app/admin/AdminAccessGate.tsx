"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../../components/I18nProvider";
import { hasLocalAdminAccess } from "../../lib/local-user-profile";

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [isReady, setIsReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    setHasAccess(hasLocalAdminAccess());
    setIsReady(true);
  }, []);

  if (!isReady) {
    return <section className="shell section"><div className="empty-state">{t("admin.access.loading")}</div></section>;
  }

  if (!hasAccess) {
    return (
      <section className="shell section">
        <div className="panel">
          <h3>{t("admin.access.title")}</h3>
          <p className="muted">{t("admin.access.description")}</p>
          <div className="button-row">
            <Link className="button primary" href="/auth/login">
              {t("admin.access.login")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
