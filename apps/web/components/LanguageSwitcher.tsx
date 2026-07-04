"use client";

import { localeLabels, localeNames, locales } from "../lib/i18n";
import { useI18n } from "./I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="language-switcher" aria-label={t("nav.language")}>
      {locales.map((item) => (
        <button
          className={`language-pill${item === locale ? " active" : ""}`}
          key={item}
          type="button"
          aria-label={localeNames[item]}
          aria-pressed={item === locale}
          onClick={() => setLocale(item)}
        >
          {localeLabels[item]}
        </button>
      ))}
    </div>
  );
}
