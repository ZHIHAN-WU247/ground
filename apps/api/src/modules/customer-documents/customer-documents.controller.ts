import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { SaveCustomerDocumentDto } from "./dto/save-customer-document.dto";
import { CustomerDocumentsService } from "./customer-documents.service";

interface RequestWithUser {
  user: AuthenticatedUser;
}

@Controller("customer-documents")
export class CustomerDocumentsController {
  constructor(private readonly customerDocumentsService: CustomerDocumentsService) {}

  @Get()
  @UseGuards(SupabaseTokenGuard)
  listDocuments(@Req() request: RequestWithUser, @Query("ownerEmail") _ownerEmail?: string) {
    return this.customerDocumentsService.listDocuments(request.user.email);
  }

  @Post()
  @UseGuards(SupabaseTokenGuard)
  saveDocument(@Req() request: RequestWithUser, @Body() input: SaveCustomerDocumentDto, @Query("ownerEmail") _ownerEmail?: string) {
    return this.customerDocumentsService.saveDocument(request.user.email, {
      id: input.id ?? "",
      documentType: input.documentType,
      documentNo: input.documentNo,
      ...(input.fileAssetId ? { fileAssetId: input.fileAssetId } : {}),
      ...(input.verifiedAt ? { verifiedAt: input.verifiedAt } : {}),
      metadata: input.metadata ?? {}
    });
  }

  @Delete(":id")
  @UseGuards(SupabaseTokenGuard)
  async deleteDocument(@Param("id") id: string, @Req() request: RequestWithUser, @Query("ownerEmail") _ownerEmail?: string) {
    await this.customerDocumentsService.deleteDocument(request.user.email, id);
    return { ok: true };
  }
}
