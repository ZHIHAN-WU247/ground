import { createHash } from "node:crypto";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { CarrierLabelStatus, CurrencyCode, LogisticsOrder, LogisticsQuote, LogisticsQuoteRequest, LogisticsStatus, TrackingEvent } from "@ground/shared";

interface CdekToken {
  accessToken: string;
  expiresAt: number;
  scope: string | undefined;
  tokenType: string | undefined;
}

interface CdekCreateOrderResult {
  entityUuid: string;
  requestUuid: string | undefined;
  cdekNumber: string | undefined;
  state: string | undefined;
  raw: unknown;
}

interface CdekLabelResult {
  labelUuid: string;
  status: CarrierLabelStatus;
  url: string | undefined;
  raw: unknown;
}

interface CdekTrackingResult {
  events: TrackingEvent[];
  raw: unknown;
}

interface CdekHandshakeResult {
  environment: "production";
  tokenType?: string;
  expiresIn?: number;
  scope?: string;
  sampleCity?: {
    code?: number;
    city?: string;
    countryCode?: string;
  };
}

interface CdekCalculateQuoteInput extends LogisticsQuoteRequest {
  tariffCode?: number;
}

type CdekLocationAddress = LogisticsOrder["sender"] & {
  locationCode?: string;
  fiasGuid?: string;
};

interface CdekCityMatch {
  code?: number;
  city?: string;
  city_uuid?: string;
  fias_guid?: string;
  country_code?: string;
  region?: string;
  region_code?: number;
  postal_code?: string;
}

const cdekStatusMap: Record<string, LogisticsStatus> = {
  CREATED: "APPROVED",
  ACCEPTED_FOR_DELIVERY: "ACCEPTED",
  SENT_TO_SORTING_CENTER: "IN_TRANSIT",
  ACCEPTED_AT_SORTING_CENTER: "IN_TRANSIT",
  SENT_TO_NEXT_CITY: "IN_TRANSIT",
  SENT_TO_RECEIVER_COUNTRY: "IN_TRANSIT",
  SENT_TO_PICK_UP_POINT: "IN_TRANSIT",
  SENDER_COUNTRY_CUSTOM_CLEARANCE: "CUSTOMS_CLEARANCE",
  RECEIVER_COUNTRY_CUSTOM_CLEARANCE: "CUSTOMS_CLEARANCE",
  CUSTOM_CLEARANCE_COMPLETED: "CUSTOMS_RELEASED",
  READY_FOR_PICK_UP: "OUT_FOR_DELIVERY",
  POSTAMAT_READY_FOR_PICK_UP: "OUT_FOR_DELIVERY",
  PICKED_UP_BY_COURIER: "OUT_FOR_DELIVERY",
  COURIER_DELIVERY_FAILED: "EXCEPTION",
  NOT_DELIVERED: "EXCEPTION",
  DELIVERED: "DELIVERED"
};

const cdekDefaultTariffCode = 139;
const cdekWarehouseToWarehouseTariffCode = 136;
const cdekWarehouseToDoorTariffCode = 137;

const cdekMoscowOrigin: Required<Pick<CdekLocationAddress, "country" | "province" | "city" | "postalCode" | "addressLine" | "locationCode" | "fiasGuid">> = {
  country: "Russia",
  province: "Moscow",
  city: "Moscow",
  postalCode: "101000",
  addressLine: "Tverskaya Street 1",
  locationCode: "44",
  fiasGuid: "c2deb16a-0330-4f05-821f-1d09c93331e6"
};

@Injectable()
export class CdekCarrierProvider {
  private token: CdekToken | null = null;
  private trackingToken: string | null = null;

  async handshake(): Promise<CdekHandshakeResult> {
    const token = await this.getToken();
    const cities = await this.cdekFetch<Array<{ code?: number; city?: string; country_code?: string }>>(
      "/v2/location/cities?country_codes=RU&size=1&lang=zho",
      { method: "GET" }
    );

    const result: CdekHandshakeResult = {
      environment: "production",
      expiresIn: Math.max(0, Math.floor((token.expiresAt - Date.now()) / 1000))
    };

    if (token.tokenType) {
      result.tokenType = token.tokenType;
    }

    if (token.scope) {
      result.scope = token.scope;
    }

    if (cities[0]) {
      const sampleCity: NonNullable<CdekHandshakeResult["sampleCity"]> = {};

      if (cities[0].code !== undefined) {
        sampleCity.code = cities[0].code;
      }

      if (cities[0].city !== undefined) {
        sampleCity.city = cities[0].city;
      }

      if (cities[0].country_code !== undefined) {
        sampleCity.countryCode = cities[0].country_code;
      }

      result.sampleCity = sampleCity;
    }

    return result;
  }

