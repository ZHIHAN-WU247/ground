import type { LogisticsOrder } from "@ground/shared";

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

export function formatAccountLogisticsQuote(order: LogisticsOrder, fallback: string) {
  if (!order.estimatedQuote) {
    return fallback;
  }

  return formatAmount(order.estimatedQuote.totalAmount, order.estimatedQuote.currency);
}
