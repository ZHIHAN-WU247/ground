"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff, ImageIcon, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { Product } from "@ground/shared";
import { deleteAdminJson, getAdminJson, patchAdminJson } from "../../../../lib/api";

export function ProductAdminList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeProductId, setActiveProductId] = useState("");
  const [deleteProductId, setDeleteProductId] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setProducts(await getAdminJson<Product[]>("/admin/shop/products"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "商品列表加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const togglePublished = async (product: Product) => {
    setActiveProductId(product.id);
    setActionError("");
    try {
      const updated = await patchAdminJson<Product, { isPublished: boolean }>(
        `/admin/shop/products/${encodeURIComponent(product.id)}/status`,
        { isPublished: !product.isPublished }
      );
      setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "商品状态更新失败。");
    } finally {
      setActiveProductId("");
    }
  };

  const confirmDelete = async (product: Product) => {
    setActiveProductId(product.id);
    setActionError("");
    try {
      await deleteAdminJson<Product>(`/admin/shop/products/${encodeURIComponent(product.id)}`);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setDeleteProductId("");
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "商品删除失败。");
    } finally {
      setActiveProductId("");
    }
  };

  if (isLoading) return <div className="empty-state">正在加载商品…</div>;
  if (error) {
    return <div className="empty-state"><p>{error}</p><button className="button" type="button" onClick={() => void loadProducts()}><RefreshCw size={16} />重新加载</button></div>;
  }
  if (products.length === 0) {
    return <div className="empty-state"><p>还没有商品，从第一件商品开始吧。</p><Link className="button primary" href="/admin/shop/products/new">新建商品</Link></div>;
  }

  return (
    <>
      {actionError ? <div className="form-error admin-product-action-error" role="alert">{actionError}</div> : null}
      <div className="admin-product-list">
      <div className="admin-product-list-head"><span>商品</span><span>状态</span><span>SKU</span><span>起售价</span><span>操作</span></div>
      {products.map((product) => {
        const firstSku = product.skus[0];
        const isActive = activeProductId === product.id;
        return (
          <article className="admin-product-row" key={product.id}>
            <div className="admin-product-identity"><span className="admin-product-thumb">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <ImageIcon size={20} />}</span><span><strong>{product.name}</strong><small>/{product.slug} · {product.category}</small></span></div>
            <span className={`product-status ${product.isPublished ? "published" : "draft"}`}>{product.isPublished ? "已发布" : "草稿"}</span>
            <span>{product.skus.length}</span>
            <span>{firstSku ? `${firstSku.price} ${firstSku.currency}` : "—"}</span>
            <div className="admin-product-actions">
              {product.isPublished ? <Link className="admin-product-action" href={`/shop/products/${product.slug}`}><ExternalLink size={15} />查看</Link> : null}
              <Link className="admin-product-action" href={`/admin/shop/products/${product.id}/edit`}><Pencil size={15} />编辑</Link>
              <button disabled={isActive} type="button" onClick={() => void togglePublished(product)}>
                {product.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                {isActive ? "处理中" : product.isPublished ? "下架" : "上架"}
              </button>
              <button className="danger" disabled={isActive} type="button" onClick={() => setDeleteProductId(product.id)}><Trash2 size={15} />删除</button>
            </div>
            {deleteProductId === product.id ? (
              <div className="admin-product-delete-confirm" role="alert">
                <span><strong>永久删除“{product.name}”？</strong><small>该操作无法撤销，商城中也会立即移除。</small></span>
                <button className="button" disabled={isActive} type="button" onClick={() => setDeleteProductId("")}>取消</button>
                <button className="button danger" disabled={isActive} type="button" onClick={() => void confirmDelete(product)}>{isActive ? "正在删除" : "确认删除"}</button>
              </div>
            ) : null}
          </article>
        );
      })}
      </div>
    </>
  );
}
