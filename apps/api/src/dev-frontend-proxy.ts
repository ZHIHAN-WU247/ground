import type { INestApplication } from "@nestjs/common";
import http from "node:http";
import https from "node:https";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

type FrontendProxyDecision =
  | { kind: "api" }
  | { kind: "proxy" }
  | { kind: "redirect"; location: string };

interface FrontendProxyRequest {
  headers: IncomingHttpHeaders;
  method?: string | undefined;
  url?: string | undefined;
}

interface ProxyableRequest extends IncomingMessage {
  originalUrl?: string;
}

const DEFAULT_FRONTEND_DEV_ORIGIN = "http://localhost:3000";
const FRONTEND_ASSET_PREFIXES = ["/_next/", "/images/"];
const FRONTEND_ASSET_PATHS = new Set(["/favicon.ico", "/manifest.json", "/robots.txt"]);
const BACKEND_ONLY_PATHS = new Set(["/health"]);
const BACKEND_ONLY_PREFIXES = ["/docs", "/docs-json"];

const firstHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const getPathname = (url = "/") => {
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return "/";
  }
};

const isFrontendAssetPath = (pathname: string) =>
  FRONTEND_ASSET_PATHS.has(pathname) || FRONTEND_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isBackendOnlyPath = (pathname: string) =>
  BACKEND_ONLY_PATHS.has(pathname) || BACKEND_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isHtmlNavigation = (headers: IncomingHttpHeaders) => {
  const accept = firstHeaderValue(headers.accept).toLowerCase();
  const fetchDest = firstHeaderValue(headers["sec-fetch-dest"]).toLowerCase();

  return accept.includes("text/html") || fetchDest === "document";
};

export function getFrontendProxyDecision(request: FrontendProxyRequest): FrontendProxyDecision {
  const method = request.method?.toUpperCase() ?? "GET";
  const pathname = getPathname(request.url);

  if (method !== "GET" && method !== "HEAD") {
    return { kind: "api" };
  }

  if (isBackendOnlyPath(pathname)) {
    return { kind: "api" };
  }

  if (pathname === "/" && isHtmlNavigation(request.headers)) {
    return { kind: "redirect", location: "/auth/login" };
  }

  if (isFrontendAssetPath(pathname) || isHtmlNavigation(request.headers)) {
    return { kind: "proxy" };
  }

  return { kind: "api" };
}

export function installFrontendDevProxy(app: INestApplication, frontendOrigin = process.env.FRONTEND_DEV_ORIGIN ?? DEFAULT_FRONTEND_DEV_ORIGIN) {
  const normalizedOrigin = frontendOrigin.trim();

  if (!normalizedOrigin) {
    return;
  }

  const target = new URL(normalizedOrigin);
  const transport = target.protocol === "https:" ? https : http;

  app.use((request: ProxyableRequest, response: ServerResponse, next: () => void) => {
    const decision = getFrontendProxyDecision({
      headers: request.headers,
      method: request.method,
      url: request.originalUrl ?? request.url
    });

    if (decision.kind === "api") {
      next();
      return;
    }

    if (decision.kind === "redirect") {
      response.statusCode = 302;
      response.setHeader("Location", decision.location);
      response.end();
      return;
    }

    proxyToFrontend(request, response, target, transport);
  });
}

function proxyToFrontend(
  request: ProxyableRequest,
  response: ServerResponse,
  target: URL,
  transport: typeof http | typeof https
) {
  const upstream = transport.request(
    {
      headers: {
        ...request.headers,
        host: target.host
      },
      hostname: target.hostname,
      method: request.method,
      path: request.originalUrl ?? request.url ?? "/",
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      protocol: target.protocol
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );

  upstream.on("error", (error) => {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }

    response.statusCode = 502;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end(`Frontend dev server unavailable at ${target.origin}: ${error.message}`);
  });

  request.pipe(upstream);
}
