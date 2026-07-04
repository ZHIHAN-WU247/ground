import "reflect-metadata";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Logger, ValidationPipe } from "@nestjs/common";
import type { NestApplicationOptions } from "@nestjs/common";
import type { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { installFrontendDevProxy } from "./dev-frontend-proxy";
import { AppModule } from "./modules/app.module";

const logger = new Logger("Bootstrap");

const loadEnvFile = (path: string) => {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key = "", ...parts] = trimmed.split("=");
    const envKey = key.trim();

    if (envKey && process.env[envKey] === undefined) {
      process.env[envKey] = parts.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
};

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), "apps/api/.env.local"));
loadEnvFile(resolve(__dirname, "../.env.local"));

const readEnvValue = (name: string) => {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
  return value || undefined;
};

const readHttpsFile = (label: string, filePath: string) => {
  const resolvedPath = resolve(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`${label} file does not exist: ${resolvedPath}`);
  }

  const contents = readFileSync(resolvedPath);

  if (contents.length === 0) {
    throw new Error(`${label} file is empty: ${resolvedPath}`);
  }

  return contents;
};

const buildHttpsOptions = (): HttpsOptions | undefined => {
  const httpsPfxFile = readEnvValue("HTTPS_PFX_FILE");
  const httpsKeyFile = readEnvValue("HTTPS_KEY_FILE");
  const httpsCertFile = readEnvValue("HTTPS_CERT_FILE");
  const httpsPfxPassphrase = readEnvValue("HTTPS_PFX_PASSPHRASE");

  if (!httpsPfxFile && !(httpsKeyFile && httpsCertFile)) {
    return undefined;
  }

  try {
    if (httpsPfxFile) {
      const options: HttpsOptions = {
        pfx: readHttpsFile("HTTPS_PFX_FILE", httpsPfxFile)
      };

      if (httpsPfxPassphrase) {
        options.passphrase = httpsPfxPassphrase;
      }

      return options;
    }

    return {
      key: readHttpsFile("HTTPS_KEY_FILE", httpsKeyFile as string),
      cert: readHttpsFile("HTTPS_CERT_FILE", httpsCertFile as string)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    logger.warn(`HTTPS disabled for local development: ${message}`);
    return undefined;
  }
};

const getPort = () => {
  const portValue = readEnvValue("PORT");
  const port = Number(portValue ?? 4000);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${portValue}`);
  }

  return port;
};

const bootstrap = async () => {
  const httpsOptions = buildHttpsOptions();
  const nestOptions: NestApplicationOptions = { cors: true, bodyParser: false };

  if (httpsOptions) {
    nestOptions.httpsOptions = httpsOptions;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, nestOptions);
  app.useBodyParser("json", { limit: "18mb" });
  installFrontendDevProxy(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("GROUND Unified API")
    .setDescription("Production-oriented logistics and C-end shop API")
    .setVersion("0.1.0")
    .build();

  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = getPort();
  await app.listen(port);
  logger.log(`Listening on ${httpsOptions ? "https" : "http"}://localhost:${port}`);
};

void bootstrap();
