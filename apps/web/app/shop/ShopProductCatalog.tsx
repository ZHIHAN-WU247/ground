"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Product } from "@ground/shared";
import { getJson } from "../../lib/api";
import { ProductGrid } from "./products/ProductGrid";

export function ShopProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setProducts(await getJson<Product[]>("/shop/products"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "商品加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  if (isLoading) return <div className="empty-state">正在加载商城商品…</div>;
  if (error) {
    return <div className="empty-state"><p>商城商品暂时无法加载：{error}</p><button className="button" type="button" onClick={() => void loadProducts()}><RefreshCw size={16} />重新加载</button></div>;
  }

  return <ProductGrid products={products} />;
}