  async createOrder(order: LogisticsOrder): Promise<CdekCreateOrderResult> {
    this.assertProductionWritesEnabled();

    const response = await this.cdekFetch<Record<string, unknown>>("/v2/orders", {
      method: "POST",
      body: this.buildOrderPayload(order)
    });
    const entity = this.getRecord(response.entity);
    const requests = Array.isArray(response.requests) ? response.requests : [];
    const firstRequest = this.getRecord(requests[0]);
    const entityUuid = this.getString(entity.uuid);

    if (!entityUuid) {
      throw new ServiceUnavailableException("CDEK accepted no entity uuid for the order.");
    }

    const initialResult = {
      entityUuid,
      requestUuid: this.getString(firstRequest.uuid),
      cdekNumber: this.getString(entity.cdek_number),
      state: this.getString(firstRequest.state) || this.getString(firstRequest.type),
      raw: response
    };

    return this.resolvePendingOrderNumber(initialResult);
  }

  async calculateQuote(input: CdekCalculateQuoteInput): Promise<LogisticsQuote> {
    const resolvedInput = await this.resolveQuoteDestination(input);
    const tariffCode = this.resolveCalculatorTariffCode(resolvedInput);
    const response = await this.cdekFetch<Record<string, unknown>>("/v2/calculator/tariff", {
      method: "POST",
      body: this.buildCalculatorPayload(resolvedInput)
    });
    const cdekCurrency = this.mapCdekCurrency(this.getString(response.currency));
    const currency = cdekCurrency ?? "RUB";
    const deliverySum = this.getNumber(response.delivery_sum);
    const totalSum = this.getNumber(response.total_sum) ?? deliverySum;
    const lastMileAmount = this.roundMoney(totalSum ?? 0);
    const volumetricWeightKg = this.roundWeight((resolvedInput.lengthCm * resolvedInput.widthCm * resolvedInput.heightCm) / 6000);
    const weightCalc = this.getNumber(response.weight_calc);
    const chargeableWeightKg = this.roundWeight(weightCalc ? weightCalc / 1000 : Math.max(resolvedInput.weightKg, volumetricWeightKg) * resolvedInput.packageCount);
    const periodMin = this.getNumber(response.period_min);
    const periodMax = this.getNumber(response.period_max);
    const quote: LogisticsQuote = {
      id: `cdek-quote-${Date.now()}`,
      cargoType: resolvedInput.cargoType,
      destinationCountry: resolvedInput.destinationCountry,
      destinationCity: resolvedInput.destinationCity,
      deliveryMethod: resolvedInput.deliveryMethod ?? "TO_DOOR",
      actualWeightKg: resolvedInput.weightKg,
      volumetricWeightKg,
      chargeableWeightKg,
      amount: lastMileAmount,
      firstMileAmount: 0,
      lastMileAmount,
      totalAmount: lastMileAmount,
      currency,
      cdekTariffCode: tariffCode,
      ...(periodMin !== undefined ? { cdekDeliveryMinDays: periodMin } : {}),
      ...(periodMax !== undefined ? { cdekDeliveryMaxDays: periodMax } : {}),
      breakdown: [
        { label: "First mile amount", amount: 0 },
        { label: "CDEK last-mile amount", amount: lastMileAmount },
        { label: "Total amount", amount: lastMileAmount }
      ]
    };

    if (resolvedInput.currency !== currency) {
      quote.exchangeRateNote = `CDEK returned the carrier price in ${currency}.`;
    }

    return quote;
  }

  async getOrder(entityUuid: string): Promise<CdekCreateOrderResult> {
    const response = await this.cdekFetch<Record<string, unknown>>(`/v2/orders/${encodeURIComponent(entityUuid)}`, {
      method: "GET"
    });
    const entity = this.getRecord(response.entity);
    const requests = Array.isArray(response.requests) ? response.requests : [];
    const firstRequest = this.getRecord(requests[0]);

    return {
      entityUuid: this.getString(entity.uuid) || entityUuid,
      requestUuid: this.getString(firstRequest.uuid),
      cdekNumber: this.getString(entity.cdek_number),
      state: this.getString(firstRequest.state) || this.getString(firstRequest.type),
      raw: response
    };
  }

