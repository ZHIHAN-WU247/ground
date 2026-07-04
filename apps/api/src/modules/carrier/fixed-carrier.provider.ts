import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { LogisticsOrder, TrackingEvent } from "@ground/shared";

export interface CarrierCreateOrderResult {
  trackingNo: string;
  carrierReferenceNo: string;
}

export interface CarrierCreateLastMileResult {
  lastMileTrackingNo: string;
}

@Injectable()
export class FixedCarrierProvider {
  async createLogisticsOrder(order: LogisticsOrder): Promise<CarrierCreateOrderResult> {
    this.assertConfigured();

    return {
      trackingNo: `GLB${order.orderNo.slice(-8)}`,
      carrierReferenceNo: `CR${order.orderNo.slice(-8)}`
    };
  }

  async createLastMileOrder(order: LogisticsOrder): Promise<CarrierCreateLastMileResult> {
    this.assertConfigured();

    return {
      lastMileTrackingNo: `LM${order.orderNo.slice(-8)}`
    };
  }

  async pullTrackingEvents(order: LogisticsOrder): Promise<TrackingEvent[]> {
    this.assertConfigured();

    return [
      {
        id: `carrier-${order.id}-out-for-delivery`,
        status: "OUT_FOR_DELIVERY",
        title: "派送中",
        description: "Carrier reports that the parcel is out for delivery.",
        location: order.recipient.city,
        occurredAt: new Date().toISOString(),
        source: "CARRIER_API"
      }
    ];
  }

  private assertConfigured() {
    if (!process.env.CARRIER_API_BASE_URL || !process.env.CARRIER_API_KEY) {
      throw new ServiceUnavailableException("Carrier API is not configured.");
    }
  }
}
