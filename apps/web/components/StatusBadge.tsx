"use client";

import type { LogisticsStatus, ShopOrderStatus } from "@ground/shared";
import { useI18n } from "./I18nProvider";

interface StatusBadgeProps {
  status: LogisticsStatus | ShopOrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const isGood = status === "DELIVERED" || status === "CONFIRMED" || status === "LINKED_TO_LOGISTICS";
  const isBad = status === "REJECTED" || status === "EXCEPTION" || status === "CANCELLED";
  const tone = isGood ? " success" : isBad ? " danger" : "";

  return <span className={`status${tone}`}>{t(`status.${status}`)}</span>;
}
