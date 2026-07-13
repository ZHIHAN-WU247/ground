"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "../../components/I18nProvider";
import {
  clearSupabaseAuthSession,
  getSupabaseAuthSession,
  isSupabaseAdminSession,
  SUPABASE_AUTH_EVENT
} from "../../lib/supabase-auth";

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const isAdminLoginPage = pathname === "/admin/login";
  const loginHref = `/admin/login?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    const syncAdminState = () => {
      const session = getSupabaseAuthSession();
      setHasAccess(Boolean(session?.accessToken) && isSupabaseAdminSession());
      setAdminEmail(session?.email ?? "");
      setIsReady(true);
    };

    syncAdminState();
    window.addEventListener("storage", syncAdminState);
    window.addEventListener(SUPABASE_AUTH_EVENT, syncAdminState);

    return () => {
      window.removeEventListener("storage", syncAdminState);
      window.removeEventListener(SUPABASE_AUTH_EVENT, syncAdminState);
    };
  }, []);

  useEffect(() => {
    if (!isReady || hasAccess || isAdminLoginPage) {
      return;
    }

    router.replace(loginHref);
  }, [hasAccess, isAdminLoginPage, isReady, loginHref, router]);

  const logoutAdmin = () => {
    clearSupabaseAuthSession();
    router.push("/admin/login");
    router.refresh();
  };

  if (isAdminLoginPage) {
    return <>{children}</>;
  }

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
              <Link className="button primary admin-access-login" href={loginHref}>
                {t("admin.access.login")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="shell admin-access-toolbar">
        <p className="muted">{adminEmail}</p>
        <button className="button" type="button" onClick={logoutAdmin}>
          Admin logout
        </button>
      </div>
      {children}
    </>
  );
}
