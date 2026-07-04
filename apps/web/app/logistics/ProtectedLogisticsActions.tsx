"use client";

import { ArrowUpRight, Calculator, PackagePlus, Radar } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "../../components/I18nProvider";
import { buildLoginRedirectPath } from "../../lib/auth-redirect";
import { getActiveLocalUserProfile } from "../../lib/local-user-profile";
import { protectedLogisticsActions } from "./protected-logistics-actions";

const actionIcons = {
  coral: Calculator,
  ink: PackagePlus,
  violet: Radar
};

export function ProtectedLogisticsActions() {
  const router = useRouter();

  const openAction = (href: string) => {
    if (getActiveLocalUserProfile()) {
      router.push(href);
      return;
    }

    router.push(buildLoginRedirectPath(href));
  };

  return (
    <div className="button-row logistics-action-grid">
      {protectedLogisticsActions.map((action) => {
        const ActionIcon = actionIcons[action.tone];

        return (
          <button
            className={`button logistics-action-card ${action.tone}`}
            key={action.href}
            type="button"
            onClick={() => openAction(action.href)}
          >
            <span className="logistics-action-icon"><ActionIcon /></span>
            <span className="logistics-action-copy">
              <strong><T id={action.labelKey} /></strong>
              <small><T id={action.descriptionKey} /></small>
            </span>
            <ArrowUpRight className="logistics-action-arrow" />
          </button>
        );
      })}
    </div>
  );
}
