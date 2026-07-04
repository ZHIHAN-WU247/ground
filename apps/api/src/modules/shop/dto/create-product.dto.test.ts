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
};

void run();
