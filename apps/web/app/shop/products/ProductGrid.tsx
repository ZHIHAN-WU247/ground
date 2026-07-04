"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";
import { shopProductCategories, type Product, type ProductCategorySlug } from "@ground/shared";
import { useI18n } from "../../../components/I18nProvider";

interface ProductGridProps {
  products: Product[];
}

type ActiveCategory = "all" | ProductCategorySlug;

export function ProductGrid({ products }: ProductGridProps) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);

  const publishedProducts = useMemo(() => products.filter((product) => product.isPublished !== false), [products]);

  const categoryCounts = useMemo(() => {
    return shopProductCategories.reduce<Record<string, number>>((counts, category) => {
      counts[category.slug] = publishedProducts.filter((product) => product.categorySlug === category.slug).length;
      return counts;
    }, {});
  }, [publishedProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();

    return publishedProducts.filter((product) => {
      const matchesKeyword = normalizedKeyword.length === 0 || product.name.toLocaleLowerCase().includes(normalizedKeyword);
      const matchesCategory = activeCategory === "all" || product.categorySlug === activeCategory;
      return matchesKeyword && matchesCategory;
    });
  }, [activeCategory, keyword, publishedProducts]);

  const resetFilters = () => {
    setKeyword("");
    setActiveCategory("all");
  };

  if (publishedProducts.length === 0) {
    return <div className="empty-state">{t("shop.products.empty")}</div>;
  }

  return (
    <div className="shop-shelf">
      <div className="shop-toolbar">
        <div className="shop-search" role="search">
          <Search aria-hidden="true" size={20} />
          <input
            aria-label="Search products"
            id="shop-product-search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search products"
            type="search"
          />
          {keyword ? (
            <button aria-label="Clear search" className="shop-icon-button" type="button" onClick={() => setKeyword("")}>
              <X aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>

        <div className="shop-category-bar" aria-label="Product categories">
          <button className={activeCategory === "all" ? "active" : ""} type="button" onClick={() => setActiveCategory("all")}>
            All
            <span>{publishedProducts.length}</span>
          </button>
          {shopProductCategories.map((category) => (
            <button
              className={activeCategory === category.slug ? "active" : ""}
              key={category.slug}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
            >
              {category.label}
              <span>{categoryCounts[category.slug] ?? 0}</span>
            </button>
          ))}
        </div>

        <button
          aria-expanded={isCategoryOpen}
          className="shop-category-toggle"
          type="button"
          onClick={() => setIsCategoryOpen((current) => !current)}
        >
          Category details
          <ChevronDown aria-hidden="true" className={isCategoryOpen ? "open" : ""} size={18} />
        </button>

        {isCategoryOpen ? (
          <div className="shop-category-dropdown">
            {shopProductCategories.map((category) => {
              const categoryProducts = publishedProducts.filter((product) => product.categorySlug === category.slug);

              return (
                <button
                  className={activeCategory === category.slug ? "active" : ""}
                  key={category.slug}
                  type="button"
                  onClick={() => setActiveCategory(category.slug)}
                >
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                  <small>
                    {categoryProducts.length > 0
                      ? categoryProducts.slice(0, 3).map((product) => product.name).join(" / ")
                      : "No published products"}
                  </small>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="shop-result-head">
        <strong>{filteredProducts.length} items</strong>
        <span>{activeCategory === "all" ? "All categories" : shopProductCategories.find((category) => category.slug === activeCategory)?.label}</span>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          No matching products found.
          <div className="button-row">
            <button className="button" type="button" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="shop-product-grid">
          {filteredProducts.map((product) => {
            const firstSku = product.skus[0];

            return (
              <Link className="shop-product-card" href={`/shop/products/${product.slug}`} key={product.id}>
                <span className="shop-product-image">
                  <img src={product.imageUrl} alt={product.name} />
                </span>
                <span className="shop-product-info">
                  <span className="shop-product-category">{product.category}</span>
                  <strong>{product.name}</strong>
                  <span className="shop-product-summary">{product.summary}</span>
                  <span className="shop-product-meta">
                    <span className="shop-product-price">
                      {firstSku ? `${firstSku.price} ${firstSku.currency}` : "Pending"}
                    </span>
                    <span>{product.salesLabel ?? "New"}</span>
                  </span>
                  <span className="shop-product-action">{t("shop.products.view")}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
