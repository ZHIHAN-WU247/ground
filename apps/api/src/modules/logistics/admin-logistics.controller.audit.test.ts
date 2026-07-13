import assert from "node:assert/strict";
import { AdminLogisticsController } from "./admin-logistics.controller";

const request = {
  user: { id: "local-admin-admin@example.com", email: "admin@example.com", role: "admin" as const },
  ip: "127.0.0.1",
  headers: { "user-agent": "controller-test" }
};

class FakeAuditLogService {
  logs: Array<Record<string, unknown>> = [];

  async recordLog(input: Record<string, unknown>) {
    this.logs.push(input);
    return { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() };
  }
}

const order = {
  id: "030ed125-052e-47f4-aceb-82db7548e633",
  orderNo: "AE202600000001",
  status: "APPROVED",
  reviewState: "APPROVED"
};

const run = async () => {
  const auditLogService = new FakeAuditLogService();
  const logisticsService = {
    listAdminOrders: async () => [],
    getOrder: async () => order,
    handshakeCdek: async () => ({ ok: true }),
    listPricingRouteConfigs: async () => [],
    updatePricingRouteConfig: async () => ({ routeId: "air-ems", isActive: true }),
    listRegionConfigs: async () => [],
    updateRegionCountry: async () => ({ isoCode: "RU", isActive: true }),
    updateRegionCity: async () => ({ id: "030ed125-052e-47f4-aceb-82db7548e633", name: "Moscow", isActive: true }),
    reviewOrder: async () => order,
    retryTrackingNumberAssignment: async () => order,
    assignManualTrackingNumber: async () => ({ ...order, trackingNo: "TRACK-1" }),
    markInbound: async () => ({ ...order, status: "ACCEPTED" }),
    addManualTrackingEvent: async () => ({ ...order, status: "IN_TRANSIT" }),
    createLastMileOrder: async () => ({ ...order, lastMileTrackingNo: "LM-1" }),
    syncLastMileTracking: async () => order,
    createCdekLabel: async () => ({ ...order, labelStatus: "READY" }),
    refreshCdekLabel: async () => ({ ...order, labelStatus: "READY" }),
    syncCdekTracking: async () => ({ ...order, trackingSyncStatus: "SYNCED" })
  };
  const carrierConfigService = {
    listConfigs: async () => [],
    updateConfig: async () => ({ id: "6c319af4-aab8-485c-9d92-fb7ec05d32b7", providerCode: "cdek", isActive: true })
  };
  const controller = new AdminLogisticsController(logisticsService as never, carrierConfigService as never, auditLogService as never);

  await controller.reviewOrder(order.id, { decision: "APPROVE" } as never, request as never);
  await controller.updatePricingRouteConfig("air-ems", { isActive: true } as never, request as never);
  await controller.updateCarrierConfig("cdek", { isActive: true } as never, request as never);
  await controller.assignManualTrackingNumber(order.id, { trackingNo: "TRACK-1", carrierReferenceNo: "REF-1" }, request as never);

  assert.deepEqual(auditLogService.logs.map((log) => log.action), [
    "logistics.order.review",
    "logistics.pricing-route.update",
    "logistics.carrier-config.update",
    "logistics.order.manual-tracking"
  ]);
  assert.equal(auditLogService.logs[0]?.entityType, "logistics_order");
  assert.equal(auditLogService.logs[0]?.entityId, order.id);
  assert.equal((auditLogService.logs[0]?.afterData as Record<string, unknown>).status, "APPROVED");
  assert.equal(auditLogService.logs[1]?.entityId, undefined);
  assert.equal((auditLogService.logs[1]?.afterData as Record<string, unknown>).routeId, "air-ems");
  assert.equal((auditLogService.logs[2]?.afterData as Record<string, unknown>).providerCode, "cdek");
  assert.equal((auditLogService.logs[3]?.afterData as Record<string, unknown>).trackingNo, "TRACK-1");
};

void run();
