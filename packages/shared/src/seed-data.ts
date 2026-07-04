import type { LogisticsOrder, Product, ProductCategory, RecipientAddress } from "./types";

export const shopProductCategories: ProductCategory[] = [
  { slug: "daily", label: "日用品", description: "居家清洁、收纳、洗护等高频消耗品" },
  { slug: "tops", label: "上衣", description: "T 恤、卫衣、衬衫和轻外套" },
  { slug: "pants", label: "裤子", description: "休闲裤、工装裤、牛仔裤和运动裤" },
  { slug: "shoes", label: "鞋子", description: "通勤、运动和日常休闲鞋" },
  { slug: "accessories", label: "配饰", description: "背包、帽子、围巾、首饰和小件配饰" }
];

export const sampleProducts: Product[] = [
  {
    id: "prod-soft-tissues",
    slug: "soft-tissues",
    name: "北欧棉柔抽纸",
    summary: "三层加厚，家庭、办公室和宿舍都适合。",
    description: "柔韧亲肤的日常抽纸，压纹不易破，适合家庭囤货和轻量跨境售卖。",
    imageUrl: "/images/product-soft-tissues.svg",
    galleryImageUrls: ["/images/product-soft-tissues.svg", "/images/product-home-kit.svg"],
    isPublished: true,
    categorySlug: "daily",
    category: "日用品",
    salesLabel: "已售 2,418",
    originLabel: "中国仓发货",
    serviceLabels: ["48 小时内处理", "破损补发", "人工确认订单"],
    detailSections: [
      { title: "商品亮点", body: "三层加厚纸张，触感柔软，适合客厅、卧室、办公室多场景使用。" },
      { title: "包装信息", body: "整提压缩包装，外箱适合普通跨境包裹规格，便于仓库复核。" }
    ],
    skus: [
      { id: "sku-tissues-6pack", model: "6 包装", size: "S", price: 8, currency: "USD", stockLabel: "现货" },
      { id: "sku-tissues-18pack", model: "18 包装", size: "L", price: 19, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-home-kit",
    slug: "home-kit",
    name: "旅行分装洗护套装",
    summary: "便携瓶身、防漏压盖，出差旅行更轻松。",
    description: "包含分装瓶、喷雾瓶和收纳袋，适合洗发水、沐浴露、乳液等日常用品携带。",
    imageUrl: "/images/product-home-kit.svg",
    galleryImageUrls: ["/images/product-home-kit.svg"],
    isPublished: true,
    categorySlug: "daily",
    category: "日用品",
    salesLabel: "已售 963",
    originLabel: "广州仓",
    serviceLabels: ["防漏设计", "轻量包装", "人工确认订单"],
    detailSections: [
      { title: "套装内容", body: "多规格分装瓶搭配透明收纳袋，安检、出差、露营场景都可使用。" },
      { title: "使用建议", body: "首次使用前建议清洗晾干，液体装入后请确认瓶盖完全扣紧。" }
    ],
    skus: [
      { id: "sku-home-kit-clear", model: "透明", size: "8 件套", price: 12, currency: "USD", stockLabel: "现货" },
      { id: "sku-home-kit-amber", model: "琥珀色", size: "8 件套", price: 13, currency: "USD", stockLabel: "少量" }
    ]
  },
  {
    id: "prod-basic-tee",
    slug: "basic-tee",
    name: "云感基础白T",
    summary: "柔软亲肤，单穿或内搭都清爽。",
    description: "棉感针织面料，肩线利落，适合日常通勤和多季节叠穿。",
    imageUrl: "/images/product-basic-tee.svg",
    galleryImageUrls: ["/images/product-basic-tee.svg", "/images/product-hoodie.svg"],
    isPublished: true,
    categorySlug: "tops",
    category: "上衣",
    salesLabel: "已售 5,209",
    originLabel: "杭州仓",
    serviceLabels: ["尺码可选", "人工验货", "人工确认订单"],
    detailSections: [
      { title: "版型", body: "微宽松直筒版型，领口加固，减少日常洗涤后的变形。" },
      { title: "面料", body: "棉感混纺针织，触感柔软，适合贴身穿着。" }
    ],
    skus: [
      { id: "sku-basic-tee-white-m", model: "白色", size: "M", price: 21, currency: "USD", stockLabel: "现货" },
      { id: "sku-basic-tee-white-l", model: "白色", size: "L", price: 21, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-hoodie",
    slug: "soft-hoodie",
    name: "轻绒连帽卫衣",
    summary: "柔软内里，适合春秋通勤和居家。",
    description: "轻绒内里搭配立体帽型，保暖但不厚重，适合年轻客群日常穿搭。",
    imageUrl: "/images/product-hoodie.svg",
    galleryImageUrls: ["/images/product-hoodie.svg"],
    isPublished: true,
    categorySlug: "tops",
    category: "上衣",
    salesLabel: "已售 1,674",
    originLabel: "义乌仓",
    serviceLabels: ["多色可选", "人工验货", "人工确认订单"],
    detailSections: [
      { title: "设计", body: "连帽抽绳、袋鼠兜和罗纹袖口，基础款更容易搭配。" },
      { title: "洗护", body: "建议冷水反面洗涤，低温晾干，减少面料起球。" }
    ],
    skus: [
      { id: "sku-hoodie-gray-m", model: "浅灰", size: "M", price: 38, currency: "USD", stockLabel: "现货" },
      { id: "sku-hoodie-black-l", model: "黑色", size: "L", price: 38, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-cargo-pants",
    slug: "cargo-pants",
    name: "城市机能工装裤",
    summary: "多口袋设计，通勤和户外都能穿。",
    description: "耐磨斜纹面料搭配松紧腰，兼顾收纳和活动自由度。",
    imageUrl: "/images/product-cargo-pants.svg",
    galleryImageUrls: ["/images/product-cargo-pants.svg", "/images/product-wide-pants.svg"],
    isPublished: true,
    categorySlug: "pants",
    category: "裤子",
    salesLabel: "已售 2,087",
    originLabel: "深圳仓",
    serviceLabels: ["尺码可选", "耐磨面料", "人工确认订单"],
    detailSections: [
      { title: "功能口袋", body: "侧边大口袋可放手机、钥匙和小件工具，日常出行更方便。" },
      { title: "版型", body: "直筒微宽松，膝部活动空间更充足。" }
    ],
    skus: [
      { id: "sku-cargo-pants-khaki-m", model: "卡其", size: "M", price: 45, currency: "USD", stockLabel: "现货" },
      { id: "sku-cargo-pants-black-l", model: "黑色", size: "L", price: 45, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-wide-pants",
    slug: "wide-pants",
    name: "垂感阔腿休闲裤",
    summary: "高腰垂顺，适合通勤和周末穿搭。",
    description: "柔软垂感面料，腰部弹力设计，对不同身形更友好。",
    imageUrl: "/images/product-wide-pants.svg",
    galleryImageUrls: ["/images/product-wide-pants.svg"],
    isPublished: true,
    categorySlug: "pants",
    category: "裤子",
    salesLabel: "已售 1,326",
    originLabel: "杭州仓",
    serviceLabels: ["不易皱", "舒适腰头", "人工确认订单"],
    detailSections: [
      { title: "穿着体验", body: "面料垂顺，走动时线条自然，适合搭配 T 恤、衬衫或针织衫。" },
      { title: "尺码建议", body: "喜欢更松弛效果可选择大一码，腰部弹力可适配日常浮动。" }
    ],
    skus: [
      { id: "sku-wide-pants-coffee-s", model: "咖色", size: "S", price: 42, currency: "USD", stockLabel: "现货" },
      { id: "sku-wide-pants-gray-m", model: "灰色", size: "M", price: 42, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-aurora-runner",
    slug: "aurora-runner",
    name: "Aurora Runner 轻跑鞋",
    summary: "轻量透气，日常通勤和短途运动都适合。",
    description: "A breathable knit upper, stable midsole, and flexible outsole make Aurora Runner easy to sell and easy to wear.",
    imageUrl: "/images/product-aurora.svg",
    galleryImageUrls: ["/images/product-aurora.svg", "/images/product-slip-on.svg"],
    isPublished: true,
    categorySlug: "shoes",
    category: "鞋子",
    salesLabel: "已售 3,802",
    originLabel: "东莞仓",
    serviceLabels: ["尺码齐全", "轻量鞋盒", "人工确认订单"],
    detailSections: [
      { title: "脚感", body: "针织鞋面提升透气性，中底稳定，长时间步行也更轻松。" },
      { title: "适用场景", body: "适合日常通勤、城市慢跑、旅行步行等轻运动场景。" }
    ],
    skus: [
      { id: "sku-aurora-black-40", model: "黑色", size: "40", price: 89, currency: "USD", stockLabel: "现货" },
      { id: "sku-aurora-white-42", model: "白色", size: "42", price: 89, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-slip-on",
    slug: "soft-slip-on",
    name: "软底一脚蹬休闲鞋",
    summary: "免系带设计，出门快速又轻便。",
    description: "柔软鞋垫和防滑外底，适合日常散步、通勤和旅行穿着。",
    imageUrl: "/images/product-slip-on.svg",
    galleryImageUrls: ["/images/product-slip-on.svg"],
    isPublished: true,
    categorySlug: "shoes",
    category: "鞋子",
    salesLabel: "已售 1,145",
    originLabel: "温州仓",
    serviceLabels: ["防滑外底", "轻量包装", "人工确认订单"],
    detailSections: [
      { title: "穿脱", body: "弹力鞋口设计，不用频繁系鞋带，适合高频出行。" },
      { title: "鞋底", body: "纹路外底提升日常防滑能力，适合室内外多场景。" }
    ],
    skus: [
      { id: "sku-slip-on-beige-39", model: "米色", size: "39", price: 52, currency: "USD", stockLabel: "现货" },
      { id: "sku-slip-on-black-41", model: "黑色", size: "41", price: 52, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-cargo-pack",
    slug: "cargo-pack",
    name: "Cargo Pack 通勤背包",
    summary: "结构清晰，电脑、衣物和小件都能分区收纳。",
    description: "Designed for durable daily use with structured compartments and a compact shipping profile.",
    imageUrl: "/images/product-cargo-pack.svg",
    galleryImageUrls: ["/images/product-cargo-pack.svg", "/images/product-cap.svg"],
    isPublished: true,
    categorySlug: "accessories",
    category: "配饰",
    salesLabel: "已售 2,761",
    originLabel: "广州仓",
    serviceLabels: ["防泼水", "可放 15 寸电脑", "人工确认订单"],
    detailSections: [
      { title: "收纳", body: "主仓、电脑仓和前置小袋分区明确，日常通勤不混乱。" },
      { title: "运输", body: "背包可压缩入箱，适合普通跨境包裹发运。" }
    ],
    skus: [
      { id: "sku-cargo-sand-standard", model: "沙色", size: "Standard", price: 59, currency: "USD", stockLabel: "现货" },
      { id: "sku-cargo-olive-standard", model: "橄榄绿", size: "Standard", price: 59, currency: "USD", stockLabel: "现货" }
    ]
  },
  {
    id: "prod-cap",
    slug: "washed-cap",
    name: "水洗弯檐帽",
    summary: "低调百搭，春夏出门遮阳更方便。",
    description: "水洗棉面料带来复古质感，后扣可调节头围，适合多种日常穿搭。",
    imageUrl: "/images/product-cap.svg",
    galleryImageUrls: ["/images/product-cap.svg"],
    isPublished: true,
    categorySlug: "accessories",
    category: "配饰",
    salesLabel: "已售 4,334",
    originLabel: "义乌仓",
    serviceLabels: ["可调节", "轻量小件", "人工确认订单"],
    detailSections: [
      { title: "材质", body: "水洗棉触感柔软，帽檐弧度自然，适合长时间佩戴。" },
      { title: "搭配", body: "可搭配 T 恤、卫衣、工装裤和休闲鞋，提升日常造型完整度。" }
    ],
    skus: [
      { id: "sku-cap-navy-free", model: "藏青", size: "Free", price: 16, currency: "USD", stockLabel: "现货" },
      { id: "sku-cap-khaki-free", model: "卡其", size: "Free", price: 16, currency: "USD", stockLabel: "现货" }
    ]
  }
];

const londonRecipient: RecipientAddress = {
  id: "recipient-london",
  label: "London warehouse",
  name: "Amelia Carter",
  phone: "+44 20 7946 0958",
  email: "amelia@example.com",
  country: "United Kingdom",
  province: "England",
  city: "London",
  postalCode: "SW1A 1AA",
  addressLine: "18 Market Lane"
};

export const sampleRecipients: RecipientAddress[] = [londonRecipient];

export const sampleLogisticsOrders: LogisticsOrder[] = [
  {
    id: "log-1002",
    orderNo: "LG202604220002",
    cargoType: "B2C",
    status: "UNDER_REVIEW",
    reviewState: "PENDING",
    sender: {
      name: "Ground Customer",
      phone: "+86 755 3000 2200",
      email: "customer@ground.test",
      country: "China",
      province: "Guangdong",
      city: "Shenzhen",
      postalCode: "518000",
      addressLine: "Nanshan logistics building"
    },
    recipient: {
      name: "Ivan Petrov",
      phone: "+7 900 000 2200",
      email: "ivan@example.com",
      country: "Russia",
      province: "Moscow",
      city: "Moscow",
      postalCode: "101000",
      addressLine: "Tverskaya Street 8"
    },
    goodsName: "Garment samples",
    declaredValue: 120,
    declaredCurrency: "USD",
    taxIdOrDocumentNo: "RU-DOC-2200",
    weightKg: 6.5,
    lengthCm: 42,
    widthCm: 36,
    heightCm: 28,
    packageCount: 2,
    createdAt: "2026-04-22T08:20:00.000Z",
    events: [
      {
        id: "evt-review-1002",
        status: "UNDER_REVIEW",
        title: "Order submitted",
        description: "Customer submitted the order and is waiting for logistics review.",
        location: "Shenzhen",
        occurredAt: "2026-04-22T08:20:00.000Z",
        source: "MANUAL"
      }
    ]
  },
  {
    id: "log-1001",
    orderNo: "LG202604190001",
    cargoType: "B2C",
    status: "CUSTOMS_CLEARANCE",
    reviewState: "APPROVED",
    sender: {
      name: "Ground Ops",
      phone: "+86 755 0000 1234",
      email: "ops@ground.test",
      country: "China",
      province: "Guangdong",
      city: "Shenzhen",
      postalCode: "518000",
      addressLine: "Bao'an international transfer center"
    },
    recipient: londonRecipient,
    goodsName: "Sneakers",
    declaredValue: 89,
    declaredCurrency: "USD",
    taxIdOrDocumentNo: "DOC-UK-1001",
    weightKg: 3.2,
    lengthCm: 42,
    widthCm: 30,
    heightCm: 18,
    packageCount: 1,
    trackingNo: "GLB10010001",
    carrierReferenceNo: "CR10010001",
    trackingSource: "AUTO",
    lastMileTrackingNo: "LM90001001",
    createdAt: "2026-04-19T08:30:00.000Z",
    events: [
      {
        id: "evt-1",
        status: "ACCEPTED",
        title: "Shipment accepted",
        description: "Shipment accepted by Ground operations.",
        location: "Shenzhen",
        occurredAt: "2026-04-19T08:30:00.000Z",
        source: "MANUAL"
      },
      {
        id: "evt-2",
        status: "TRANSFER_TO_HUB",
        title: "Moved to transfer hub",
        description: "Shipment moved into the export transfer hub.",
        location: "Shenzhen",
        occurredAt: "2026-04-19T12:10:00.000Z",
        source: "MANUAL"
      },
      {
        id: "evt-3",
        status: "CUSTOMS_CLEARANCE",
        title: "Customs processing",
        description: "Shipment is being processed by destination customs.",
        location: "London",
        occurredAt: "2026-04-21T09:45:00.000Z",
        source: "CARRIER_API"
      }
    ]
  }
];
