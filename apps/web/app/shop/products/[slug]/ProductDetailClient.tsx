"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Minus, PackageCheck, Plus, ShieldCheck, Star, Truck } from "lucide-react";
import type { Product } from "@ground/shared";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const [activeImage, setActiveImage] = useState(product.galleryImageUrls?.[0] ?? product.imageUrl);
  const [selectedSkuId, setSelectedSkuId] = useState(product.skus[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const selectedSku = useMemo(
    () => product.skus.find((sku) => sku.id === selectedSkuId) ?? product.skus[0],
    [product.skus, selectedSkuId]
  );
  const gallery = product.galleryImageUrls?.length ? product.galleryImageUrls : [product.imageUrl];
  const checkoutHref = selectedSku
    ? `/shop/checkout?productId=${encodeURIComponent(product.id)}&skuId=${encodeURIComponent(selectedSku.id)}&quantity=${quantity}`
    : "/shop/checkout";

  return (
    <div className="shop-detail">
      <section className="shop-detail-layout">
        <div className="shop-gallery">
          <div className="shop-gallery-main">
            <img src={activeImage} alt={product.name} />
          </div>
          <div className="shop-gallery-thumbs" aria-label="商品图片">
            {gallery.map((imageUrl) => (
              <button
                aria-label={`查看图片 ${imageUrl}`}
                className={activeImage === imageUrl ? "active" : ""}
                key={imageUrl}
                type="button"
                onClick={() => setActiveImage(imageUrl)}
              >
                <img src={imageUrl} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="shop-buy-panel">
          <div className="shop-detail-title">
            <p className="eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
          </div>

          <div className="shop-price-block">
            <span>活动价</span>
            <strong>{selectedSku ? `${selectedSku.price} ${selectedSku.currency}` : "待确认"}</strong>
            <small>{product.salesLabel ?? "新品上架"}</small>
          </div>

          <div className="shop-service-strip" aria-label="服务说明">
            <span>
              <Truck aria-hidden="true" size={17} />
              {product.originLabel ?? "中国仓发货"}
            </span>
            <span>
              <ShieldCheck aria-hidden="true" size={17} />
              人工确认
            </span>
            <span>
              <PackageCheck aria-hidden="true" size={17} />
              不接在线支付
            </span>
          </div>

          <div className="shop-option-group">
            <div className="shop-option-head">
              <strong>规格</strong>
              <span>{selectedSku?.stockLabel ?? "库存待确认"}</span>
            </div>
            <div className="shop-sku-grid">
              {product.skus.map((sku) => (
                <button
                  className={selectedSku?.id === sku.id ? "active" : ""}
                  key={sku.id}
                  type="button"
                  onClick={() => setSelectedSkuId(sku.id)}
                >
                  <strong>{sku.model}</strong>
                  <span>{sku.size}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="shop-option-group">
            <div className="shop-option-head">
              <strong>数量</strong>
              <span>起订 1 件</span>
            </div>
            <div className="shop-quantity">
              <button aria-label="减少数量" type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
                <Minus aria-hidden="true" size={16} />
              </button>
              <output>{quantity}</output>
              <button aria-label="增加数量" type="button" onClick={() => setQuantity((current) => current + 1)}>
                <Plus aria-hidden="true" size={16} />
              </button>
            </div>
          </div>

          <div className="shop-total-line">
            <span>预计商品金额</span>
            <strong>{selectedSku ? `${selectedSku.price * quantity} ${selectedSku.currency}` : "待确认"}</strong>
          </div>

          <div className="shop-detail-actions">
            {selectedSku ? (
              <Link className="button primary" href={checkoutHref}>
                提交订单，人工确认
              </Link>
            ) : (
              <button className="button primary" disabled type="button">
                暂无可选规格
              </button>
            )}
            <Link className="button" href="/shop/products">
              返回商品列表
            </Link>
          </div>
        </div>
      </section>

      <section className="shop-detail-content">
        <div className="shop-detail-tabs" aria-label="商品详情导航">
          <a href="#detail">商品详情</a>
          <a href="#service">服务保障</a>
          <a href="#reviews">评价</a>
        </div>

        <div className="shop-detail-columns">
          <div className="shop-detail-copy" id="detail">
            <h2>商品详情</h2>
            {product.detailSections?.length ? (
              product.detailSections.map((section, index) => (
                <article className="shop-detail-section" key={`${section.title}-${index}`}>
                  <div>
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                  </div>
                  {section.imageUrl ? <img src={section.imageUrl} alt={section.title} /> : null}
                </article>
              ))
            ) : (
              <div className="shop-detail-empty">暂无商品详情。</div>
            )}
          </div>

          <aside className="shop-service-card" id="service">
            <h3>服务保障</h3>
            <ul>
              {(product.serviceLabels ?? ["人工确认订单"]).map((label) => (
                <li key={label}>
                  <ShieldCheck aria-hidden="true" size={16} />
                  {label}
                </li>
              ))}
            </ul>
            <p>当前版本不提供在线支付。订单提交后由后台人工确认商品、规格、库存和物流发运。</p>
          </aside>
        </div>

        <div className="shop-review-block" id="reviews">
          <div>
            <h2>买家评价</h2>
            <p>评价模块保留展示位，后续接入真实订单后再开放提交与审核。</p>
          </div>
          <div className="shop-stars" aria-label="默认评分展示">
            {[1, 2, 3, 4, 5].map((item) => (
              <Star aria-hidden="true" fill="currentColor" key={item} size={18} />
            ))}
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="shop-related">
          <div className="shop-result-head">
            <strong>同类推荐</strong>
            <span>{product.category}</span>
          </div>
          <div className="shop-product-grid compact">
            {relatedProducts.map((relatedProduct) => {
              const sku = relatedProduct.skus[0];

              return (
                <Link className="shop-product-card" href={`/shop/products/${relatedProduct.slug}`} key={relatedProduct.id}>
                  <span className="shop-product-image">
                    <img src={relatedProduct.imageUrl} alt={relatedProduct.name} />
                  </span>
                  <span className="shop-product-info">
                    <span className="shop-product-category">{relatedProduct.category}</span>
                    <strong>{relatedProduct.name}</strong>
                    <span className="shop-product-meta">
                      <span className="shop-product-price">{sku ? `${sku.price} ${sku.currency}` : "待确认"}</span>
                      <span>{relatedProduct.salesLabel ?? "新品"}</span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