  async createLabel(order: LogisticsOrder): Promise<CdekLabelResult> {
    this.assertProductionWritesEnabled();

    const orderReference = order.carrierEntityUuid
      ? { order_uuid: order.carrierEntityUuid }
      : order.trackingNo
        ? { cdek_number: order.trackingNo }
        : null;

    if (!orderReference) {
      throw new BadRequestException("Create the CDEK order before requesting a label.");
    }

    const response = await this.cdekFetch<Record<string, unknown>>("/v2/print/barcodes", {
      method: "POST",
      body: {
        orders: [orderReference]
      }
    });
    const entity = this.getRecord(response.entity);
    const labelUuid = this.getString(entity.uuid);

    if (!labelUuid) {
      throw new ServiceUnavailableException("CDEK accepted no label uuid.");
    }

    return {
      labelUuid,
      status: "SUBMITTED",
      url: undefined,
      raw: response
    };
  }

  async getLabel(labelUuid: string): Promise<CdekLabelResult> {
    const response = await this.cdekFetch<Record<string, unknown>>(`/v2/print/barcodes/${encodeURIComponent(labelUuid)}`, {
      method: "GET"
    });
    const entity = this.getRecord(response.entity);
    const statuses = Array.isArray(entity.statuses) ? entity.statuses.map((item) => this.getRecord(item)) : [];
    const latestCode = this.getString(statuses.at(-1)?.code) || this.getString(entity.status);
    const url = this.getString(entity.url);

    return {
      labelUuid: this.getString(entity.uuid) || labelUuid,
      status: this.mapLabelStatus(latestCode, url),
      url,
      raw: response
    };
  }

