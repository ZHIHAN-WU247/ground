# CDEK API 2.0 通读与集成笔记

Source: https://www.yuque.com/cdek/api2
Read-through date: 2026-04-19

## 抓取覆盖

- 已抓取线上左侧目录 26 个节点，其中 22 个实际 DOC 文档，4 个 TITLE 分组。
- 目录与元数据见 `docs/cdek-api2-crawl-manifest.json`。
- 左侧目录可读索引见 `docs/cdek-api2-crawl-map.md`。
- 全文正文缓存见 `docs/cdek-api2-fulltext.md`。
- 语雀显示书籍最后更新时间为 2026-01-19 02:07:52 UTC，TOC 最后更新时间为 2025-08-14 11:40:16 UTC。

已通读的目录：

- 客户授权
- 下单：申请下单请求、获取订单信息、修改订单接口、取消订单
- 取件申请：父级正文为空；已读其下的可用日期、注册取件、获取取件信息、修改取件状态、删除取件申请
- 打印面单：申请生成面单、获取面单
- 计算器：按照费率代码获取运费、获取可以使用的服务列表
- 获取城市列表
- 获取服务网点列表
- 查看轨迹
- 附件：轨迹列表、服务列表、货币列表、运输模式列表

## PM / CEO Review

CDEK 尾端物流接入的最小闭环应拆成三条主路径：

1. 报价查询：定位城市和收件方式，查询可用服务，按选中服务计算价格与时效。
2. 订单创建：提交 CDEK 订单，异步获取 CDEK 运单号，再进入内部物流订单状态流。
3. 物流查询：用 CDEK 运单号查询轨迹，压缩成客户可见的普通物流状态和时间线。

MVP 不应先覆盖所有 CDEK 能力。取件申请、面单打印、修改/取消订单属于后台运营能力，只有当业务需要上门揽收或打印面单时才进入首批实现。前台不能暴露 first-leg / last-mile 内部拆分，只显示普通物流节点。

## Eng Review

### 认证

标准 API 2.0 使用 OAuth client credentials：

- Test: `https://api.edu.cdek.ru/v2/oauth/token?parameters`
- Prod: `https://api.cdek.ru/v2/oauth/token?parameters`
- Method: `POST`
- Content-Type: `application/x-www-form-urlencoded`
- Body: `grant_type=client_credentials`, `client_id`, `client_secret`
- Response: `access_token`, `token_type=bearer`, `expires_in` about 3599 seconds, `scope`, `jti`

实现上应做 token cache，按 `expires_in` 提前刷新。不要把 CDEK token 暴露给前端。

### 报价查询

基础查询接口：

- 城市：`GET /v2/location/cities`
- 网点/自提点/快递柜：`GET /v2/deliverypoints`
- 可用服务列表：`POST /v2/calculator/tarifflist`
- 指定服务报价：`POST /v2/calculator/tariff`

报价请求核心字段：

- `from_location` 与 `to_location` 必填。可用 `code`、`postal_code`、`country_code`、`city`、`address` 识别城市/地址。
- `packages` 必填，重量单位是克，长宽高单位是厘米。
- `type`: `1` 电商，`2` 普通。
- `currency`: 货币编号，默认使用合同货币。附件中 `CNY` 的编号是 `6`。
- `lang`: `rus`、`eng`、`zho`，服务列表建议用 `zho` 方便后台核对。
- `services`: 增值服务，可选。

`/calculator/tarifflist` 返回 `tariff_codes[]`，包含 `tariff_code`、服务名、`delivery_mode`、运费、工作日/自然日时效。`/calculator/tariff` 返回单个服务的 `delivery_sum`、`total_sum`、`period_min/max`、`calendar_min/max`、`weight_calc`、币种与错误列表。

### 订单创建

创建订单：

- Test: `https://api.edu.cdek.ru/v2/orders`
- Prod: `https://api.cdek.ru/v2/orders`
- Method: `POST`
- Content-Type: `application/json; charset=utf-8`
- 成功提交返回 HTTP `202`
- 注意：创建接口不直接返回运单号。必须使用返回的 `entity.uuid` 调用订单信息接口。

获取订单信息：

- `GET /v2/orders/{entity_uuid}`
- 返回原始下单数据、`cdek_number`、`requests`、`statuses`、错误/警告等。

下单关键字段：

- `type`: `1` 电商，`2` 普通。电商为默认。
- `number`: 客户订单跟踪号，仅电商订单可用；不填则 CDEK 设为订单 UUID。
- `tariff_code`: 服务代码，必填。
- `shipment_point` / `delivery_point`: 用于站点/网点模式。
- `sender`: 普通订单必填；电商订单可不填。
- `recipient`: 必填，含姓名和电话。
- `from_location` / `to_location`: 地址信息必填；和站点字段之间存在互斥关系。
- 国际电商订单要特别关注 `date_invoice`、`shipper_name`、`shipper_address`、`seller.address`、商品 `items`、`weight_gross`、`country_code` 等字段。
- `packages`: 必填。包裹 `number`、`weight` 必填，长宽高要么一起填要么都不填。电商订单的 `items` 必填。
- `items[].ware_key` 不能包含汉字。
- `print`: 可选，`waybill` 或 `barcode`。

修改订单：

- `PATCH /v2/orders`
- 用 `uuid` 或 `cdek_number` 标识订单，`uuid` 优先。
- 仅在 CDEK 仓库中没有货物移动时可改，文档表达为订单仍处于已创建/未入库阶段。

取消订单：

