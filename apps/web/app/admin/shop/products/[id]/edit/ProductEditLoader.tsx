"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { Product } from "@ground/shared";
import { getAdminJson } from "../../../../../../lib/api";
import { ProductForm } from "../../new/ProductForm";

export function ProductEditLoader({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setProduct(await getAdminJson<Product>(`/admin/shop/products/${encodeURIComponent(id)}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "商品加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadProduct(); }, [loadProduct]);

  if (isLoading) return <div className="empty-state">正在加载商品资料…</div>;
  if (!product || error) {
    return (
      <div className="empty-state">
        <p>{error || "没有找到这个商品。"}</p>
        <div className="button-row">
          <button className="button" type="button" onClick={() => void loadProduct()}><RefreshCw size={16} />重试</button>
          <Link className="button" href="/admin/shop/products">返回商品列表</Link>
        </div>
      </div>
    );
  }

  return <ProductForm initialProduct={product} />;
}
