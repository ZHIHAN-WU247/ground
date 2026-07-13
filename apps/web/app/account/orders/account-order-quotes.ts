import type { LogisticsOrder } from "@ground/shared";
import { selectQuoteRoutePrice } from "../../logistics/quote/quote-routes";

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

export function formatAccountLogisticsQuote(order: LogisticsOrder, fallback: string) {
  if (!order.estimatedQuote) {
    return fallback;
  }

  const routePrice = order.routeId
    ? selectQuoteRoutePrice({ ...order.estimatedQuote, cargoType: order.cargoType }, order.routeId)
    : undefined;

  if (routePrice) {
    return formatAmount(routePrice.amount, routePrice.currency);
  }

  return formatAmount(order.estimatedQuote.totalAmount, order.estimatedQuote.currency);
}
