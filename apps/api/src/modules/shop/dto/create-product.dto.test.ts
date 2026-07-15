import "reflect-metadata";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateProductDto } from "./create-product.dto";

const run = async () => {
  const input = plainToInstance(CreateProductDto, {
    slug: "detail-product",
    name: "Detail product",
    summary: "Product with detail content",
    description: "Product description",
    imageUrl: "data:image/png;base64,cHJvZHVjdA==",
    galleryImageUrls: [],
    isPublished: true,
    categorySlug: "accessories",
    category: "Accessories",
    detailSections: [
      {
        title: "Material",
        body: "Durable cotton canvas",
        imageUrl: "data:image/png;base64,ZGV0YWls"
      }
    ],
    skus: [{ model: "Default", size: "One size", price: 20, currency: "USD", stockLabel: "In stock" }]
  });

  const errors = await validate(input, {
    forbidNonWhitelisted: true,
    whitelist: true
  });

  assert.deepEqual(errors, []);

  const urlInput = plainToInstance(CreateProductDto, {
    slug: "url-product",
    name: "URL product",
    summary: "Product with uploaded image URLs",
    description: "Product description",
    imageUrl: "https://cdn.example.com/product-images/cover.webp",
    galleryImageUrls: ["https://cdn.example.com/product-images/detail.webp"],
    isPublished: true,
    categorySlug: "accessories",
    category: "Accessories",
    detailSections: [
      {
        title: "Material",
        body: "Durable cotton canvas",
        imageUrl: "https://cdn.example.com/product-images/material.webp"
      }
    ],
    skus: [{ model: "Default", size: "One size", price: 20, currency: "USD", stockLabel: "In stock" }]
  });

  const urlErrors = await validate(urlInput, {
    forbidNonWhitelisted: true,
    whitelist: true
  });

  assert.deepEqual(urlErrors, []);
};

void run();
