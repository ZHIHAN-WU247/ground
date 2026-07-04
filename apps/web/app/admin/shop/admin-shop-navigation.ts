export type AdminShopSection = "orders" | "products";

export const adminShopNavigationItems: ReadonlyArray<{
  href: string;
  label: string;
  description: string;
  section: AdminShopSection;
}> = [
  {
    href: "/admin/shop/orders",
    label: "订单管理",
    description: "查看并确认客户订单",
    section: "orders"
  },
  {
    href: "/admin/shop/products",
    label: "商品管理",
    description: "维护商品、图片与上下架",
    section: "products"
  }
];

export function getActiveAdminShopSection(pathname: string): AdminShopSection {
  return pathname.startsWith("/admin/shop/orders") ? "orders" : "products";
}
