import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { LogisticsOrder } from "@ground/shared";
import { LogisticsService } from "../logistics/logistics.service";
import type { CreateShopLogisticsOrderDto } from "./dto/create-shop-logistics-order.dto";
import { ShopService } from "./shop.service";

type CompensatingLogisticsService = LogisticsService & {
  discardOrder(id: string): void;
};

@Injectable()
export class ShopOrderLogisticsBridgeService {
  private readonly processingOrderIds = new Set<string>();

  constructor(
    private readonly shopService: ShopService,
    private readonly logisticsService: LogisticsService
  ) {}

  async submit(identifier: string, input: CreateShopLogisticsOrderDto): Promise<{
    shopOrder: ReturnType<ShopService["getAdminOrder"]>;
    logisticsOrder: LogisticsOrder;
  }> {
    const shopOrder = this.shopService.getAdminOrder(identifier);

    if (shopOrder.status === "LINKED_TO_LOGISTICS") {
      throw new ConflictException("Shop order is already linked to a logistics order.");
    }

    if (shopOrder.status !== "CONFIRMED") {
      throw new BadRequestException("Only confirmed shop orders can be submitted to logistics.");
    }

    if (this.processingOrderIds.has(shopOrder.id)) {
      throw new ConflictException("Shop order is already being submitted to logistics.");
    }

    if (!input.taxIdOrDocumentNo.trim()) {
      throw new BadRequestException("Recipient tax or document number is required.");
    }

    const requiredSenderValues = [
      input.sender.name,
      input.sender.phone,
      input.sender.country,
      input.sender.province,
      input.sender.city,
      input.sender.postalCode,
      input.sender.addressLine
    ];

    if (requiredSenderValues.some((value) => !value.trim())) {
      throw new BadRequestException("Complete sender information is required.");
    }

    const declaredValueMap = new Map(
      input.itemDeclaredValues.map((item) => [`${item.productId}:${item.skuId}`, item.unitValueCny])
    );

    if (declaredValueMap.size !== shopOrder.items.length) {
      throw new BadRequestException("A positive RMB declared value is required for every shop order item.");
    }

    const cargoItems = shopOrder.items.map((item) => {
      const unitValueCny = declaredValueMap.get(`${item.productId}:${item.skuId}`);

      if (!unitValueCny || unitValueCny <= 0) {
        throw new BadRequestException("A positive RMB declared value is required for every shop order item.");
      }

      return {
        name: `${item.productName} / ${item.skuModel} / ${item.skuSize}`,
        unitValueCny,
        quantity: item.quantity
      };
    });

    this.processingOrderIds.add(shopOrder.id);

    try {
      const logisticsOrder = await this.logisticsService.createOrder({
        cargoType: "B2C",
        routeId: input.routeId,
        sender: input.sender,
        recipient: shopOrder.recipient,
        cargoItems,
        taxIdOrDocumentNo: input.taxIdOrDocumentNo,
        weightKg: input.weightKg,
        lengthCm: input.lengthCm,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        packageCount: input.packageCount
      });

      try {
        const linkedShopOrder = this.shopService.linkOrderToLogistics(shopOrder.id, logisticsOrder);
        return { shopOrder: linkedShopOrder, logisticsOrder };
      } catch (error) {
        (this.logisticsService as CompensatingLogisticsService).discardOrder(logisticsOrder.id);
        throw error;
      }
    } finally {
      this.processingOrderIds.delete(shopOrder.id);
    }
  }
}
