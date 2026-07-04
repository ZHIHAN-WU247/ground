"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { shopProductCategories, type CreateProductInput, type CurrencyCode, type Product, type ProductCategorySlug } from "@ground/shared";
import { patchAdminJson, postAdminJson } from "../../../../../lib/api";
import { normalizeProductSlug, validateDetailSection, validateProductImage } from "./product-form";

interface SkuDraft {
  key: string;
  model: string;
  size: string;
  price: string;
  currency: CurrencyCode;
  stockLabel: string;
}

interface DetailSectionDraft {
  body: string;
  imageUrl: string;
  key: string;
  title: string;
}

const createSku = (): SkuDraft => ({
  key: crypto.randomUUID(),
  model: "",
  size: "",
  price: "",
  currency: "USD",
  stockLabel: "现货"
});

const createDetailSection = (): DetailSectionDraft => ({
  key: crypto.randomUUID(),
  title: "",
  body: "",
  imageUrl: ""
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("图片读取失败，请重新选择。")));
    reader.readAsDataURL(file);
  });

interface ProductFormProps {
  initialProduct?: Product;
}

export function ProductForm({ initialProduct }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialProduct);
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(initialProduct));
  const [categorySlug, setCategorySlug] = useState<ProductCategorySlug>(initialProduct?.categorySlug ?? "daily");
  const [summary, setSummary] = useState(initialProduct?.summary ?? "");
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [originLabel, setOriginLabel] = useState(initialProduct?.originLabel ?? "");
  const [coverImage, setCoverImage] = useState(initialProduct?.imageUrl ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(initialProduct?.galleryImageUrls ?? []);
  const [detailSections, setDetailSections] = useState<DetailSectionDraft[]>(
    (initialProduct?.detailSections ?? []).map((section, index) => ({
      key: `detail-${index}`,
      title: section.title,
      body: section.body,
      imageUrl: section.imageUrl ?? ""
    }))
  );
  const [skus, setSkus] = useState<SkuDraft[]>(
    initialProduct?.skus.length
      ? initialProduct.skus.map((sku) => ({ ...sku, key: sku.id, price: String(sku.price) }))
      : [{ ...createSku(), key: "initial-sku" }]
  );
  const [isPublished, setIsPublished] = useState(initialProduct?.isPublished ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateName = (value: string) => {
    setName(value);

    if (!slugEdited) {
      const normalizedSlug = normalizeProductSlug(value);
      setSlug((current) => normalizedSlug || current || `product-${Date.now().toString(36)}`);
    }
  };

  const selectCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationError = validateProductImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    try {
      setCoverImage(await readFileAsDataUrl(file));
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "图片读取失败。");
    }
  };

  const selectGallery = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (galleryImages.length + files.length > 5) {
      setError("详情图最多 5 张。");
      return;
    }

    const validationError = files.map(validateProductImage).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setGalleryImages((current) => [...current, ...files.map(() => "")]);
    try {
      const images = await Promise.all(files.map(readFileAsDataUrl));
      setGalleryImages((current) => [...current.filter(Boolean), ...images]);
    } catch (fileError) {
      setGalleryImages((current) => current.filter(Boolean));
      setError(fileError instanceof Error ? fileError.message : "图片读取失败。");
    }
  };

  const updateSku = (key: string, field: keyof Omit<SkuDraft, "key">, value: string) => {
    setSkus((current) => current.map((sku) => (sku.key === key ? { ...sku, [field]: value } : sku)));
  };

  const updateDetailSection = (key: string, field: "body" | "title", value: string) => {
    setDetailSections((current) => current.map((section) => (section.key === key ? { ...section, [field]: value } : section)));
  };

  const selectDetailImage = async (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationError = validateProductImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    try {
      const imageUrl = await readFileAsDataUrl(file);
      setDetailSections((current) => current.map((section) => (section.key === key ? { ...section, imageUrl } : section)));
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "图片读取失败。");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!coverImage) {
      setError("请先选择商品封面图。");
      return;
    }
    if (!slug) {
      setError("请输入只包含小写字母、数字和连字符的商品链接标识。");
      return;
    }
    if (skus.some((sku) => !sku.model.trim() || !sku.size.trim() || !sku.stockLabel.trim() || Number(sku.price) <= 0)) {
      setError("请完整填写每个 SKU，价格必须大于 0。");
      return;
    }
    const detailValidationError = detailSections.map(validateDetailSection).find(Boolean);
    if (detailValidationError) {
      setError(detailValidationError);
      return;
    }

    const category = shopProductCategories.find((item) => item.slug === categorySlug);
    const input: CreateProductInput = {
      slug,
      name: name.trim(),
      summary: summary.trim(),
      description: description.trim(),
      imageUrl: coverImage,
      galleryImageUrls: galleryImages,
      isPublished,
      categorySlug,
      category: category?.label ?? categorySlug,
      ...(originLabel.trim() ? { originLabel: originLabel.trim() } : {}),
      salesLabel: "新品",
      detailSections: detailSections.map((section) => ({
        title: section.title.trim(),
        body: section.body.trim(),
        ...(section.imageUrl ? { imageUrl: section.imageUrl } : {})
      })),
      skus: skus.map((sku) => ({
        model: sku.model,
        size: sku.size,
        price: Number(sku.price),
        currency: sku.currency,
        stockLabel: sku.stockLabel
      }))
    };

    setIsSubmitting(true);
    try {
      const product = initialProduct
        ? await patchAdminJson<Product, CreateProductInput>(`/admin/shop/products/${encodeURIComponent(initialProduct.id)}`, input)
        : await postAdminJson<Product, CreateProductInput>("/admin/shop/products", input);
      const resultKey = isEditing ? "updated" : "created";
      router.push(`/admin/shop/products?${resultKey}=${encodeURIComponent(product.name)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "商品保存失败，请稍后重试。");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="product-editor" onSubmit={submit}>
      <div className="product-editor-main">
        <section className="product-editor-section">
          <div className="product-editor-heading"><span>01</span><div><h2>基础信息</h2><p>这些内容会直接出现在商城商品卡片与详情页。</p></div></div>
          <div className="form-grid">
            <label className="field"><span>商品名称</span><input required maxLength={120} value={name} onChange={(event) => updateName(event.target.value)} placeholder="例如：亚麻周末包" /></label>
            <label className="field"><span>链接标识</span><input required maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(normalizeProductSlug(event.target.value)); }} placeholder="linen-weekender" /></label>
            <label className="field"><span>商品分类</span><select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value as ProductCategorySlug)}>{shopProductCategories.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select></label>
            <label className="field"><span>发货说明</span><input maxLength={80} value={originLabel} onChange={(event) => setOriginLabel(event.target.value)} placeholder="例如：中国仓发货" /></label>
            <label className="field full"><span>商品摘要</span><input required maxLength={240} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="用一句话说明商品卖点" /></label>
            <label className="field full"><span>商品描述</span><textarea required maxLength={4000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="材质、用途、包装与服务说明" /></label>
          </div>
        </section>

        <section className="product-editor-section">
          <div className="product-editor-heading"><span>02</span><div><h2>商品图片</h2><p>支持 JPG、PNG、WebP；单张不超过 2 MB，详情图最多 5 张。</p></div></div>
          <div className="product-media-grid">
            <div><strong>封面图</strong>{coverImage ? <div className="product-image-preview cover"><img src={coverImage} alt="商品封面预览" /><button type="button" onClick={() => setCoverImage("")}><Trash2 size={16} />移除</button></div> : <label className="product-image-picker"><ImagePlus size={28} /><span>选择封面图</span><small>建议使用 1:1 图片</small><input accept="image/jpeg,image/png,image/webp" type="file" onChange={selectCover} /></label>}</div>
            <div><strong>详情图</strong><div className="product-gallery-editor">
              {galleryImages.filter(Boolean).map((image, index) => <div className="product-image-preview" key={`${image.slice(-24)}-${index}`}><img src={image} alt={`详情图 ${index + 1}`} /><button aria-label={`移除详情图 ${index + 1}`} type="button" onClick={() => setGalleryImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}
              {galleryImages.length < 5 ? <label className="product-image-picker compact"><Plus size={22} /><span>添加图片</span><input accept="image/jpeg,image/png,image/webp" multiple type="file" onChange={selectGallery} /></label> : null}
            </div></div>
          </div>
        </section>

        <section className="product-editor-section">
          <div className="product-editor-heading"><span>03</span><div><h2>规格与价格</h2><p>至少保留一个可销售 SKU。</p></div><button className="button" type="button" onClick={() => setSkus((current) => [...current, createSku()])}><Plus size={16} /> 添加 SKU</button></div>
          <div className="product-sku-list">{skus.map((sku, index) => (
            <div className="product-sku-row" key={sku.key}>
              <span className="product-sku-index">{String(index + 1).padStart(2, "0")}</span>
              <label><span>型号</span><input required value={sku.model} onChange={(event) => updateSku(sku.key, "model", event.target.value)} placeholder="原色" /></label>
              <label><span>尺寸</span><input required value={sku.size} onChange={(event) => updateSku(sku.key, "size", event.target.value)} placeholder="标准" /></label>
              <label><span>价格</span><input required min="0.01" step="0.01" type="number" value={sku.price} onChange={(event) => updateSku(sku.key, "price", event.target.value)} placeholder="68.00" /></label>
              <label><span>币种</span><select value={sku.currency} onChange={(event) => updateSku(sku.key, "currency", event.target.value)}><option value="USD">USD</option><option value="CNY">CNY</option><option value="RUB">RUB</option></select></label>
              <label><span>库存说明</span><input required value={sku.stockLabel} onChange={(event) => updateSku(sku.key, "stockLabel", event.target.value)} /></label>
              <button aria-label={`删除 SKU ${index + 1}`} className="product-sku-remove" disabled={skus.length === 1} type="button" onClick={() => setSkus((current) => current.filter((item) => item.key !== sku.key))}><Trash2 size={17} /></button>
            </div>
          ))}</div>
        </section>

        <section className="product-editor-section">
          <div className="product-editor-heading">
            <span>04</span>
            <div><h2>详情内容</h2><p>添加商品材质、尺寸、使用方式等图文说明，商城会按当前顺序展示。</p></div>
            <button
              className="button"
              disabled={detailSections.length >= 12}
              type="button"
              onClick={() => setDetailSections((current) => [...current, createDetailSection()])}
            >
              <Plus size={16} /> 添加详情模块
            </button>
          </div>
          {detailSections.length === 0 ? (
            <div className="product-detail-editor-empty">
              <ImagePlus size={24} />
              <span>还没有详情内容，可添加文字和图片。</span>
            </div>
          ) : (
            <div className="product-detail-editor-list">
              {detailSections.map((section, index) => (
                <article className="product-detail-editor-card" key={section.key}>
                  <div className="product-detail-editor-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="product-detail-editor-fields">
                    <label><span>详情标题</span><input required maxLength={120} value={section.title} onChange={(event) => updateDetailSection(section.key, "title", event.target.value)} placeholder="例如：面料与工艺" /></label>
                    <label><span>详情正文</span><textarea required maxLength={5000} rows={5} value={section.body} onChange={(event) => updateDetailSection(section.key, "body", event.target.value)} placeholder="说明材质、尺寸、包装、使用方法等内容" /></label>
                  </div>
                  <div className="product-detail-editor-media">
                    {section.imageUrl ? (
                      <div className="product-image-preview detail">
                        <img src={section.imageUrl} alt={`详情模块 ${index + 1} 图片预览`} />
                        <button type="button" onClick={() => setDetailSections((current) => current.map((item) => (item.key === section.key ? { ...item, imageUrl: "" } : item)))}><Trash2 size={15} />移除图片</button>
                      </div>
                    ) : (
                      <label className="product-image-picker detail">
                        <ImagePlus size={24} /><span>添加详情图片</span><small>可选，单张不超过 2 MB</small>
                        <input accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => void selectDetailImage(section.key, event)} />
                      </label>
                    )}
                  </div>
                  <button aria-label={`删除详情模块 ${index + 1}`} className="product-detail-editor-remove" type="button" onClick={() => setDetailSections((current) => current.filter((item) => item.key !== section.key))}><Trash2 size={17} /></button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="product-editor-aside">
        <div className="product-preview-card">
          <span className="eyebrow">商城预览</span>
          <div className="product-preview-image">{coverImage ? <img src={coverImage} alt="" /> : <ImagePlus size={32} />}</div>
          <small>{shopProductCategories.find((category) => category.slug === categorySlug)?.label}</small>
          <h3>{name || "商品名称"}</h3><p>{summary || "商品摘要将在这里显示。"}</p>
          <strong>{skus[0]?.price ? `${skus[0].price} ${skus[0].currency}` : "价格待填写"}</strong>
        </div>
        <label className="product-publish-toggle"><input checked={isPublished} type="checkbox" onChange={(event) => setIsPublished(event.target.checked)} /><span><strong>{isPublished ? "立即发布" : "保存为草稿"}</strong><small>{isPublished ? "保存后会显示到商城" : "仅管理员可以看到"}</small></span></label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button primary product-save-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? <><LoaderCircle size={17} />正在保存</> : isEditing ? "保存修改" : "保存商品"}
        </button>
      </aside>
    </form>
  );
}
