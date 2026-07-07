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
    return (
      <section className="admin-access-page">
        <div className="shell admin-access-content">
          <div className="empty-state">{t("admin.access.loading")}</div>
        </div>
      </section>
    );
  }

  if (!hasAccess) {
    return (
      <section className="admin-access-page">
        <div className="shell admin-access-content">
          <div className="admin-access-card">
            <div className="button-row">
              <Link className="button primary admin-access-login" href="/auth/login">
                {t("admin.access.login")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
