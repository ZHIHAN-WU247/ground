import type { CreateProductInput, Product, ProductSku } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean; foreignTable?: string }): SupabaseQuery<T>;
  eq(column: string, value: string | boolean): SupabaseQuery<T>;
  or(expression: string): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
  delete(): SupabaseQuery<T>;
}

export interface SupabaseProductClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface ProductSkuRow {
  id: string;
  product_id: string;
  model: string;
  size: string;
  price: number | string;
  currency: ProductSku["currency"];
  stock_label: string;
  sort_order: number;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  category_slug: Product["categorySlug"];
  category: string;
  is_published: boolean;
  image_url: string;
  gallery_image_urls: unknown;
  sales_label: string | null;
  origin_label: string | null;
  service_labels: unknown;
  detail_sections: unknown;
  product_skus?: ProductSkuRow[];
}

export class SupabaseProductStore {
  constructor(private readonly client: SupabaseProductClient) {}

  async listPublishedProducts(): Promise<Product[]> {
    const result = await this.client
      .from<ProductRow[]>("products")
      .select("*, product_skus(*)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .order("sort_order", { foreignTable: "product_skus", ascending: true });

    this.assertSuccess(result, "Failed to load products from Supabase.");
    return (result.data ?? []).map((row) => this.toProduct(row));
  }

  async listAdminProducts(): Promise<Product[]> {
    const result = await this.client
      .from<ProductRow[]>("products")
      .select("*, product_skus(*)")
      .order("created_at", { ascending: false })
      .order("sort_order", { foreignTable: "product_skus", ascending: true });

    this.assertSuccess(result, "Failed to load admin products from Supabase.");
    return (result.data ?? []).map((row) => this.toProduct(row));
  }

  async getProduct(identifier: string, options: { publishedOnly?: boolean } = {}): Promise<Product> {
    let query = this.client.from<ProductRow>("products").select("*, product_skus(*)").limit(1);
    query = this.isUuid(identifier) ? query.eq("id", identifier) : query.eq("slug", identifier);

    if (options.publishedOnly) {
      query = query.eq("is_published", true);
    }

    const result = await query.maybeSingle();
    this.assertSuccess(result, "Failed to load product from Supabase.");

    if (!result.data) {
      throw new Error("Product was not found.");
    }

    return this.toProduct(result.data);
  }

  async findProductBySlug(slug: string): Promise<string | undefined> {
    const result = await this.client.from<{ id: string }>("products").select("id").eq("slug", slug).maybeSingle();
    this.assertSuccess(result, "Failed to check product slug in Supabase.");
    return result.data?.id;
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const productResult = await this.client.from<ProductRow>("products").insert(this.toProductInsert(input)).select().single();
    this.assertSuccess(productResult, "Failed to create product in Supabase.");

    await this.replaceSkus(productResult.data!.id, input.skus);
    return this.getProduct(productResult.data!.id);
  }

  async updateProduct(identifier: string, input: CreateProductInput): Promise<Product> {
    const current = await this.getProduct(identifier);
    const productResult = await this.client.from<ProductRow>("products").update(this.toProductInsert(input)).eq("id", current.id).select().single();
    this.assertSuccess(productResult, "Failed to update product in Supabase.");

    await this.replaceSkus(current.id, input.skus);
    return this.getProduct(current.id);
  }

  async setProductPublished(identifier: string, isPublished: boolean): Promise<Product> {
    const current = await this.getProduct(identifier);
    const result = await this.client.from<ProductRow>("products").update({ is_published: isPublished }).eq("id", current.id).select().single();
    this.assertSuccess(result, "Failed to update product status in Supabase.");
    return this.getProduct(current.id);
  }

  async deleteProduct(identifier: string): Promise<Product> {
    const current = await this.getProduct(identifier);
    const result = await this.client.from<ProductRow>("products").delete().eq("id", current.id).select().single();
    this.assertSuccess(result, "Failed to delete product from Supabase.");
    return this.toProduct(result.data ?? this.toProductRow(current));
  }

  private async replaceSkus(productId: string, skus: CreateProductInput["skus"]) {
    const deleteResult = await this.client.from<ProductSkuRow[]>("product_skus").delete().eq("product_id", productId);
    this.assertSuccess(deleteResult, "Failed to replace product SKUs in Supabase.");

    const payload = skus.map((sku, index) => ({
      product_id: productId,
      model: sku.model,
      size: sku.size,
      price: sku.price,
      currency: sku.currency,
      stock_label: sku.stockLabel,
      sort_order: index
    }));

    const insertResult = await this.client.from<ProductSkuRow[]>("product_skus").insert(payload);
    this.assertSuccess(insertResult, "Failed to create product SKUs in Supabase.");
  }

  private toProductInsert(input: CreateProductInput) {
    return {
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      description: input.description,
      category_slug: input.categorySlug,
      category: input.category,
      is_published: input.isPublished,
      image_url: input.imageUrl,
      gallery_image_urls: input.galleryImageUrls ?? [],
      sales_label: input.salesLabel ?? null,
      origin_label: input.originLabel ?? null,
      service_labels: input.serviceLabels ?? [],
      detail_sections: input.detailSections ?? [],
      metadata: {}
    };
  }

  private toProduct(row: ProductRow): Product {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      summary: row.summary,
      description: row.description,
      imageUrl: row.image_url,
      galleryImageUrls: this.stringArray(row.gallery_image_urls),
      isPublished: row.is_published,
      categorySlug: row.category_slug,
      category: row.category,
      ...(row.sales_label ? { salesLabel: row.sales_label } : {}),
      ...(row.origin_label ? { originLabel: row.origin_label } : {}),
      serviceLabels: this.stringArray(row.service_labels),
      detailSections: this.detailSections(row.detail_sections),
      skus: (row.product_skus ?? [])
        .slice()
        .sort((current, next) => current.sort_order - next.sort_order)
        .map((sku) => ({
          id: sku.id,
          model: sku.model,
          size: sku.size,
          price: Number(sku.price),
          currency: sku.currency,
          stockLabel: sku.stock_label
        }))
    };
  }

  private toProductRow(product: Product): ProductRow {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      summary: product.summary,
      description: product.description,
      category_slug: product.categorySlug,
      category: product.category,
      is_published: product.isPublished,
      image_url: product.imageUrl,
      gallery_image_urls: product.galleryImageUrls ?? [],
      sales_label: product.salesLabel ?? null,
      origin_label: product.originLabel ?? null,
      service_labels: product.serviceLabels ?? [],
      detail_sections: product.detailSections ?? [],
      product_skus: product.skus.map((sku, index) => ({
        id: sku.id,
        product_id: product.id,
        model: sku.model,
        size: sku.size,
        price: sku.price,
        currency: sku.currency,
        stock_label: sku.stockLabel,
        sort_order: index
      }))
    };
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private detailSections(value: unknown): NonNullable<Product["detailSections"]> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : undefined))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "",
        body: typeof item.body === "string" ? item.body : "",
        ...(typeof item.imageUrl === "string" ? { imageUrl: item.imageUrl } : {})
      }))
      .filter((item) => item.title && item.body);
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
