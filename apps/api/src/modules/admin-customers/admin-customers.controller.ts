import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuditLogService } from "../audit/audit-log.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { AdminCustomersService } from "./admin-customers.service";
import { ListAdminCustomersDto } from "./dto/list-admin-customers.dto";
import { ReviewCustomerDocumentDto } from "./dto/review-customer-document.dto";
import { SaveAdminCustomerAddressDto } from "./dto/save-admin-customer-address.dto";
import { UpdateCustomerRiskProfileDto } from "./dto/update-customer-risk-profile.dto";
import { UpdateAdminCustomerProfileDto } from "./dto/update-admin-customer-profile.dto";

interface RequestWithUser {
  user?: AuthenticatedUser;
  ip?: string;
  headers: {
    "user-agent"?: string;
  };
}

@Controller("admin/customers")
@UseGuards(SupabaseTokenGuard, AdminRoleGuard)
export class AdminCustomersController {
  constructor(
    private readonly adminCustomersService: AdminCustomersService,
    private readonly auditLogService: AuditLogService
  ) {}

  @Get("overview")
  listCustomers(@Query() query: ListAdminCustomersDto) {
    return this.adminCustomersService.listCustomers(query);
  }

  @Get(":email")
  getCustomer(@Param("email") email: string) {
    return this.adminCustomersService.getCustomer(email);
  }

  @Patch(":email/profile")
  async updateProfile(@Param("email") email: string, @Body() input: UpdateAdminCustomerProfileDto, @Req() request: RequestWithUser) {
    const customer = await this.adminCustomersService.updateProfile(email, input);
    await this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action: "admin.customer.profile.update",
      entityType: "customer_profile",
      beforeData: null,
      afterData: {
        email: customer.email,
        profile: customer.profile ?? null
      },
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
    return customer;
  }

  @Patch(":email/risk-profile")
  async updateRiskProfile(@Param("email") email: string, @Body() input: UpdateCustomerRiskProfileDto, @Req() request: RequestWithUser) {
    const customer = await this.adminCustomersService.updateRiskProfile(email, {
      adminNote: input.adminNote,
      tags: input.tags,
      riskLevel: input.riskLevel,
      isBlacklisted: input.isBlacklisted,
      restrictionReason: input.restrictionReason,
      ...(input.followUpAt ? { followUpAt: input.followUpAt } : {})
    });
    await this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action: "admin.customer.risk-profile.update",
      entityType: "customer_risk_profile",
      beforeData: null,
      afterData: {
        email: customer.email,
        riskProfile: customer.riskProfile
      },
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
    return customer;
  }

  @Patch(":email/documents/:documentId/review")
  async reviewDocument(
    @Param("email") email: string,
    @Param("documentId") documentId: string,
    @Body() input: ReviewCustomerDocumentDto,
    @Req() request: RequestWithUser
  ) {
    const customer = await this.adminCustomersService.reviewDocument(email, documentId, {
      status: input.status,
      ...(input.note ? { note: input.note } : {}),
      ...(request.user?.email ? { reviewedBy: request.user.email } : {})
    });
    const document = customer.documents.find((item) => item.id === documentId);
    await this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action: "admin.customer.document.review",
      entityType: "customer_document",
      entityId: documentId,
      beforeData: null,
      afterData: {
        email: customer.email,
        document: document ?? null
      },
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
    return customer;
  }

  @Post(":email/addresses")
  async saveAddress(@Param("email") email: string, @Body() input: SaveAdminCustomerAddressDto, @Req() request: RequestWithUser) {
    const customer = await this.adminCustomersService.saveAddress(email, {
      id: input.id ?? "",
      label: input.label,
      kind: input.kind,
      name: input.name,
      phone: input.phone,
      ...(input.email ? { email: input.email } : {}),
      country: input.country,
      province: input.province,
      city: input.city,
      postalCode: input.postalCode,
      addressLine: input.addressLine,
      ...(input.locationCode ? { locationCode: input.locationCode } : {}),
      ...(input.fiasGuid ? { fiasGuid: input.fiasGuid } : {}),
      isDefault: input.isDefault
    });
    await this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action: input.id ? "admin.customer.address.update" : "admin.customer.address.create",
      entityType: "customer_address",
      beforeData: null,
      afterData: {
        email: customer.email,
        address: customer.addresses.find((address) => address.id === input.id) ?? customer.addresses.find((address) => address.label === input.label) ?? null
      },
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
    return customer;
  }

  @Delete(":email/addresses/:addressId")
  async deleteAddress(@Param("email") email: string, @Param("addressId") addressId: string, @Req() request: RequestWithUser) {
    const customer = await this.adminCustomersService.deleteAddress(email, addressId);
    await this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action: "admin.customer.address.delete",
      entityType: "customer_address",
      entityId: addressId,
      beforeData: null,
      afterData: {
        email: customer.email,
        addressId
      },
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
    return customer;
  }
}
