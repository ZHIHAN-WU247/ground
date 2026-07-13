import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { SupabaseTokenService } from "./supabase-token.service";

const originalEnv = { ...process.env };

async function main() {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);
  const kid = "test-es256-key";
  const jwks = JSON.stringify({
    keys: [{ ...publicJwk, kid, alg: "ES256", use: "sig" }]
  });
  const server = createServer((request, response) => {
    if (request.url === "/auth/v1/.well-known/jwks.json") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(jwks);
      return;
    }

    response.writeHead(404);
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  process.env.SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  delete process.env.SUPABASE_JWT_SECRET;

  const token = await new SignJWT({
    aud: "authenticated",
    email: "Customer@Example.com",
    app_metadata: { role: "admin" }
  })
    .setProtectedHeader({ alg: "ES256", kid })
    .setSubject("11111111-1111-4111-8111-111111111111")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);

  const user = await new SupabaseTokenService().verifyAuthorizationHeader(`Bearer ${token}`);

  assert.deepEqual(user, {
    id: "11111111-1111-4111-8111-111111111111",
    email: "Customer@Example.com",
    role: "admin"
  });

  process.env.NODE_ENV = "development";
  const localCustomer = await new SupabaseTokenService().verifyRequestHeaders({
    "x-ground-dev-customer-email": " LocalCustomer@Example.com "
  });
  assert.deepEqual(localCustomer, {
    id: "local-customer-localcustomer@example.com",
    email: "localcustomer@example.com",
    role: "customer"
  });

  const localCustomerAfterInvalidBearer = await new SupabaseTokenService().verifyRequestHeaders({
    authorization: "Bearer invalid-token",
    "x-ground-dev-customer-email": " LocalCustomer@Example.com "
  });
  assert.deepEqual(localCustomerAfterInvalidBearer, {
    id: "local-customer-localcustomer@example.com",
    email: "localcustomer@example.com",
    role: "customer"
  });

  const localAdminAfterInvalidBearer = await new SupabaseTokenService().verifyRequestHeaders({
    authorization: "Bearer invalid-token",
    "x-ground-dev-admin": "true",
    "x-ground-dev-admin-email": " JohnWoo24GND@gmail.com "
  });
  assert.deepEqual(localAdminAfterInvalidBearer, {
    id: "local-admin-johnwoo24gnd@gmail.com",
    email: "johnwoo24gnd@gmail.com",
    role: "admin"
  });

  process.env.NODE_ENV = "production";
  await assert.rejects(
    () => new SupabaseTokenService().verifyRequestHeaders({
      "x-ground-dev-customer-email": "localcustomer@example.com"
    }),
    /Missing Supabase Auth bearer token/
  );

  await assert.rejects(
    () => new SupabaseTokenService().verifyRequestHeaders({
      authorization: "Bearer invalid-token",
      "x-ground-dev-admin": "true",
      "x-ground-dev-admin-email": "johnwoo24gnd@gmail.com"
    }),
    /Invalid Token|Invalid Compact JWS/
  );

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  process.env = originalEnv;
}

void main();
