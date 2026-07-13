import assert from "node:assert/strict";
import { ValidationPipe } from "@nestjs/common";
import { CreateLogisticsOrderDto } from "./create-logistics-order.dto";

const pipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

const run = async () => {
  const result = await pipe.transform(
    {
      ownerEmail: "customer@example.com",
      cargoType: "B2C",
      routeId: "air-cdek",
      deliveryMethod: "TO_WAREHOUSE",
      sender: {
        name: "Ground warehouse",
        phone: "+86 755 0000 1234",
        email: "warehouse@ground.test",
        country: "China",
        province: "Guangdong",
        city: "Shenzhen",
        postalCode: "518000",
        addressLine: "Ground default warehouse"
      },
      recipient: {
        name: "Ivan Petrov",
        phone: "+79000002200",
        email: "ivan@example.com",
        country: "Russia",
        province: "Moscow",
        city: "Moscow",
        postalCode: "101000",
        addressLine: "Tverskaya Street 8"
      },
      cargoItems: [{ name: "Cotton hoodie", unitValueCny: 120, quantity: 1 }],
      weightKg: 1,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
      packageCount: 1
    },
    {
      metatype: CreateLogisticsOrderDto,
      type: "body"
    }
  );

  assert.equal(result.ownerEmail, "customer@example.com");
  assert.equal(result.deliveryMethod, "TO_WAREHOUSE");
};

void run();
