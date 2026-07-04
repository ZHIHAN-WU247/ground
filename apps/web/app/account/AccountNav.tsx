import Link from "next/link";
import { T } from "../../components/I18nProvider";

const accountLinks = [
  { href: "/account/profile", labelKey: "account.nav.profile" },
  { href: "/account/senders", labelKey: "account.nav.senders" },
  { href: "/account/recipients", labelKey: "account.nav.recipients" },
  { href: "/account/documents", labelKey: "account.nav.documents" }
];

export function AccountNav() {
  return (
    <div className="shell account-nav" aria-label="Account navigation">
      {accountLinks.map((item) => (
        <Link className="button" href={item.href} key={item.href}>
          <T id={item.labelKey} />
        </Link>
      ))}
    </div>
  );
}
