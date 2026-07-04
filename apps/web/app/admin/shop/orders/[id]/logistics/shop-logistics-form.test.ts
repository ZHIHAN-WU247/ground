import assert from "node:assert/strict";
import type { ShopOrder } from "@ground/shared";
import {
  buildShopLogisticsRequest,
  createShopLogisticsFormState
} from "./shop-logistics-form";

const order = {
  items: [
    { productId: "prod-1", skuId: "sku-1" },
    { productId: "prod-2", skuId: "sku-2" }
  ]
} as ShopOrder;
const state = createShopLogisticsFormState(order);

assert.deepEqual(state.itemDeclaredValues, {
  "prod-1:sku-1": "",
  "prod-2:sku-2": ""
});
assert.throws(() => buildShopLogisticsRequest(state, order), /请完整填写/i);

const request = buildShopLogisticsRequest({
  ...state,
  routeId: "air-cdek",
  senderName: " Ground warehouse ",
  senderPhone: "+86 755 1000 2000",
  senderEmail: "warehouse@ground.test",
  senderCountry: "China",
  senderProvince: "Guangdong",
  senderCity: "Shenzhen",
  senderPostalCode: "518000",
  senderAddressLine: "Warehouse Road 1",
  taxIdOrDocumentNo: "RU-DOC-1",
  weightKg: "2.5",
  lengthCm: "30",
  widthCm: "20",
  heightCm: "10",
  packageCount: "1",
  itemDeclaredValues: {
    "prod-1:sku-1": "88.5",
    "prod-2:sku-2": "12"
  }
}, order);

assert.equal(request.sender.name, "Ground warehouse");
assert.equal(request.weightKg, 2.5);
assert.equal(request.packageCount, 1);
assert.deepEqual(request.itemDeclaredValues, [
  { productId: "prod-1", skuId: "sku-1", unitValueCny: 88.5 },
  { productId: "prod-2", skuId: "sku-2", unitValueCny: 12 }
]);
