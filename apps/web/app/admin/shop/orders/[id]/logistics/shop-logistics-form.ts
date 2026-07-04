import type { AddressContact, LogisticsRouteId, ShopOrder } from "@ground/shared";

export interface ShopLogisticsFormState {
  routeId: LogisticsRouteId;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCountry: string;
  senderProvince: string;
  senderCity: string;
  senderPostalCode: string;
  senderAddressLine: string;
  taxIdOrDocumentNo: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  packageCount: string;
  itemDeclaredValues: Record<string, string>;
}

export interface ShopLogisticsRequest {
  routeId: LogisticsRouteId;
  sender: AddressContact;
  itemDeclaredValues: Array<{
    productId: string;
    skuId: string;
    unitValueCny: number;
  }>;
  taxIdOrDocumentNo: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
}

export function createShopLogisticsFormState(order: ShopOrder): ShopLogisticsFormState {
  return {
    routeId: "air-cdek",
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    senderCountry: "China",
    senderProvince: "",
    senderCity: "",
    senderPostalCode: "",
    senderAddressLine: "",
    taxIdOrDocumentNo: "",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    packageCount: "1",
    itemDeclaredValues: Object.fromEntries(
      order.items.map((item) => [`${item.productId}:${item.skuId}`, ""])
    )
  };
}

export function buildShopLogisticsRequest(
  state: ShopLogisticsFormState,
  order: ShopOrder
): ShopLogisticsRequest {
  const requiredTextValues = [
    state.senderName,
    state.senderPhone,
    state.senderCountry,
    state.senderProvince,
    state.senderCity,
    state.senderPostalCode,
    state.senderAddressLine,
    state.taxIdOrDocumentNo
  ];
  const measurements = [
    Number(state.weightKg),
    Number(state.lengthCm),
    Number(state.widthCm),
    Number(state.heightCm)
  ];
  const packageCount = Number(state.packageCount);
  const itemDeclaredValues = order.items.map((item) => ({
    productId: item.productId,
    skuId: item.skuId,
    unitValueCny: Number(state.itemDeclaredValues[`${item.productId}:${item.skuId}`])
  }));

  if (
    requiredTextValues.some((value) => !value.trim()) ||
    measurements.some((value) => !Number.isFinite(value) || value <= 0) ||
    !Number.isInteger(packageCount) ||
    packageCount <= 0 ||
    itemDeclaredValues.some((item) => !Number.isFinite(item.unitValueCny) || item.unitValueCny <= 0)
  ) {
    throw new Error("请完整填写寄件、申报和包裹信息，数值必须大于 0。");
  }

  return {
    routeId: state.routeId,
    sender: {
      name: state.senderName.trim(),
      phone: state.senderPhone.trim(),
      ...(state.senderEmail.trim() ? { email: state.senderEmail.trim() } : {}),
      country: state.senderCountry.trim(),
      province: state.senderProvince.trim(),
      city: state.senderCity.trim(),
      postalCode: state.senderPostalCode.trim(),
      addressLine: state.senderAddressLine.trim()
    },
    itemDeclaredValues,
    taxIdOrDocumentNo: state.taxIdOrDocumentNo.trim(),
    weightKg: measurements[0]!,
    lengthCm: measurements[1]!,
    widthCm: measurements[2]!,
    heightCm: measurements[3]!,
    packageCount
  };
}
