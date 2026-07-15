import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Product, ShopOrder } from "@ground/shared";
import { AuditLogService } from "../audit/audit-log.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { CreateProductDto, UpdateProductStatusDto } from "./dto/create-product.dto";
import { CreateShopLogisticsOrderDto } from "./dto/create-shop-logistics-order.dto";
import { UpdateShopOrderStatusDto } from "./dto/update-shop-order-status.dto";
import { ShopOrderLogisticsBridgeService } from "./shop-order-logistics-bridge.service";
import { ShopService } from "./shop.service";
import { ProductImageUploadService } from "./product-image-upload.service";

interface RequestWithUser {
  user?: AuthenticatedUser;
  ip?: string;
  headers: {
    "user-agent"?: string;
  };
}

interface ProductImageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller("admin/shop")
@UseGuards(SupabaseTokenGuard, AdminRoleGuard)
export class AdminShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly shopOrderLogisticsBridgeService: ShopOrderLogisticsBridgeService,
    private readonly auditLogService: AuditLogService,
    private readonly productImageUploadService: ProductImageUploadService
  ) {}

  @Get("products")
  listProducts(): Promise<Product[]> {
    return this.shopService.listAdminProducts();
  }

  @Get("products/:id")
  getProduct(@Param("id") id: string): Promise<Product> {
    return this.shopService.getAdminProduct(id);
  }

  @Post("product-images")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2_000_000 } }))
  uploadProductImage(@UploadedFile() file?: ProductImageFile) {
    if (!file) {
      throw new BadRequestException("Product image file is required.");
    }

    return this.productImageUploadService.uploadProductImage({
      bytes: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype
    });
  }

  @Post("products")
  async createProduct(@Body() input: CreateProductDto, @Req() request: RequestWithUser): Promise<Product> {
    const product = await this.shopService.createProduct({
      ...input,
      galleryImageUrls: input.galleryImageUrls ?? []
    });
    await this.recordAudit(request, "shop.product.create", "product", product.id, this.productAuditData(product));
    return product;
  }

  @Patch("products/:id")
  async updateProduct(@Param("id") id: string, @Body() input: CreateProductDto, @Req() request: RequestWithUser): Promise<Product> {
    const product = await this.shopService.updateProduct(id, {
      ...input,
      galleryImageUrls: input.galleryImageUrls ?? []
    });
    await this.recordAudit(request, "shop.product.update", "product", product.id, this.productAuditData(product));
    return product;
  }

  @Patch("products/:id/status")
  async updateProductStatus(@Param("id") id: string, @Body() input: UpdateProductStatusDto, @Req() request: RequestWithUser): Promise<Product> {
    const product = await this.shopService.setProductPublished(id, input.isPublished);
    await this.recordAudit(request, "shop.product.status.update", "product", product.id, this.productAuditData(product));
    return product;
  }

  @Delete("products/:id")
  async deleteProduct(@Param("id") id: string, @Req() request: RequestWithUser): Promise<Product> {
    const product = await this.shopService.deleteProduct(id);
    await this.recordAudit(request, "shop.product.delete", "product", product.id, this.productAuditData(product));
    return product;
  }

  @Get("orders")
  listOrders() {
    return this.shopService.listAdminOrders();
  }

  @Get("orders/logistics-handoffs")
  listLogisticsHandoffs() {
    return this.shopService.listLogisticsHandoffs();
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.shopService.getAdminOrder(id);
  }

  @Patch("orders/:id/status")
  async updateOrderStatus(@Param("id") id: string, @Body() input: UpdateShopOrderStatusDto, @Req() request: RequestWithUser) {
    const order = await this.shopService.updateOrderStatus(id, input.status);
    await this.recordAudit(request, "shop.order.status.update", "shop_order", order.id, this.shopOrderAuditData(order));
    return order;
  }

  @Post("orders/:id/logistics")
  async submitOrderToLogistics(@Param("id") id: string, @Body() input: CreateShopLogisticsOrderDto, @Req() request: RequestWithUser) {
    const result = await this.shopOrderLogisticsBridgeService.submit(id, input);
    await this.recordAudit(request, "shop.order.submit-logistics", "shop_order", result.shopOrder.id, {
      ...this.shopOrderAuditData(result.shopOrder),
      logisticsOrderId: result.logisticsOrder.id,
      logisticsOrderNo: result.logisticsOrder.orderNo
    });
    return result;
  }

  private async recordAudit(request: RequestWithUser, action: string, entityType: string, entityId: string, afterData: Record<string, unknown>) {
    await this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action,
      entityType,
      entityId,
      beforeData: null,
      afterData,
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
  }

  private productAuditData(product: Product) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      categorySlug: product.categorySlug,
      isPublished: product.isPublished
    };
  }

  private shopOrderAuditData(order: ShopOrder) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      ownerEmail: order.ownerEmail ?? null,
      totalAmount: order.totalAmount,
      currency: order.currency
    };
  }
}