- `DELETE /v2/orders/{uuid}`
- 文档强调已经入仓/移动后的订单不能用该接口取消。实现时应把取消能力限制在早期状态。

### 面单

生成面单：

- `POST /v2/print/barcodes`
- Body: `orders[]`，每个订单用 `order_uuid` 或 `cdek_number` 标识。
- 返回面单任务 `entity.uuid`。

获取面单：

- `GET /v2/print/barcodes/{uuid}`
- 下载 PDF: `GET /v2/print/barcodes/{uuid}.pdf`
- 文档写明 `entity.uuid` 有效期为创建订单后的 60 分钟。

### 取件申请

这组接口服务于快递员上门从商家仓库取货：

- 可用日期：`POST /v2/intakes/availableDays`
- 注册取件：`POST /v2/intakes`
- 获取取件信息：`GET /v2/intakes/{uuid}`
- 修改取件状态：`PATCH /v2/intakes/{uuid}/status`
- 删除取件申请：`DELETE /v2/intakes/{uuid}`

注册取件核心字段包括 `cdek_number` 或 `order_uuid`、`intake_date`、包裹尺寸重量、`sender`、`from_location`。文档建议上门时间区间至少 3 小时。

### 轨迹查询

轨迹查询文档没有使用 `/v2/oauth/token`，而是单独的 Web tracing 鉴权：

- Auth: `POST https://auth.api.cdek.ru/web/simpleauth/authorize`
- Query: `POST https://tracing.api.cdek.ru/web/tracing/v2/order/find`
- Body: `orderNumber`

返回结构包括：

- `result.order`: 运单主信息，如 CDEK 单号、包裹数、创建时间、派送模式、重量、寄件人、收件人、付款人、费率。
- `result.statusGroups`: 轨迹分组，如 `CREATED`、`IN_PROGRESS`、`DELIVERED`。
- `result.statuses`: 细粒度轨迹，含 `code`、`name`、`timestamp`、`currentCity`、`nextCity`、`groupId`。
- `warehouse`: 仓库计划发出、仓储天数等内部字段。

附件中的客户可见状态重点：

- `CREATED`: 已创建
- `ACCEPTED_FOR_DELIVERY`: 接受来交付
- `ACCEPTED_AT_SORTING_CENTER`: 达到分拣中心
- `SENT_TO_RECEIVER_COUNTRY`: 送到目的国
- `SENT_TO_NEXT_CITY`: 送到下一个到达点
- `SENDER_COUNTRY_CUSTOM_CLEARANCE`: 发出国清关
- `RECEIVER_COUNTRY_CUSTOM_CLEARANCE`: 目的国清关
- `CUSTOM_CLEARANCE_COMPLETED`: 清关完成
- `READY_FOR_PICK_UP`: 已到达待取
- `PICKED_UP_BY_COURIER`: 交给快递员
- `COURIER_DELIVERY_FAILED`: 快递员无法交付
- `DELIVERED`: 已交付
- `NOT_DELIVERED`: 未交付

实现时应将这些细粒度 code 映射为产品内部状态，不把仓库、清关、first-leg/last-mile 的内部判断直接展示给客户。

### 附件常量

运输模式：

- `1`: 门到门
- `2`: 门到库
- `3`: 库到门
- `4`: 库到库
- `6`: 门到快递柜
- `7`: 库到快递柜
- `8`: 快递柜到门
- `9`: 快递柜到库
- `10`: 快递柜到快递柜

常见服务代码：

- `121`-`123`, `62`: 干线快递
- `136`-`139`: Parcel 快件，50kg 以下，电商
- `184`-`186`: E-com Standard，电商
- `231`-`234`: 经济性快件，50kg 以下，电商
- `291`, `293`-`295`: E-com Express，500kg 以下，电商
- `480`-`483`: Express 小包快递
- `748`-`751`: 拼箱，70kg 到 100000kg
- `2261`-`2263`: Documents Express

文档中有重复服务码行，例如 `186`、`2263` 分别出现在不同模式说明里。实现不要硬编码为唯一解释，应以 `/calculator/tarifflist` 的合同实时返回为准。

## 推荐实现边界

后端建议拆成独立 provider adapter，避免业务代码直接依赖 CDEK 字段：

- `CdekAuthClient`: token 获取、缓存、刷新。
- `CdekLocationClient`: 城市与网点查询。
- `CdekQuoteClient`: `tarifflist` 与 `tariff` 报价。
- `CdekOrderClient`: 创建、查询、修改、取消。
- `CdekLabelClient`: 面单生成与下载。
- `CdekTrackingClient`: 单独处理 tracing 鉴权和轨迹查询。

业务层只接触归一化 DTO：

- `QuoteRequest` / `QuoteOption`
- `CarrierOrderDraft` / `CarrierOrderResult`
- `CarrierTrackingEvent`
- `CarrierServicePoint`

暂时不要锁死最终数据库表。可以先保留 provider raw payload 字段，方便比对 CDEK 返回、排查异步下单和轨迹异常。

## 风险与待确认

- 需要 CDEK 正式/测试 `client_id`、`client_secret`，以及 tracing API 的独立账号与密码规则。
- 报价和可用服务强依赖合同权限，不能只按附件服务列表硬编码。
- 语雀文档里的部分 URL 有空格或排版痕迹，代码中应规范化为标准路径。
- 下单接口是异步流程，必须设计 `submitted -> accepted/rejected -> cdek_number_ready` 的状态机。
- 轨迹接口与 API 2.0 标准 OAuth 不同，应独立配置和熔断。
- 城市编码、网点编码建议做缓存，否则报价/下单体验会被地址解析拖慢。