  async pullTrackingEvents(cdekNumber: string): Promise<CdekTrackingResult> {
    const token = await this.getTrackingToken();
    const response = await this.fetchJson<Record<string, unknown>>("https://tracing.api.cdek.ru/web/tracing/v2/order/find", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
        "X-User-Lang": "zho"
      },
      body: JSON.stringify({ orderNumber: cdekNumber })
    });
    const result = this.getRecord(response.result);
    const statuses = Array.isArray(result.statuses) ? result.statuses.map((item) => this.getRecord(item)) : [];
    const events = statuses
      .map((status, index) => this.mapTrackingEvent(status, cdekNumber, index))
      .filter((event): event is TrackingEvent => Boolean(event));

    return {
      events,
      raw: response
    };
  }

  private async cdekFetch<T>(path: string, options: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
    const token = await this.getToken();
    return this.fetchJson<T>(`${this.getApiBaseUrl()}${path}`, {
      method: options.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
  }

  private async getToken(): Promise<CdekToken> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token;
    }

    const clientId = process.env.CDEK_CLIENT_ID;
    const clientSecret = process.env.CDEK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException("CDEK credentials are not configured.");
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    });
    const response = await this.fetchJson<Record<string, unknown>>(`${this.getApiBaseUrl()}/v2/oauth/token?parameters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    const accessToken = this.getString(response.access_token);
    const expiresIn = Number(response.expires_in ?? 0);

    if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new ServiceUnavailableException("CDEK token response was incomplete.");
    }

    const token: CdekToken = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: this.getString(response.scope),
      tokenType: this.getString(response.token_type)
    };

    this.token = token;
    return token;
  }

  private async getTrackingToken(): Promise<string> {
    if (this.trackingToken) {
      return this.trackingToken;
    }

    const user = process.env.CDEK_TRACKING_USER;
    const password = process.env.CDEK_TRACKING_PASSWORD;

    if (!user || !password) {
      throw new ServiceUnavailableException("CDEK tracking credentials are not configured.");
    }

    const hashedPass = createHash("md5").update(password).digest("hex");
    const response = await this.fetchJson<Record<string, unknown>>("https://auth.api.cdek.ru/web/simpleauth/authorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user, hashedPass })
    });
    const token = this.getString(response.token);

    if (!token) {
      throw new ServiceUnavailableException("CDEK tracking token response was incomplete.");
    }

    this.trackingToken = token;
    return token;
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const text = await response.text();

    if (!response.ok) {
      throw new ServiceUnavailableException(`CDEK request failed ${response.status}: ${this.truncate(text)}`);
    }

    return (text ? JSON.parse(text) : {}) as T;
  }

  private buildOrderPayload(order: LogisticsOrder) {
    const packageWeightGrams = Math.max(1, Math.round(order.weightKg * 1000));
    const tariffCode = order.cdekTariffCode ?? cdekDefaultTariffCode;
    const today = new Date().toISOString().slice(0, 10);
    const sender = this.normalizeSenderOrigin(order.sender);
    const items = this.buildOrderItems(order, packageWeightGrams, sender.country);

    return {
      type: 1,
      number: order.orderNo,
      tariff_code: tariffCode,
      comment: `GROUND ${order.orderNo}`,
      date_invoice: today,
      shipper_name: sender.name,
      shipper_address: this.formatAddress(sender),
      recipient: {
        name: order.recipient.name,
        email: order.recipient.email,
        phones: [{ number: order.recipient.phone }]
      },
      from_location: {
        country_code: this.mapCountryCode(sender.country),
        region: sender.province,
        city: sender.city,
        postal_code: sender.postalCode,
        address: sender.addressLine,
        ...(this.buildLocationIdentifier(sender) ?? {})
      },
      to_location: {
        country_code: this.mapCountryCode(order.recipient.country),
        region: order.recipient.province,
        city: order.recipient.city,
        postal_code: order.recipient.postalCode,
        address: order.recipient.addressLine,
        ...(this.buildLocationIdentifier(order.recipient) ?? {})
      },
      packages: [
        {
          number: `${order.orderNo}-1`,
          weight: packageWeightGrams,
          length: Math.round(order.lengthCm),
          width: Math.round(order.widthCm),
          height: Math.round(order.heightCm),
          items
        }
      ]
    };
  }

  private buildOrderItems(order: LogisticsOrder, packageWeightGrams: number, senderCountry: string) {
    const cargoItems = order.cargoItems?.length
      ? order.cargoItems
      : [{ name: order.goodsName, unitValueCny: order.declaredValue, quantity: 1 }];
    const totalQuantity = cargoItems.reduce((total, item) => total + item.quantity, 0);
    const itemWeightGrams = Math.max(1, Math.ceil(packageWeightGrams / Math.max(1, totalQuantity)));

    return cargoItems.map((item, index) => ({
      name: item.name,
      ware_key: this.toAsciiWareKey(`${order.orderNo}-${index + 1}`),
      payment: { value: 0 },
      cost: this.roundMoney(item.unitValueCny),
      weight: itemWeightGrams,
      weight_gross: itemWeightGrams,
      amount: item.quantity,
      country_code: this.mapCountryCode(senderCountry)
    }));
  }

  private buildCalculatorPayload(input: CdekCalculateQuoteInput) {
    const tariffCode = this.resolveCalculatorTariffCode(input);
    const defaultDestination = this.getDefaultCdekDestination(input.destinationCountry, input.destinationCity);
    const destinationPostalCode = input.destinationPostalCode ?? defaultDestination.postalCode ?? "";
    const destinationAddressLine = input.destinationAddressLine ?? defaultDestination.addressLine ?? input.destinationCity;
    const recipientLocation: CdekLocationAddress = {
      name: "Quote recipient",
      phone: "+70000000000",
      country: input.destinationCountry,
      province: "",
      city: input.destinationCity,
      postalCode: destinationPostalCode,
      addressLine: destinationAddressLine,
      ...(input.destinationLocationCode ?? defaultDestination.locationCode ? { locationCode: input.destinationLocationCode ?? defaultDestination.locationCode } : {}),
      ...(input.destinationFiasGuid ? { fiasGuid: input.destinationFiasGuid } : {})
    };
    const packageWeightGrams = Math.max(1, Math.round(input.weightKg * 1000));
    const packageCount = Math.max(1, Math.round(input.packageCount));

    return {
      type: 1,
      tariff_code: tariffCode,
      from_location: {
        country_code: this.mapCountryCode(cdekMoscowOrigin.country),
        region: cdekMoscowOrigin.province,
        city: cdekMoscowOrigin.city,
        postal_code: cdekMoscowOrigin.postalCode,
        address: cdekMoscowOrigin.addressLine,
        ...(this.buildLocationIdentifier(cdekMoscowOrigin) ?? {})
      },
      to_location: {
        country_code: this.mapCountryCode(input.destinationCountry),
        city: input.destinationCity,
        postal_code: destinationPostalCode,
        address: destinationAddressLine,
        ...(this.buildLocationIdentifier(recipientLocation) ?? {})
      },
      packages: Array.from({ length: packageCount }, () => ({
          weight: packageWeightGrams,
          length: Math.round(input.lengthCm),
          width: Math.round(input.widthCm),
          height: Math.round(input.heightCm)
        }))
    };
  }

  private async resolveQuoteDestination(input: CdekCalculateQuoteInput): Promise<CdekCalculateQuoteInput> {
    if (input.destinationLocationCode || input.destinationFiasGuid) {
      return input;
    }

    const countryCode = this.mapCountryCode(input.destinationCountry);
    const postalCode = this.getString(input.destinationPostalCode);

    if (postalCode) {
      const postalMatches = await this.findCdekCities({
        countryCode,
        postalCode,
        size: 5
      });
      const postalMatch = this.selectCityMatch(input.destinationCity, postalMatches);

      if (postalMatch) {
        return this.applyCityMatch(input, postalMatch);
      }
    }

    const cityMatches = await this.findCdekCities({
      countryCode,
      city: input.destinationCity,
      size: 5
    });
    const cityMatch = this.selectCityMatch(input.destinationCity, cityMatches);

    if (cityMatch) {
      return this.applyCityMatch(input, cityMatch);
    }

    if (cityMatches.length > 1) {
      throw new BadRequestException(
        `Multiple CDEK cities matched ${input.destinationCity}. Add a postal code or choose a city from suggestions before requesting a quote.`
      );
    }

    throw new BadRequestException(`CDEK could not identify destination city ${input.destinationCity}. Add a postal code or choose a CDEK city.`);
  }

  private async findCdekCities(input: { countryCode: string; postalCode?: string; city?: string; size: number }) {
    const params = new URLSearchParams({
      country_codes: input.countryCode,
      lang: "eng",
      size: String(input.size)
    });

    if (input.postalCode) {
      params.set("postal_code", input.postalCode);
    }

    if (input.city) {
      params.set("city", input.city);
    }

    return this.cdekFetch<CdekCityMatch[]>(`/v2/location/cities?${params.toString()}`, {
      method: "GET"
    });
  }

  private selectCityMatch(destinationCity: string, matches: CdekCityMatch[]) {
    if (matches.length === 1) {
      return matches[0];
    }

    const normalizedDestination = this.normalizeCityName(destinationCity);
    const exactMatches = matches.filter((match) => this.normalizeCityName(match.city) === normalizedDestination);

    return exactMatches.length === 1 ? exactMatches[0] : undefined;
  }

  private applyCityMatch(input: CdekCalculateQuoteInput, match: CdekCityMatch): CdekCalculateQuoteInput {
    return {
      ...input,
      destinationCity: match.city || input.destinationCity,
      ...(match.code !== undefined ? { destinationLocationCode: String(match.code) } : {}),
      ...(match.fias_guid ? { destinationFiasGuid: match.fias_guid } : {})
    };
  }

  private resolveCalculatorTariffCode(input: CdekCalculateQuoteInput) {
    if (input.tariffCode !== undefined) {
      return input.tariffCode;
    }

    if (input.cargoType !== "B2C") {
      return cdekDefaultTariffCode;
    }

    return input.deliveryMethod === "TO_WAREHOUSE" ? cdekWarehouseToWarehouseTariffCode : cdekWarehouseToDoorTariffCode;
  }

  private async resolvePendingOrderNumber(initialResult: CdekCreateOrderResult): Promise<CdekCreateOrderResult> {
    if (initialResult.cdekNumber || !this.isPendingOrderState(initialResult.state)) {
      return initialResult;
    }

    let latestResult = initialResult;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      latestResult = await this.getOrder(initialResult.entityUuid);

      if (latestResult.cdekNumber || !this.isPendingOrderState(latestResult.state)) {
        return latestResult;
      }
    }

    return latestResult;
  }

  private mapTrackingEvent(status: Record<string, unknown>, cdekNumber: string, index: number): TrackingEvent | null {
    const code = this.getString(status.code);
    const timestamp = this.getString(status.timestamp);

    if (!code || !timestamp) {
      return null;
    }

    const currentCity = this.getRecord(status.currentCity);
    const nextCity = this.getRecord(status.nextCity);
    const location = this.getString(currentCity.name) || this.getString(nextCity.name) || "CDEK";

    return {
      id: `cdek-${cdekNumber}-${code}-${index}-${timestamp}`,
      status: cdekStatusMap[code] ?? "IN_TRANSIT",
      title: this.getString(status.name) || code,
      description: code,
      location,
      occurredAt: timestamp,
      source: "CARRIER_API"
    };
  }

  private mapLabelStatus(code: string | undefined, url?: string): CarrierLabelStatus {
    if (url) {
      return "READY";
    }

    if (code === "READY") {
      return "READY";
    }

    if (code === "INVALID" || code === "ERROR") {
      return "FAILED";
    }

    if (code === "EXPIRED") {
      return "EXPIRED";
    }

    if (code === "PROCESSING" || code === "ACCEPTED") {
      return "PROCESSING";
    }

    return "SUBMITTED";
  }

  private assertProductionWritesEnabled() {
    if (process.env.CDEK_ENABLE_PRODUCTION_WRITES !== "true") {
      throw new ServiceUnavailableException("CDEK production writes are disabled. Set CDEK_ENABLE_PRODUCTION_WRITES=true to create real carrier orders.");
    }
  }

  private getApiBaseUrl() {
    return process.env.CDEK_API_BASE_URL || "https://api.cdek.ru";
  }

  private mapCountryCode(country: string) {
    const normalized = country.trim().toLowerCase();
    const map: Record<string, string> = {
      china: "CN",
      cn: "CN",
      russia: "RU",
      ru: "RU",
      kazakhstan: "KZ",
      kz: "KZ",
      belarus: "BY",
      by: "BY"
    };

    return map[normalized] ?? country.slice(0, 2).toUpperCase();
  }

  private formatAddress(address: LogisticsOrder["sender"]) {
    return [address.addressLine, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(", ");
  }

  private normalizeSenderOrigin(sender: LogisticsOrder["sender"]): LogisticsOrder["sender"] {
    return {
      ...sender,
      ...cdekMoscowOrigin
    };
  }

  private getDefaultCdekDestination(country: string, city: string) {
    const normalizedCity = city.trim().toLowerCase();

    if (this.mapCountryCode(country) === "RU" && (normalizedCity === "moscow" || normalizedCity === "москва")) {
      return {
        postalCode: cdekMoscowOrigin.postalCode,
        addressLine: cdekMoscowOrigin.addressLine,
        locationCode: cdekMoscowOrigin.locationCode
      };
    }

    return {};
  }

  private isPendingOrderState(state?: string) {
    return state === "ACCEPTED" || state === "CREATED";
  }

  private buildLocationIdentifier(address: Pick<CdekLocationAddress, "locationCode" | "fiasGuid">) {
    const code = this.normalizeLocationCode(address.locationCode);
    const fiasGuid = this.getString(address.fiasGuid);

    if (code === undefined && !fiasGuid) {
      return undefined;
    }

    return {
      ...(code !== undefined ? { code } : {}),
      ...(fiasGuid ? { fias_guid: fiasGuid } : {})
    };
  }

  private normalizeLocationCode(value: string | undefined) {
    const code = this.getString(value);

    if (!code) {
      return undefined;
    }

    const asNumber = Number(code);
    return Number.isFinite(asNumber) ? asNumber : code;
  }

  private toAsciiWareKey(value: string) {
    return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20) || `GROUND${Date.now()}`;
  }

  private getRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private getString(value: unknown) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "bigint") {
      return String(value);
    }

    return undefined;
  }

  private normalizeCityName(value: unknown) {
    return this.getString(value)?.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  }

  private getNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private mapCdekCurrency(value: string | undefined): CurrencyCode | undefined {
    const normalized = value?.trim().toUpperCase();

    if (normalized === "RUB" || normalized === "CNY" || normalized === "USD") {
      return normalized;
    }

    return undefined;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private roundWeight(value: number) {
    return Math.round(value * 100) / 100;
  }

  private truncate(value: string) {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
}
