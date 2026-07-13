export const accountLinks = [
  { href: "/account/profile", labelKey: "account.nav.profile" },
  { href: "/account/orders", labelKey: "account.nav.orders" },
  { href: "/account/senders", labelKey: "account.nav.senders" },
  { href: "/account/recipients", labelKey: "account.nav.recipients" },
  { href: "/account/documents", labelKey: "account.nav.documents" }
] as const;

export function getActiveAccountHref(pathname: string) {
  return accountLinks.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? "";
}
