import assert from "node:assert/strict";
import { AdminShopController } from "./admin-shop.controller";

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

const product = {
  id: "030ed125-052e-47f4-aceb-82db7548e633",
  slug: "test-product",
  name: "Test product",
  summary: "Summary",
  description: "Description",
  imageUrl: "https://example.com/product.jpg",
  isPublished: false,
  categorySlug: "daily" as const,
  category: "Daily",
  skus: []
};

const order = {
  id: "6c319af4-aab8-485c-9d92-fb7ec05d32b7",
  orderNo: "SH202600000001",
  status: "CONFIRMED" as const,
  items: [],
  recipient: {
    name: "Ivan",
    phone: "+7000",
    country: "Russia",
    province: "Moscow",
    city: "Moscow",
    postalCode: "101000",
    addressLine: "Test"
  },
  totalAmount: 1,
  currency: "CNY" as const,
  createdAt: new Date().toISOString()
};

const run = async () => {
  const auditLogService = new FakeAuditLogService();
  const shopService = {
    createProduct: async () => product,
    updateOrderStatus: async () => order,
    listAdminProducts: async () => [],
    getAdminProduct: async () => product,
    updateProduct: async () => product,
    setProductPublished: async () => product,
    deleteProduct: async () => product,
    listAdminOrders: async () => [],
    listLogisticsHandoffs: async () => [],
    getAdminOrder: async () => order
  };
  const bridgeService = {
    submit: async () => ({
      shopOrder: { ...order, status: "LINKED_TO_LOGISTICS" as const, logisticsOrderId: "030ed125-052e-47f4-aceb-82db7548e633" },
      logisticsOrder: { id: "030ed125-052e-47f4-aceb-82db7548e633", orderNo: "AE202600000001" }
    })
  };
  const productImageUploadService = {
    uploadProductImage: async () => ({ url: "https://cdn.example.com/product.webp" })
  };
  const controller = new AdminShopController(shopService as never, bridgeService as never, auditLogService as never, productImageUploadService as never);

  await controller.createProduct({ ...product, galleryImageUrls: [] } as never, request as never);
  await controller.updateOrderStatus(order.id, { status: "CONFIRMED" }, request as never);
  await controller.submitOrderToLogistics(order.id, {} as never, request as never);

  assert.deepEqual(auditLogService.logs.map((log) => log.action), [
    "shop.product.create",
    "shop.order.status.update",
    "shop.order.submit-logistics"
  ]);
  assert.equal(auditLogService.logs[0]?.actorEmail, "admin@example.com");
  assert.equal(auditLogService.logs[0]?.entityType, "product");
  assert.equal(auditLogService.logs[0]?.entityId, product.id);
  assert.equal((auditLogService.logs[0]?.afterData as Record<string, unknown>).name, product.name);
  assert.equal((auditLogService.logs[1]?.afterData as Record<string, unknown>).status, "CONFIRMED");
  assert.equal((auditLogService.logs[2]?.afterData as Record<string, unknown>).logisticsOrderId, "030ed125-052e-47f4-aceb-82db7548e633");
};

void run();
