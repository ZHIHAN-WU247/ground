"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { Product } from "@ground/shared";
import { getJson } from "../../../../lib/api";
import { ProductDetailClient } from "./ProductDetailClient";

export function ProductDetailLoader({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [currentProduct, products] = await Promise.all([
        getJson<Product>(`/shop/products/${encodeURIComponent(slug)}`),
        getJson<Product[]>("/shop/products")
      ]);
      setProduct(currentProduct);
      setRelatedProducts(products.filter((item) => item.categorySlug === currentProduct.categorySlug && item.id !== currentProduct.id).slice(0, 6));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "商品详情加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => { void loadProduct(); }, [loadProduct]);

  if (isLoading) return <div className="empty-state">正在加载商品详情…</div>;
  if (!product || error) {
    return (
      <div className="empty-state">
        <p>{error || "没有找到这个商品。"}</p>
        <div className="button-row">
          <button className="button" type="button" onClick={() => void loadProduct()}><RefreshCw size={16} />重试</button>
          <Link className="button" href="/shop/products">返回商品列表</Link>
        </div>
      </div>
    );
  }

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
