import type { TranslationKey } from "../../lib/i18n";

export const shopHomeActions: Array<{
  href: string;
  labelKey: TranslationKey;
  primary?: boolean;
}> = [
  { href: "/shop/products", labelKey: "shop.home.browse", primary: true },
  { href: "/shop/orders", labelKey: "shop.home.orders" }
];
