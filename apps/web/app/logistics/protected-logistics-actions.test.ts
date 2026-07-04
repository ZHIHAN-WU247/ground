import assert from "node:assert/strict";

import { dictionaries } from "../../lib/i18n";
import { protectedLogisticsActions } from "./protected-logistics-actions";

assert.deepEqual(
  protectedLogisticsActions.map((action) => action.href),
  ["/logistics/quote", "/logistics/orders/new", "/logistics/tracking"]
);

assert.deepEqual(
  protectedLogisticsActions.map((action) => dictionaries.zh[action.descriptionKey]),
  [
    "点击输入重量、尺寸、收件地址查询派送到门的准确报价。",
    "真实创建物流订单，发货到国内中转仓库。",
    "实时查询货物信息，确保货物安全。"
  ]
);
