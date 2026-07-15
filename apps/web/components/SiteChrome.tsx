"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "./I18nProvider";
import { AuthRecoveryRedirect } from "./AuthRecoveryRedirect";
import {
  clearActiveLocalUserProfile,
  getActiveLocalUserProfile,
  LOCAL_USER_PROFILE_EVENT
} from "../lib/local-user-profile";
import { publicNavItems } from "./site-chrome-navigation";

const authNavLabels = {
  zh: {
    login: "登录",
    register: "注册",
    logout: "登出"
  },
  en: {
    login: "Login",
    register: "Register",
    logout: "Logout"
  },
  ru: {
    login: "Вход",
    register: "Регистрация",
    logout: "Выход"
  }
} as const;

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useI18n();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      const profile = getActiveLocalUserProfile();
      setIsSignedIn(Boolean(profile));
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener(LOCAL_USER_PROFILE_EVENT, syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener(LOCAL_USER_PROFILE_EVENT, syncAuthState);
    };
  }, []);

  const logout = () => {
    clearActiveLocalUserProfile();
    router.push("/");
    router.refresh();
  };

  const labels = authNavLabels[locale];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <AuthRecoveryRedirect />
      <header className="site-header">
        <div className="shell nav">
          <Link className="brand" href="/" aria-label="GROUND home">
            <img
              className="brand-logo"
              src="/images/ground-logo.png"
              alt="GROUND"
            />
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            {publicNavItems.map((item) => (
              <Link
                className={isActive(item.href) ? "active" : undefined}
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            {isSignedIn ? (
              <Link
                className={isActive("/account") ? "active" : undefined}
                href="/account/profile"
                aria-current={isActive("/account") ? "page" : undefined}
              >
                {t("nav.account")}
              </Link>
            ) : (
              <>
                <Link
                  className={isActive("/auth/login") ? "active" : undefined}
                  href="/auth/login"
                  aria-current={isActive("/auth/login") ? "page" : undefined}
                >
                  {labels.login}
                </Link>
                <Link
                  className={isActive("/auth/register") ? "active" : undefined}
                  href="/auth/register"
                  aria-current={isActive("/auth/register") ? "page" : undefined}
                >
                  {labels.register}
                </Link>
              </>
            )}
            {isSignedIn ? (
              <button className="nav-link-button" type="button" onClick={logout}>
                {labels.logout}
              </button>
            ) : null}
            <LanguageSwitcher />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
