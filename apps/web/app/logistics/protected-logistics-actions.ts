import type { TranslationKey } from "../../lib/i18n";

export interface ProtectedLogisticsAction {
  href: string;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  tone: "coral" | "ink" | "violet";
}

export const protectedLogisticsActions: ProtectedLogisticsAction[] = [
  {
    href: "/logistics/quote",
    labelKey: "logistics.home.action.quote",
    descriptionKey: "logistics.home.action.quote.description",
    tone: "coral"
  },
  {
    href: "/logistics/orders/new",
    labelKey: "logistics.home.action.createOrder",
    descriptionKey: "logistics.home.action.createOrder.description",
    tone: "ink"
  },
  {
    href: "/logistics/tracking",
    labelKey: "logistics.home.action.tracking",
    descriptionKey: "logistics.home.action.tracking.description",
    tone: "violet"
  }
];
