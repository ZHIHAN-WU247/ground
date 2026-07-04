import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const config = {
  baseUrl: process.env.CDEK_BASE_URL || "https://api.cdek.ru",
  clientId: process.env.CDEK_CLIENT_ID,
  clientSecret: process.env.CDEK_CLIENT_SECRET,
  outDir: process.env.OUT_DIR || new URL(".", import.meta.url).pathname,
  lang: process.env.CDEK_LANG || "rus",
};

if (!config.clientId || !config.clientSecret) {
  throw new Error("Set CDEK_CLIENT_ID and CDEK_CLIENT_SECRET before running.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, options = {}, tries = 4) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${response.status} ${text.slice(0, 300)}`);
      }
      return text;
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function fetchJson(url, options = {}) {
  return JSON.parse(await fetchText(url, options));
}

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const tokenBody = new URLSearchParams({
  grant_type: "client_credentials",
  client_id: config.clientId,
  client_secret: config.clientSecret,
});

const token = await fetchJson(`${config.baseUrl}/v2/oauth/token?parameters`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: tokenBody,
});

const authHeaders = {
  authorization: `Bearer ${token.access_token}`,
  accept: "application/json",
};

const regions = await fetchJson(
  `${config.baseUrl}/v2/location/regions?country_codes=RU&lang=${config.lang}&size=1000`,
  { headers: authHeaders },
);

const allCities = [];
const perRegion = [];

for (const region of regions) {
  const url = `${config.baseUrl}/v2/location/cities?country_codes=RU&lang=${config.lang}&region_code=${region.region_code}&size=10000`;
  const cities = await fetchJson(url, { headers: authHeaders });
  console.error(`region ${region.region_code}: ${cities.length}`);
  perRegion.push({
    region_code: region.region_code,
    region: region.region,
    count: cities.length,
  });
  allCities.push(...cities);
  await sleep(120);
}

const deduped = new Map();
for (const city of allCities) {
  const key = `${city.code ?? ""}|${city.city_uuid ?? ""}|${city.fias_guid ?? ""}|${city.city ?? ""}`;
  if (!deduped.has(key)) deduped.set(key, city);
}

const cities = [...deduped.values()].sort(
  (a, b) =>
    (a.region_code ?? 0) - (b.region_code ?? 0) ||
    (a.code ?? 0) - (b.code ?? 0) ||
    String(a.city ?? "").localeCompare(String(b.city ?? ""), "ru"),
);

const fields = [
  "code",
  "city_uuid",
  "city",
  "fias_guid",
  "country_code",
  "country",
  "region",
  "region_code",
  "fias_region_guid",
  "sub_region",
  "longitude",
  "latitude",
  "time_zone",
  "payment_limit",
];

const timestamp = new Date().toISOString();
const meta = {
  source: `${config.baseUrl}/v2/location/cities?country_codes=RU&region_code={region_code}&lang=${config.lang}&size=10000`,
  environment: config.baseUrl.includes("edu") ? "CDEK test/edu" : "CDEK production",
  fetched_at: timestamp,
  lang: config.lang,
  regions_count: regions.length,
  raw_rows: allCities.length,
  unique_rows: cities.length,
  max_region_count: Math.max(...perRegion.map((item) => item.count)),
  regions_over_9999: perRegion.filter((item) => item.count >= 9999),
  fields,
};

await mkdir(config.outDir, { recursive: true });
await writeFile(
  path.join(config.outDir, `russia-regions-${config.lang}.json`),
  JSON.stringify({ meta: { ...meta, source: `${config.baseUrl}/v2/location/regions?country_codes=RU&lang=${config.lang}&size=1000` }, regions }, null, 2),
);
await writeFile(
  path.join(config.outDir, `russia-cities-${config.lang}.json`),
  JSON.stringify({ meta, cities }, null, 2),
);
await writeFile(
  path.join(config.outDir, `russia-cities-${config.lang}.csv`),
  [fields.join(","), ...cities.map((city) => fields.map((field) => csvCell(city[field])).join(","))].join("\n"),
);
await writeFile(
  path.join(config.outDir, `russia-cities-${config.lang}-summary.json`),
  JSON.stringify({ meta, perRegion }, null, 2),
);

console.log(JSON.stringify(meta, null, 2));
