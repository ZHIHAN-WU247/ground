# CDEK 地址库查询请求回传

日期: 2026-04-28

## 目标

使用 CDEK API 发送“查询地址库城市列表”的真实请求，并记录结果。

接口:

- `GET https://api.cdek.ru/v2/location/cities`

手册来源:

- `docs/cdek-api2-fulltext.md`
- `docs/cdek-api2-integration-readthrough.md`

## 已执行的真实请求

本次直接向 CDEK 正式环境发起了城市地址库查询请求:

```powershell
Invoke-WebRequest -Uri 'https://api.cdek.ru/v2/location/cities?size=3&lang=zho' -UseBasicParsing
```

返回结果:

```text
HTTP 401 Unauthorized
```

## 结论

这说明 `location/cities` 不是公开接口，必须先完成 OAuth 鉴权，再携带 Bearer Token 请求。

项目内后端实现也印证了这一点，见:

- `apps/api/src/modules/carrier/cdek-carrier.provider.ts`

其中调用顺序是:

1. `POST /v2/oauth/token?parameters`
2. 取回 `access_token`
3. `GET /v2/location/cities` 并附带 `Authorization: Bearer <token>`

## 当前阻塞点

当前工作区未发现可用的 CDEK 凭证:

- `CDEK_CLIENT_ID`
- `CDEK_CLIENT_SECRET`

已检查位置:

- `D:\GROUND\.env.local`
- `D:\GROUND\apps\api\.env.local`
- 运行中的 API 代码与日志

目前本地仅有:

- `CARRIER_API_BASE_URL`
- `CARRIER_API_KEY`

但这不是 CDEK OAuth 所需字段，无法直接换取 CDEK Token。

## 正确请求格式

先鉴权:

```http
POST https://api.cdek.ru/v2/oauth/token?parameters
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id=YOUR_CDEK_CLIENT_ID
client_secret=YOUR_CDEK_CLIENT_SECRET
```

再查询城市库:

```http
GET https://api.cdek.ru/v2/location/cities?size=1000&lang=zho
Authorization: Bearer YOUR_ACCESS_TOKEN
Accept: application/json
```

常用筛选参数示例:

- `country_codes=RU`
- `country_codes=CN`
- `postal_code=198261`
- `city=Москва`
- `lang=zho`
- `size=1000`
- `page=0`

## 建议的下一步

要真正“查所有 CDEK 地址库”，需要先补充正式或测试环境凭证，然后分页拉取:

1. 配置 `CDEK_CLIENT_ID`
2. 配置 `CDEK_CLIENT_SECRET`
3. 先拿 token
4. 循环请求 `/v2/location/cities?page=N&size=1000`
5. 汇总导出为 JSON 或 Markdown

## 可直接复用的命令模板

```powershell
$tokenResp = Invoke-RestMethod `
  -Uri 'https://api.cdek.ru/v2/oauth/token?parameters' `
  -Method Post `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body 'grant_type=client_credentials&client_id=YOUR_CDEK_CLIENT_ID&client_secret=YOUR_CDEK_CLIENT_SECRET'

$token = $tokenResp.access_token

Invoke-RestMethod `
  -Uri 'https://api.cdek.ru/v2/location/cities?size=1000&lang=zho&page=0' `
  -Headers @{ Authorization = "Bearer $token"; Accept = 'application/json' } `
  -Method Get
```

## 本次状态

本次已经成功发送真实 API 请求，但因缺少 CDEK OAuth 凭证，查询被 CDEK 以 `401 Unauthorized` 拒绝，尚未拿到完整地址库数据。
