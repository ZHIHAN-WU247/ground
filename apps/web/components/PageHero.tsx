import Link from "next/link";
import { T } from "./I18nProvider";
import type { TranslationKey } from "../lib/i18n";

interface PageHeroAction {
  href: string;
  label?: React.ReactNode | undefined;
  labelKey?: TranslationKey | undefined;
  primary?: boolean | undefined;
}

interface PageHeroProps {
  eyebrow?: React.ReactNode | undefined;
  eyebrowKey?: TranslationKey | undefined;
  title?: React.ReactNode | undefined;
  titleKey?: TranslationKey | undefined;
  description?: React.ReactNode | undefined;
  descriptionKey?: TranslationKey | undefined;
  actions?: PageHeroAction[] | undefined;
  aside?: React.ReactNode | undefined;
}

function LocalizedText({ text, textKey }: { text?: React.ReactNode | undefined; textKey?: TranslationKey | undefined }) {
  if (textKey) {
    return <T id={textKey} />;
  }

  return <>{text}</>;
}

export function PageHero({ eyebrow, eyebrowKey, title, titleKey, description, descriptionKey, actions = [], aside }: PageHeroProps) {
  return (
    <section className="shell hero">
      <div>
        <p className="eyebrow"><LocalizedText text={eyebrow} textKey={eyebrowKey} /></p>
        <h1><LocalizedText text={title} textKey={titleKey} /></h1>
        <p className="hero-copy"><LocalizedText text={description} textKey={descriptionKey} /></p>
        {actions.length > 0 ? (
          <div className="button-row">
            {actions.map((action) => (
              <Link key={action.href} className={`button${action.primary ? " primary" : ""}`} href={action.href}>
                {action.labelKey ? <T id={action.labelKey} /> : action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {aside ? <div className="hero-card">{aside}</div> : null}
    </section>
  );
}
