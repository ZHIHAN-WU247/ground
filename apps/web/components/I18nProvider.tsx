"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isLocale, localeHtmlLang, translate, type Locale, type TranslationKey } from "../lib/i18n";

const STORAGE_KEY = "ground.locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);

    if (isLocale(storedLocale)) {
      setLocaleState(storedLocale);
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang[locale];

    if (isReady) {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
  }, [isReady, locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
  };

  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}

export function T({ id, values }: { id: TranslationKey; values?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <>{t(id, values)}</>;
}
