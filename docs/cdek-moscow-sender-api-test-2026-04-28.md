# CDEK 莫斯科始发城市 API 测试报告

日期: 2026-04-28

测试文件:

- `D:\SDK\城市代码\База индексов РФ.xlsx`

## 测试目标

验证“莫斯科作为始发城市”时，当前项目中的 API 是否可以成功返回 CDEK 运单号。

## 表格解析结果

已读取 Excel 原始数据并确认标准莫斯科主城记录存在:

- `Код ЭК4` / 城市代码: `44`
- 城市名: `Москва`
- 区/城市: `Москва`
- 区域: `Москва (Россия)`

统计结果:

- `code = 44` 的莫斯科主城行数: `1983`
- 对应唯一邮编数: `1983`

部分邮编样本:

- `101000`
- `101300`
- `101700`
- `101702`
- `101705`
- `101749`
- `101750`
- `101751`
- `101753`
- `101756`

## 实际 API 测试

### 1. 本地健康检查

请求:

```http
GET http://localhost:4000/health
```

结果:

- `200 OK`

说明本地 API 正在运行。

### 2. 创建莫斯科始发订单

第一次尝试在 `sender` 里带 `locationCode=44`:

```json
{
  "sender": {
    "city": "Moscow",
    "province": "Moscow",
    "postalCode": "127560",
    "locationCode": "44"
  }
}
```

结果:

- `400 Bad Request`
- 错误: `sender.property locationCode should not exist`

这说明当前运行中的 API 进程没有接收 `locationCode` 字段，和源码 DTO 存在差异。

### 3. 改用纯城市名 + 邮编再次测试

实际成功提交的创建请求核心字段:

```json
{
  "cargoType": "B2C",
  "sender": {
    "name": "Moscow Sender Test",
    "phone": "+79990000000",
    "email": "ops@ground.local",
    "country": "Russia",
    "province": "Moscow",
    "city": "Moscow",
    "postalCode": "127560",
    "addressLine": "Tverskaya Street 1"
  },
  "recipient": {
    "name": "Receiver Test",
    "phone": "+8675530002200",
    "email": "receiver@example.com",
    "country": "China",
    "province": "Guangdong",
    "city": "Shenzhen",
    "postalCode": "518000",
    "addressLine": "Nanshan logistics building test bay"
  }
}
```

创建订单接口:

```http
POST http://localhost:4000/logistics/orders
```

结果:

- 成功创建本地订单
- 返回订单 ID: `log-1006`

### 4. 审核并触发 CDEK 放号

请求:

```http
PATCH http://localhost:4000/admin/logistics/orders/log-1006/review
Headers:
  x-ground-dev-admin: true
  x-ground-dev-admin-email: ops@ground.local

Body:
{"decision":"APPROVE"}
```

结果:

- 没有返回运单号
- 订单状态停在:
  - `status = UNDER_REVIEW`
  - `reviewState = TRACKING_FAILED`
  - `carrierCreateState = FAILED`

后端返回的失败原因:

```text
Automatic CDEK order release failed: CDEK production writes are disabled. Set CDEK_ENABLE_PRODUCTION_WRITES=true to create real carrier orders.
```

## 结论

当前环境下，无法完成“莫斯科始发 -> 成功返回 CDEK 运单号”的真实验证。

原因不是莫斯科城市数据本身有问题，而是环境级阻塞:

1. `CDEK_ENABLE_PRODUCTION_WRITES` 未开启
2. `apps/api/.env.local` 中也没有可见的 `CDEK_CLIENT_ID / CDEK_CLIENT_SECRET`
3. 本地运行中的 API 在真正请求 CDEK 前就被写入保护拦截

因此，对“所有莫斯科始发城市 API 是否能返回运单号”的结论是:

- 在当前环境里，`不能`
- 失败原因一致，都是写入开关关闭
- 这不是某个莫斯科邮编或城市代码单独失败，而是全量都会失败在同一层

## 额外观察

当前运行中的 API 对 `sender.locationCode` 返回 `should not exist`，但源码中的 DTO 已声明该字段为可选。这说明:

- 运行中的服务版本和当前源码可能不完全一致
- 或当前进程尚未加载到最新 DTO 定义

## 如需继续做“真实全量验证”

要真正验证 `1983` 个莫斯科邮编是否都能成功返回运单号，需要先满足:

1. 配置 `CDEK_CLIENT_ID`
2. 配置 `CDEK_CLIENT_SECRET`
3. 设置 `CDEK_ENABLE_PRODUCTION_WRITES=true`
4. 重启本地 API
5. 再批量回放 `code=44` 的莫斯科邮编数据

在这之前，任何莫斯科始发测试都会被同一层阻断。
