"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package } from "lucide-react";
import {
  adminShopNavigationItems,
  getActiveAdminShopSection
} from "./admin-shop-navigation";

const icons = {
  orders: ClipboardList,
  products: Package
};

export function AdminShopNavigation() {
  const pathname = usePathname();
  const activeSection = getActiveAdminShopSection(pathname);

  return (
    <nav className="admin-shop-navigation" aria-label="电商管理">
      <div className="admin-shop-navigation-title">
        <span>电商管理</span>
        <p>客户订单与商品资料在同一工作区管理</p>
      </div>
      <div className="admin-shop-navigation-links">
        {adminShopNavigationItems.map((item) => {
          const Icon = icons[item.section];
          const isActive = item.section === activeSection;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "active" : ""}
              href={item.href}
              key={item.section}
            >
              <Icon size={19} />
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
