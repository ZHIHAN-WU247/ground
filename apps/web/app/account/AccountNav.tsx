"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "../../components/I18nProvider";
import { accountLinks, getActiveAccountHref } from "./account-navigation";

export function AccountNav() {
  const pathname = usePathname();
  const activeHref = getActiveAccountHref(pathname);

  return (
    <div className="shell account-nav" aria-label="Account navigation">
      {accountLinks.map((item) => (
        <Link className={item.href === activeHref ? "button active" : "button"} href={item.href} key={item.href}>
          <T id={item.labelKey} />
        </Link>
      ))}
    </div>
  );
}
