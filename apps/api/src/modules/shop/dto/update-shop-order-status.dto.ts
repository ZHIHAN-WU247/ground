import { IsIn } from "class-validator";
import type { ShopOrderStatus } from "@ground/shared";

export class UpdateShopOrderStatusDto {
  @IsIn(["CONFIRMED", "CANCELLED"] satisfies ShopOrderStatus[])
  status: Extract<ShopOrderStatus, "CONFIRMED" | "CANCELLED">;
}
