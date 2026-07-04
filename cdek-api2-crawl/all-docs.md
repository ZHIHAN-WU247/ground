# CDEK API 2.0 语雀文档爬取

Source: https://www.yuque.com/cdek/api2
Book: API 2.0版本文档
Book updated: 2026-01-19T02:07:52.000Z
Crawled at: 2026-06-15T05:59:52.011Z

## TOC

- [客户授权](https://www.yuque.com/cdek/api2/authorization)
- 下单
  - [申请下单请求](https://www.yuque.com/cdek/api2/order-request)
  - [获取订单信息](https://www.yuque.com/cdek/api2/order-info)
  - [修改订单接口](https://www.yuque.com/cdek/api2/order-update)
  - [取消订单](https://www.yuque.com/cdek/api2/order-request-cancel)
- [取件申请](https://www.yuque.com/cdek/api2/aql1bkxggnt0mpvg)
  - [获取快递员上门取件可用日期（针对货到付款）](https://www.yuque.com/cdek/api2/tgfb0hy8qh1gm8vx)
  - [注册快递员上门取件申请](https://www.yuque.com/cdek/api2/tzaklkr6vw4rn0xm)
  - [获取申请信息（通过 UUID）](https://www.yuque.com/cdek/api2/xleu2p9amyybzfvc)
  - [修改取件申请的状态](https://www.yuque.com/cdek/api2/ex38lg91drsygye9)
  - [删除取件申请](https://www.yuque.com/cdek/api2/cbwrmvx0nc40yfnb)
- 打印面单
  - [申请生成面单](https://www.yuque.com/cdek/api2/barcode-create)
  - [获取面单](https://www.yuque.com/cdek/api2/barcode_receive)
- 计算器
  - [按照费率代码获取运费](https://www.yuque.com/cdek/api2/tariff_code_calc)
  - [获取可以使用的服务列表](https://www.yuque.com/cdek/api2/available_tariff)
- [获取城市列表](https://www.yuque.com/cdek/api2/cities)
- [获取服务网点列表](https://www.yuque.com/cdek/api2/pick-up-points)
- [查看轨迹](https://www.yuque.com/cdek/api2/tracing)
- 附件
  - [轨迹列表](https://www.yuque.com/cdek/api2/statuses)
  - [服务列表](https://www.yuque.com/cdek/api2/tariff_codes)
  - [货币列表](https://www.yuque.com/cdek/api2/currency)
  - [运输模式列表](https://www.yuque.com/cdek/api2/delivery_modes)



---

## 客户授权

URL: https://www.yuque.com/cdek/api2/authorization
Doc ID: 5364209
Updated: 2025-07-14T04:22:23.000Z

**POST请求， 请求URL**

| 测试环境 | https://api.edu.cdek.ru/v2/oauth/token?parameters |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/oauth/token?parameters |
| 请求内容格式 | application/x-www-form-urlencoded |

**请求数据**

| 序列号 | 数据名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | grant_type | 授权模式 (client_credentials) | string | 是 |
| 2 | client_id | 账号 | string | 是 |
| 3 | client_secret | 密码 | string | 是 |

**请求例子**

```python
import requests

url = 'https://api.edu.cdek.ru/v2/oauth/token?parameters'
data = {
    'grant_type': 'client_credentials',
    'client_id': 'wqGwiQx0gg8mLtiEKsUinjVSICCjtTEP',
    'client_secret': 'RmAmgvSgSl1yirlz9QupbzOJVqhCxcP5'
}

res = requests.post(url, data=data).json()
print(res)
```

```plain
curl -X POST 'https://api.edu.cdek.ru/v2/oauth/token?parameters' \
  -d 'grant_type=client_credentials' \
  -d 'client_id=wqGwiQx0gg8mLtiEKsUinjVSICCjtTEP' \
  -d 'client_secret=RmAmgvSgSl1yirlz9QupbzOJVqhCxcP5'
```

**返回数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | access_token | 令牌 | string |
| 2 | token_type | 令牌类型 (bearer) | string |
| 3 | expires_in | 有效期限 (3599秒) | integer |
| 4 | scope | 令牌范围 | string |
| 5 | jti | 唯一的令牌标识符 | string |

**返回数据例子**

```json
{
  "access_token": "<REDACTED_CDEK_ACCESS_TOKEN>",
  "token_type": "bearer",
  "expires_in": 3599,
  "scope": "location:all order:all payment:all",
  "jti": "sbbOlDCeyqKRuoLaBAciEpAl5AQ"
}
```

**错误例子**

| 错误 | 错误描述 (英文) | 错误描述 (中文) |
| --- | --- | --- |
| unauthorized | No such account secure | 账号或密码有错误 |
| unauthorized | Account secure is not active | 账号被锁定 |
| unauthorized | Full authentication is required to access this resource | 请求错误 |

---

## 申请下单请求

URL: https://www.yuque.com/cdek/api2/order-request
Doc ID: 5355637
Updated: 2025-07-04T05:19:32.000Z

申请下单请求不返回运单号，为了获取运单号需要使用申请下单请求返回的请求UUID（entity.uuid）提交到获取下单请求结果 (/cdek/api2/order-request-result)的接口。

下单请求

请求内容格式为 JSON (Content-Type: application/json) 字符编码 UTF-8.

POST-请求， 请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/orders |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/orders |

​

请求提交成功的话CDEK返回 HTTP 202 状态码
请求内容
​

CDEK系统有两种订单：
电商订单 - 向买家发的货，被电商下单的
普通订单 - 一般指的个人发的货，不属于电商类型的订单

国际订单 - 寄件国家 不等于 收件国家并且两国不属于同样的海关联盟，比如：中国-俄罗斯 是国际货运。俄罗斯-哈萨克斯坦 不算国际订单。
​

​

内容包含的属性以下:

|  | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | type | 订单类型: / 1 - "电商" (仅持有 "电商"类型签约的合同)， 默认值 / 2 - "普通" (其他合同） | integer | 否 |
| 2 | number | 客户订单跟踪号 (不填的话CDEK设置为订单的UUID) / 该仅 "电商"类型订单可使用 | string(32) | 否 |
| 3 | tariff_code | 服务代码 - 快递产品代码 (查看服务列表 / ) | integer | 是 |
| 4 | comment | 订单备注 | string(255) | 否 |
| 5 | shipment_point1 | 寄件站点代码 | string(255) | 否 |
| 6 | delivery_point1 | 收件站点代码 | string(255) | 否 |
| 7 | date_invoice | 发货时的发票日期 / 该属性仅 "电商" 类型订单可以使用的 | date (yyyy-MM-dd) | 否 / 国际-是 |
| 8 | shipper_name | 承运商名称 / 该属性仅 "电商" 类型订单可以使用的 | string(255) | 否 / 国际-是 |
| 9 | shipper_address | 承运商地址 / 该属性仅 "电商" 类型订单可以使用的 | string(255) | 否 / 国际-是 |
| 10 | delivery_recipient_cost | 运输附加费 - 电商可添加让买家多付运费 / 该属性仅 "电商" 类型订单可以使用的 | money | 否 |
| 10.1 | value | 运输附加费 - 金额 | float | 是 |
| 10.2 | vat_sum | 运输附加费 - 税额 | float | 否 |
| 10.3 | vat_rate | 运输附加费 - 税率（百分之几） /  (可选 0，10，18，20, null - 不收税) | integer | 否 |
| 11 | delivery_recipient_cost_adv | 根据货件申报价值的运输附加费用 / 该属性仅 "电商" 类型订单可以使用的 | threshold[] | 否 |
| 11.1 | threshold | 货件申报价值少于等于 | integer | 是 |
| 11.2 | sum | 根据货件申报价值 - 附加费用金额 | float | 是 |
| 11.3 | vat_sum | 根据货件申报价值- 税额 | float | 否 |
| 11.4 | vat_rate | 根据货件申报价值 税率  / (可选 0，10，18，20, null - 不收税) | integer | 否 |
| 12 | sender | 寄件方 | contact | 电商-否 / 普通-是 / ​ |
| 12.1 | company | 公司名称 | string(255) |  |
| 12.2 | name | 姓名 | string(255) |  |
| 12.3 | email | 电子邮箱地址 | string(255) |  |
| 12.4 | phones | 电话号码列表 | phone[] |  |
| 12.4.1 | number2 | 电话号码，国际格式 比如 +79094768888 / ​ | string(255) |  |
| 12.4.2 | additional | 分机号码 | string(255) | 否 |
| 13 | seller | 实际卖家 / 该属性仅 "电商" 类型订单可以使用的 | seller | 否 |
| 13.1 | inn | 卖家税号 | string(20) | 否 |
| 13.2 | name | 卖家名称 | string(255) | 是-填 / 了inn / 的话 |
| 13.3 | phone | 卖家电话号码 | string(255) |  |
| 13.4 | ownership_form | 卖家所有制形式 | integer |  |
| 13.5 | address | 卖家地址 / 该属性仅 "电商" 类型订单可以使用的 | string(255) | 否 / 国际-是 |
| 14 | recipient | 收件方 | contact | 是 |
| 14.1 | company | 公司名称 | string(255) | 否 |
| 14.10 | phones | 电话号码列表 | phone[] | 是 |
| 14.10.1 | number2 | 电话号码，国际格式 比如 +79094768888 / ​ | string(255) | 是 |
| 14.10.2 | additional | 分机号码 | string(255) | 否 |
| 14.2 | name | 姓名 | string(255) | 是 |
| 14.3 | passport_series | 护照序列 | string(255) | 否 |
| 14.4 | passport_number | 护照号码 | string(255) | 否 |
| 14.5 | passport_date_of_issue | 护照签发日期 | date (yyyy-MM-dd) | 否 |
| 14.6 | passport_organization | 护照签发机关 | string(255) | 否 |
| 14.7 | tin | 个人税号 | string(255) | 否 |
| 14.8 | passport_date_of_birth | 生日 | date (yyyy-MM-dd) | 否 |
| 14.9 | email | 电子邮箱 | string(255) | 否 |
| 15 | from_location1 | 寄件地址 | location | 是 |
| 15.1 | code | 地点代码 (根据CDEK数据库) | integer | 否 |
| 15.10 | city | 城市名称 | string(255) | 否 |
| 15.11 | kladr_code | 俄罗斯海关局-旧版地址数据库的地址代码 | string(255) | 否 |
| 15.12 | address | 地址 | string(255) | 是 |
| 15.2 | fias_guid | 俄罗斯海关局-新版地址数据库(FIAS)的地址代码 | UUID | 否 |
| 15.3 | postal_code | 邮编 | string(255) | 否 |
| 15.4 | longitude | 经度 | float | 否 |
| 15.5 | latitude | 纬度 | float | 否 |
| 15.6 | country_code | 国家编码 ISO_3166-1_alpha-2 格式的 | string(2) | 是 |
| 15.7 | region | 州省名称 | string(255) | 否 |
| 15.8 | region_code | 州省代码 (根据CDEK数据库) | integer | 否 |
| 15.9 | sub_region | 县/区 | string(255) | 否 |
| 16 | to_location1 | 收件地址 | location | 是 |
| 16.1 | code | 地点代码 (根据CDEK数据库) | integer | 否 |
| 16.10 | city | 城市名称 | string(255) | 否 |
| 16.11 | kladr_code | 俄罗斯海关局-旧版地址数据库的地址代码 | string(255) | 否 |
| 16.12 | address | 地址 | string(255) | 是 |
| 16.2 | fias_guid | 俄罗斯海关局-新版地址数据库(FIAS)的地址代码 | UUID | 否 |
| 16.3 | postal_code | 邮编 | string(255) | 否 |
| 16.4 | longitude | 经度 | float | 否 |
| 16.5 | latitude | 纬度 | float | 否 |
| 16.6 | country_code | 国家编码 ISO_3166-1_alpha-2 格式的 | string(2) | 是 |
| 16.7 | region | 州省名称 | string(255) | 否 |
| 16.8 | region_code | 州省代码 (根据CDEK数据库) | integer | 否 |
| 16.9 | sub_region | 县/区 | string(255) | 否 |
| 17 | services | 增值服务列表 | service[] | 否 |
| 17.1 | code | 增值服务代码 （查看增值服务列表 / ） | integer | 是 |
| 17.2 | parameter | 增值服务的参数: / 纸箱数量（标准纸箱服务的） / 保险申报价值  (仅普通订单类型订单可使用) | float | 否 |
| 18 | packages | 包装件列表 | package[] | 是 |
| 18.1 | number | 包装件序号 | string(255) | 是 |
| 18.2 | weight | 包装件总重量 （克数） | integer | 是 |
| 18.3 | length | 长度 cm | integer | 要么都填 - / 要么都不填 |
| 18.4 | width | 宽度 cm | integer |  |
| 18.5 | height | 高度 cm | integer |  |
| 18.6 | comment | 包装件的备注 | string(255) | 电商-否 / 普通-是 |
| 18.7 | items | 内件列表（产品列表） / 该属性仅 "电商" 类型订单可以使用的 | item[] | 是 |
| 18.7.1 | name | 产品名称 (可包括尺寸、颜色等等) | string(255) | 是 |
| 18.7.2 | ware_key | 产品SKU 或其他产品唯一识别码（不能包含汉字） | string(20) | 是 |
| 18.7.3 | marking3 | 产品唯一的编号（填该属性的话 数量amout必须等于1），俄罗斯产品标记法（第487-ФЗ号） | string() | 否 |
| 18.7.4 | payment | 单件的代收货款， 收件国家的币种（币种列表） | money | 是 |
| 18.7.4.1 | value | 金额 | float | 是 |
| 18.7.4.2 | vat_sum | 税额 | float | 否 |
| 18.7.4.3 | vat_rate | 税率（百分之几） /  (可选 0，10，18，20, null - 不收税) | integer | 否 |
| 18.7.5 | cost | 单件申报价值 （用于计算保险费） | float | 是 |
| 18.7.6 | weight | 单件重量（单位：克） | integer | 是 |
| 18.7.7 | weight_gross | 单件毛重（单位：克）不能少于 weight | integer | 否 / 国际-是 |
| 18.7.8 | amount | 产品数量 | integer | 是 |
| 18.7.9 | name_i18n | 外文名称 | string(255) | 否 |
| 18.7.10 | brand | 商标名称（英文） | string(255) | 否 |
| 18.7.11 | country_code | 产品制造国家编码 ISO_3166-1_alpha-2 格式的 | string(2) | 否 |
| 18.7.12 | material | 材质编码 (查看列表 / ) | integer | 否 |
| 18.7.13 | wifi_gsm | 是否具有 wifi/gsm 模块 | boolean | 否 |
| 18.7.14 | url | 稍稍平台具体产品链接 | string(255) | 否 |
| 19 | print | 打印（waybill - 货单，barcode - 面单） | string(7) | 否 |

申请下单请求例子

```python
{
  "type": 1,
  "number": "TEST-ORDER-123",
  "tariff_code": "184",
  "date_invoice": "2025-06-26",
  "shipper_name": "Example Shipper",
  "shipper_address": "123 Example Street, Example City, Guangdong, CN",
  "delivery_recipient_cost": {
    "value": 0
  },
  "seller": {
    "address": "123 Example Seller Address, Example City, CN"
  },
  "recipient": {
    "phones": [
      {
        "number": "+79999999999"
      }
    ],
    "name": "Example Recipient"
  },
  "from_location": {
    "city": "Foshan",
    "address": "456 Example Pickup Address",
    "postal_code": null,
    "country_code": "CN"
  },
  "to_location": {
    "address": "142000, Example Delivery Address, Moscow Region, RU",
    "country_code": "RU"
  },
  "services": [],
  "packages": [
    {
      "number": "PKG-1",
      "weight": 5000,
      "length": 10,
      "width": 10,
      "height": 5,
      "items": [
        {
          "name": "Example Item",
          "ware_key": "ITEM-001",
          "payment": {
            "value": 0
          },
          "cost": 0,
          "weight": 500,
          "weight_gross": 500,
          "amount": 2
        }
      ]
    }
  ]
}
```

Python3 申请下单请求例子

```python
# encoding: utf-8
import requests
import urllib.parse
import sys
# python 3

account = '12345609e96ece5b0545d472b7123456'
secure_password = 'abcdef3764e27c8f822ab285d6abcdef'

def get_token(account, secure_password): # 获取令牌
	auth_url = 'http://api.cdek.ru/v2/oauth/token'
	params = {'grant_type':'client_credentials', 'client_id':account, 'client_secret': secure_password}
	full_auth_url = auth_url+'?'+urllib.parse.urlencode(params)
	headers = {'Content-type': 'x-www-form-urlencoded'}
	responce = requests.post(url=full_auth_url, headers=headers)
	responce_data = responce.json()
	return responce_data

responce_data = get_token(account, secure_password)

if 'error' in responce_data:
	print(f'Error: {responce_data["error"]}')
	sys.exit() #获取令牌失败，显示原因，结束

access_token = responce_data["access_token"]

order_data = { # 下单全部数据
	"number" : "TEST3-CT789435359CN", #以卖家生成的，可以用于跟踪轨迹
	"comment" : "",
	"delivery_recipient_cost" : {
		"value" : 0 #不需要代收货款的话填0
	},
	"shipper_name": "CDEK",
	"shipper_address": "Novosibirsk",
	"date_invoice": "2020-03-26", #可以填下单日期
	"seller": {"address": "Shanghai, Changning District"},

	"from_location" : {
		"code" : "",
		"fias_guid" : "",
		"postal_code" : "200050", #根据邮编识别寄件城市
		"longitude" : "",
		"latitude" : "",
		"country_code" : "CN", #必须填的
		"region" : "",
		"sub_region" : "",
		"city" : "Shanghai",
		"kladr_code" : "",
		"address" : ""
	},
	"to_location" : {
		"code" : "",
		"fias_guid" : "",
		"postal_code" : "443034",#根据邮编和地址识别寄件城市
		"longitude" : "",
		"latitude" : "",
		"country_code" : "RU",#必须填的
		"region" : "",
		"sub_region" : "",
		"city" : "Samara",
		"kladr_code" : "",
		"address" : "Yubileynaya ulitsa, 35 28;Samara;Samarskaya oblast"
	},
	"packages" : [ {
		"number" : "TEST3-CT789435359CN",
		"weight": 120,
		"comment" : "",
		"items" : [ {
			"ware_key" : "WELRV0086000627YQ",#不能包含汉字
			"payment" : {
				"value" : 0
			},
			"name" : "Measuring tools",
			"cost" : 0, #申报价值（跟保险费有关）
			"amount" : 1,
			"weight" : 120, #克数
			"weight_gross" : 120,
			"url" : ""
		} ]
	} ],
	"recipient" : {
		"name" : "Ivanov Sergei Petrovich",
		"phones" : [ {"number" : "9990001234"},{"number" : "9990003456"} ]
	},
	"sender" : {
		"name" : "Zhang san"
	},
	"services" : [], #不加上任何增值服务
	"tariff_code" : 246 #服务代码
}

headers = {'Authorization': 'Bearer '+access_token, 'Content-type': 'application/json',
           'DeveloperKey': '1234abcdef***************ad19883'}

responce = requests.post('https://api.cdek.ru/v2/orders', json=order_data, headers=headers)
print(responce) #  - 返回的申请成功 HTTP 状态码 202
print(responce.text)
```

申请成功返回的数据

```json
{
    "entity": {
        "uuid": "72753033-db0e-4042-9392-c5a077e24669"
    },
    "requests": [{
        "request_uuid": "72753033-d75d-4f16-9f08-205b44a70774",
        "type": "CREATE",
        "date_time": "2020-03-26T15:02:56+0700",
        "state": "ACCEPTED"
    }]
}
```

entity.uuid - 用于获取下单结果 (/cdek/api2/order-request-result) 

申请失败返回的数据

```json
{
    "timestamp": 1585210142239,
    "path": "/v2/orders",
    "status": 500,
    "error": "Internal Server Error",
    "message": "Не найден HTTP заголовок Authorization"
}
```

常见异常
申请下单出现的异常

| 异常编码 | 描述 |
| --- | --- |
| delivery_location_is_not_recognized | 无法识别收件地址 |
| shipment_location_is_not_recognized | 无法识别寄件地址 |
| v2_order_tariff_code_is_empty | 没填写 服务产品编码 tariff_code |
| order_recipient_is_empty | 没填写 收件人信息 recipient |
| order_packages_is_empty | 没填写 包裹信息 packages |

生成订单出现的异常请看获取订单信息接口描述 (/cdek/api2/order-info#0jscu)

附件
国家以及对应的币种

| 币种代码 | 币种名称 （俄文） | 国家名称 （俄文） |
| --- | --- | --- |
| RUB | 俄罗斯的卢布（Российский рубль） | 俄罗斯 （Россия） |
| USD | 美元 （Доллар США） | 美国（США） |
| EUR | 欧元 （Евро） | 欧洲国家 （Страны Европы） |
| KZT | 坚戈 （Тенге） | 哈萨克斯坦 （Казахстан） |
| GBP | 英镑 （Фунт стерлингов） | 英国 （Великобритания） |
| CNY | 人民币（Юань） | 中国（Китай） |
| BYN | 白俄罗斯的卢布（Белорусский рубль） | 白俄罗斯（Беларусь） |
| UAH | 格里夫纳（Гривна） | 乌克兰（Украина） |
| AMD | 德拉姆 （Армянский драм） | 亚美尼亚（Армения） |
| KGS | 索姆 （Киргизский сом） | 吉尔吉斯坦（Киргизия） |
| TL | 里拉（Турецкая лира） | 土耳其（Турция） |
| THB | 泰铢（Тайский бат） | 泰国（Тайланд） |
| KRW | 韩元（Южнокорейская вона） | 韩国（Южная Корея） |
| AED | 迪拉姆（Дирхам ОАЭ） | 阿联酋（ОАЭ） |
| UZS | 苏姆（Узбекский сум） | 乌兹别克斯坦（Узбекистан） |
| MNT | 图格里克（Монгольский тугрик） | 蒙古（Монголия） |

附加服务

| 附加服务代码 | 名称 | 描述 |
| --- | --- | --- |
| INSURANCE | 保险 | 计算根据内件申报价值。 / 电商类型的合同不能提交该附加服务，对应电商类型的合同该附加服务自动加上的​ |
| TAKE_SENDER | 在寄件人的城市提货 | 尽可以用于从站点发货模式的订单«库到...»（并且"快件"服务也不能使用该附加服务） |
| DELIV_RECEIVER | 在目的地派送 | 尽可以用于发到库模式的订单«....到库» （并且只能用于 «干线快递»,  «干线特快» 服务）不能用于自提柜的订单 |
| TRYING_ON | 试衣等待 | 派送员派送衣服类型的订单等待收件人试衣服再走或直接退货。 / 不能用于自提柜的订单 |
| PART_DELIV | 部分签收 | 收件人可以只签收部分商品、另一部分退货。 内件中只有一个商品的话无法使用该服务。 / 不能用于自提柜的订单 |
| REVERSE | 双向 | 快件送到收件人等收件人操作再送回给寄件人，（比如需要签合同等等情况） / 不能用于自提柜的订单。 |
| DANGER_CARGO | 危险货物 | 危险货物的订单必须添加该增值服务，运费会提高1.5倍。 |

材质列表

| 材质编码 | 材料名称 （材料名称俄文） |
| --- | --- |
| 1 | 聚酯纤维 （Полиэстер） |
| 2 | 尼龙 （Нейлон） |
| 3 | 绒布 （Флис） |
| 4 | 棉花（Хлопок） |
| 5 | 纺织布（Текстиль） |
| 6 | 亚麻（Лён） |
| 7 | 黏胶丝（Вискоза） |
| 8 | 丝绸（Шелк） |
| 9 | 羽毛（Шерсть） |
| 10 | 开司米（Кашемир） |
| 11 | 皮（Кожа） |
| 12 | 人造革（Кожзам） |
| 13 | 人造毛皮（Искусственный мех） |
| 14 | 麂皮（Замша） |
| 15 | 聚氨酯（Полиуретан） |
| 16 | 氨纶（Спандекс） |
| 17 | 橡胶（Резина） |

---

## 获取订单信息

URL: https://www.yuque.com/cdek/api2/order-info
Doc ID: 5641414
Updated: 2024-11-16T09:13:11.000Z

下单结果接口接收申请下单接口返回的 entity.uuid 值，返回申请下单请求提交的数据以及下单结果。
获取下单结果

请求内容格式为 JSON (Content-Type: application/json) 字符编码 UTF-8.

GET-请求， 请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/orders |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/orders |

​

请求内容
​

```python
# encoding: utf-8
import requests
import urllib.parse
import sys
# python3

responce = { # 申请下单请求返回的数据
    "entity": {
        "uuid": "72753033-11d7-419d-b903-f979d48305cb"
    },
    "requests": [{
        "request_uuid": "72753033-a03b-421a-9764-3810d76f6af2",
        "type": "CREATE",
        "date_time": "2020-03-27T14:13:41+0700",
        "state": "ACCEPTED"
    }]
}
# access_token  获取令牌请求返回的
headers = {'Authorization': 'Bearer '+access_token, 'Content-type': 'application/json'}

entity_uuid = responce.json()['entity']['uuid']
url = f'https://api.cdek.ru/v2/orders/{entity_uuid}'
responce = requests.get(url, json=order_data, headers=headers)
print(responce.text)
print(responce)
```

返回的数据描述
属性必须被CDEK填的的话请注意母属性是否必填的

|  | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | entity | 订单信息 | entity | 否 |
| 1.1 | uuid | CDEK订单识别码 | UUID | 是 |
| 1.2 | is_return | 是否退回订单:true - 是退回的订单false - 一般的 | boolean | 是 |
| 1.3 | type | 订单类型: / 1 - "电商" (仅持有 "电商"类型签约的合同)， 默认值 / 2 - "普通" (其他类型的合同） | integer | 是 |
| 1.4 | cdek_number | CDEK运单号 | long | 否 |
| 1.5 | number | 客户订单跟踪号 (不填的话CDEK设置为订单的UUID) / 该仅 "电商"类型订单可使用 | string() | 否 |
| 1.6 | tariff_code | 服务代码 - 快递产品代码 (查看服务列表) | integer | 是 |
| 1.7 | comment | 订单备注 | string() | 否 |
| 1.8 | shipment_point | 寄件站点代码 | string() | 否 |
| 1.9 | delivery_point | 收件站点代码 | string() | 否 |
| 1.10 | date_invoice | 发货时的发票日期 / 该属性仅 "电商" 类型订单可以使用的 | date (yyyy-MM-dd) | 否 |
| 1.11 | shipper_name | 承运商名称 / 该属性仅 "电商" 类型订单可以使用的 | string(255) | 否 |
| 1.12 | shipper_address | 承运商地址 / 该属性仅 "电商" 类型订单可以使用的 | string(255) | 否 |
| 1.13 | delivery_recipient_cost | 运输附加费 - 电商可添加让买家多付运费 / 该属性仅 "电商" 类型订单可以使用的 | money | 否 |
| 1.13.1 | value | 运输附加费 - 金额 | float | 是 |
| 1.13.2 | vat_sum | 运输附加费 - 税额 | float | 否 |
| 1.13.3 | vat_rate | 运输附加费 - 税率（百分之几） /  (可选 0，10，18，20, null - 不收税) | integer | 否 |
| 1.14 | delivery_recipient_cost_adv | 根据货件申报价值的运输附加费用 / 该属性仅 "电商" 类型订单可以使用的 | threshold[] | 否 |
| 1.14.1 | threshold | 货件申报价值少于等于 | integer | 是 |
| 1.14.2 | sum | 根据货件申报价值 - 附加费用金额 | float | 是 |
| 1.14.3 | vat_sum | 根据货件申报价值- 税额 | float | 否 |
| 1.14.4 | vat_rate | 根据货件申报价值 税率  / (可选 0，10，18，20, null - 不收税) | integer | 否 |
| 1.15 | sender | 寄件方 | contact | 是 |
| 1.15.1 | company | 公司名称 | string() | 否 |
| 1.15.2 | name | 姓名 | string() | 是 |
| 1.15.3 | email | 电子邮箱地址 | string() | 否 |
| 1.15.4 | phones | 电话号码列表 | phone[] | 否 |
| 1.15.4.1 | number | 电话号码，国际格式 比如 +79094768888 | string() | 否 |
| 1.15.4.2 | additional | 分机号码 | string() | 否 |
| 1.16 | seller | 实际卖家 | seller | 否 |
| 1.16.1 | name | 卖家名称 | string(255) | 否 |
| 1.16.2 | inn | 卖家税号 | string(20) | 否 |
| 1.16.3 | phone | 卖家电话号码 | phone | 否 |
| 1.16.4 | ownership_form | 卖家所有制形式 | integer | 否 |
| 1.16.5 | address | 卖家地址 | string | 否 |
| 1.17 | recipient | 收件方 | contact | 是 |
| 1.17.1 | company | 公司名称 | string() | 否 |
| 1.17.2 | name | 姓名 | string() | 是 |
| 1.17.3 | passport_series | 护照序列 | string(255) | 否 |
| 1.17.4 | passport_number | 护照号码 | string(255) | 否 |
| 1.17.5 | passport_date_of_issue | 护照签发日期 | date (yyyy-MM-dd) | 否 |
| 1.17.6 | passport_organization | 护照签发机关 | string(255) | 否 |
| 1.17.7 | tin | 个人税号 | string(255) | 否 |
| 1.17.8 | passport_date_of_birth | 生日 | date (yyyy-MM-dd) | 否 |
| 1.17.9 | email | 电子邮箱 | string() | 否 |
| 1.17.10 | phones | 电话号码列表 | phone[] | 是 |
| 1.17.10.1 | number | 电话号码，国际格式 比如 +79094768888 | string() | 是 |
| 1.17.10.2 | additional | 分机号码 | string() | 否 |
| 1.18 | from_location | 寄件地址 | location | 是 |
| 1.18.1 | code | 地点代码 (根据CDEK数据库) | integer | 否 |
| 1.18.2 | fias_guid | 俄罗斯海关局-新版地址数据库(FIAS)的地址代码 | UUID | 否 |
| 1.18.3 | postal_code | 邮编 | string() | 否 |
| 1.18.4 | longitude | 经度 | float | 否 |
| 1.18.5 | latitude | 纬度 | float | 否 |
| 1.18.6 | country_code | 国家编码 ISO_3166-1_alpha-2 格式的 | string() | 是 |
| 1.18.7 | region | 州省名称 | string() | 否 |
| 1.18.8 | region_code | 州省代码 (根据CDEK数据库) | integer | 否 |
| 1.18.9 | sub_region | 县/区 | string() | 否 |
| 1.18.10 | city | 城市名称 | string() | 否 |
| 1.18.11 | kladr_code | 俄罗斯海关局-旧版地址数据库的地址代码 | string() | 否 |
| 1.18.12 | address | 地址 | string() | 否 |
| 1.19 | to_location | 收件地址 | string() | 是 |
| 1.19.1 | code | 地点代码 (根据CDEK数据库) | integer | 否 |
| 1.19.2 | fias_guid | 俄罗斯海关局-新版地址数据库(FIAS)的地址代码 | UUID | 否 |
| 1.19.3 | postal_code | 邮编 | string() | 否 |
| 1.19.4 | longitude | 经度 | float | 否 |
| 1.19.5 | latitude | 纬度 | float | 否 |
| 1.19.6 | country_code | 国家编码 ISO_3166-1_alpha-2 格式的 | string() | 是 |
| 1.19.7 | region | 州省名称 | string() | 否 |
| 1.19.8 | region_code | 州省代码 (根据CDEK数据库) | integer | 否 |
| 1.19.9 | sub_region | 县/区 | string() | 否 |
| 1.19.10 | city | 城市名称 | string() | 否 |
| 1.19.11 | kladr_code | 俄罗斯海关局-旧版地址数据库的地址代码 | string() | 否 |
| 1.19.12 | address | 地址 | string() | 是 |
| 1.20 | services | 增值服务列表 | service[ ] | 否 |
| 1.20.1 | code | 增值服务代码 （查看增值服务列表） | string() | 是 |
| 1.20.2 | parameter | 增值服务的参数: / 纸箱数量（标准纸箱服务的） / 保险申报价值  (仅普通订单类型订单可使用) | integer | 否 |
| 1.21 | packages | 包装件列表 | package[] | 是 |
| 1.21.1 | number | 包装件序号 | string() | 是 |
| 1.21.2 | weight | 包装件总重量（克数） | integer | 是 |
| 1.21.3 | length | 长度 cm | integer | 否 |
| 1.21.4 | width | 宽度 cm | integer | 否 |
| 1.21.5 | height | 高度 cm | integer | 否 |
| 1.21.6 | comment | 包装件的备注 | string() | 否 |
| 1.21.7 | items | 内件列表（产品列表） | item[] | 否 |
| 1.21.7.1 | name | 产品名称 (可包括尺寸、颜色等等) | string() | 是 |
| 1.21.7.2 | ware_key | 产品SKU 或其他产品唯一识别码（不能包含汉字） | string() | 是 |
| 1.21.7.3 | payment | 单件的代收货款， 收件国家的币种（币种列表） | money | 是 |
| 1.21.7.3.1 | value | 金额 | float | 是 |
| 1.21.7.3.2 | vat_sum | 税额 | float | 否 |
| 1.21.7.3.3 | vat_rate | 税率（百分之几） /  (可选 0，10，18，20, null - 不收税) | integer | 否 |
| 1.21.7.4 | cost | 单件申报价值 （用于计算保险费） | float | 是 |
| 1.21.7.5 | weight | 单件重量（单位：克） | integer | 是 |
| 1.21.7.6 | weight_gross | 单件毛重（单位：克）不能少于 weight | integer | 否 |
| 1.21.7.7 | amount | 产品数量 | integer | да |
| 1.21.7.8 | name_i18n | 外文名称 | string(255) | 否 |
| 1.21.7.9 | brand | 商标名称（英文） | string(255) | 否 |
| 1.21.7.10 | country_code | 产品制造国家编码 ISO_3166-1_alpha-2 格式的 | string(2) | 否 |
| 1.21.7.11 | material | 材料代码 (查看列表) | string(255) | 否 |
| 1.21.7.12 | wifi_gsm | 是否包含 wifi/gsm 模块 | boolean | 否 |
| 1.21.7.13 | url | 稍稍平台具体产品链接稍稍平台具体产品链接 | string() | 否 |
| 1.22 | statuses | 订单状态列表（包括物流状态 - 轨迹） | status[] | 否 |
| 1.22.1 | code | 订单状态码 | string() | 是 |
| 1.22.2 | name | 状态名称 | string() | 是 |
| 1.22.3 | date_time | 状态日期 (格式为：yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 1.22.4 | reason_code | 附加状态码 | string() | 否 |
| 1.22.5 | city | 状态发生地点名称 | string() | 是 |
| 2 | requests | 订单对应的请求列表 | request[] | 是 |
| 2.1 | request_uuid | CDEK数据库的请求ID | UUID | 否 |
| 2.2 | type | 请求类型，所可能的类型：CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 状态日期 (格式为：yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 目前的状态所可能的状态: ACCEPTED, WAITING, SUCCESSFUL, INVALID | string() | 是 |
| 2.5 | errors | 进行请求中发生的错误列表 | error[] | 否 |
| 2.5.1 | code | 错误编码 | string() | 是 |
| 2.5.2 | message | 错误描述 | string() | 是 |
| 2.6 | warnings | 警告列表 | warning[] | 否 |
| 2.6.1 | code | 警告编码 | string() | 是 |
| 2.6.2 | message | 警告描述 | string() | 是 |
| 3 | related_entities | 相关的对象 |  | 否 |
| 3.1 | type | 对象类型，所可能的值： / return_order：退回订单 / direct_order： 一般的订单 | string() | 是 |
| 3.2 | uuid | 对象的识别码（uuid） | UUID | 是 |

返回的数据例子1
返回的内容格式为JSON

```json
{
    "entity": {
        "uuid": "72753033-0c98-4dfb-81b0-e81ddd1f2c28",
        "type": 1,
        "is_return": false,
        "cdek_number": "1169288867", //CDEK运单号 state:SUCCESSFUL才有
        "number": "TEST6-CT789435359CN", //卖家生成的跟踪号
        "tariff_code": 246, //服务代码
        "comment": "",
        "date_invoice": "2020-03-26",
        "shipper_name": "CDEK",
        "shipper_address": "Novosibirsk",
        "delivery_recipient_cost": {
            "value": 0
        },
        "sender": {
            "name": "Zhang san"
        },
        "seller": {
            "name": "Zhang san",
            "address": "Shanghai, Changning District"
        },
        "recipient": {
            "name": "Ivanov Sergei Petrovich",
            "phones": [{
                "number": "9990001234"
            }, {
                "number": "9990003456"
            }]
        },
        "from_location": {
            "code": "12683", //CDEK数据库的城市编码
            "postal_code": "200050",
            "longitude": 121.470462, //CDEK识别的城市经纬度
            "latitude": 31.230863,
            "country_code": "CN",
            "region": "Шанхай",
            "region_code": "906",//CDEK数据库的州省编码
            "sub_region": "",
            "city": "Шанхай",
            "address": "",
            "country": "Китай (КНР)"
        },
        "to_location": {
            "code": "430",
            "fias_guid": "bb035cc3-1dc2-4627-9d25-a1bf2d4b936b",
            "postal_code": "443034",
            "longitude": 50.1018,
            "latitude": 53.1955,
            "country_code": "RU",
            "region": "Самарская",
            "region_code": "57",
            "sub_region": "Самара",
            "city": "Самара",
            "kladr_code": "6300000100000",
            "address": "Lenina ulitsa, 35 28; Samara;Samarskaya oblast",
            "country": "Россия"
        },
        "packages": [{
            "number": "TEST6-CT789435359CN",
            "weight": 120,
            "length": 0,
            "width": 0,
            "height": 0,
            "comment": "",
            "items": [{
                "name": "Measuring tools",
                "ware_key": "WELRV0086000627YQ",
                "payment": {
                    "value": 0
                },
                "weight": 120,
                "weight_gross": 120,
                "amount": 1,
                "url": "",
                "cost": 0
            }]
        }],
        "statuses": [{ //下单请求的状态记录
            "code": "ACCEPTED",
            "name": "Принят",
            "date_time": "2020-03-27T14:24:45+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "CREATED",
            "name": "Создан",
            "date_time": "2020-03-27T14:24:46+0700",
            "city": "Офис СДЭК"
        }],
        "shop_seller_name": "Zhang san",
        "shop_seller_address": "Shanghai, Changning District"
    },
    "requests": [{
        "request_uuid": "72753033-45ac-4fa8-a9d1-962048fb63d0",
        "type": "CREATE",
        "date_time": "2020-03-27T14:24:46+0700",
        "state": "SUCCESSFUL" //创建运单成功
    }]
}
```

返回的数据例子2
这个例子包含多个物流状态 - entity.statuses

```json
{
    "entity": {
        "uuid": "72753033-a2e0-43e3-95e5-57c4c2e9bf4a",
        "is_return": false,
        "cdek_number": "1153700000",
        "number": "5002234627011111",
        "tariff_code": 239,
        "delivery_recipient_cost": {},
        "seller": {
            "name": ""
        },
        "from_location": {
            "code": "44"
        },
        "to_location": {
            "code": "281"
        },
        "packages": [{
            "number": "8800912183354812345",
            "weight": 689,
            "length": 0,
            "width": 0,
            "height": 0,
            "comment": "приложена опись",
            "items": [{
                "name": "battery",
                "ware_key": "MAK-12V5AHLIG",
                "payment": {
                    "value": 0.0,
                    "vat_sum": 0.0
                },
                "weight": 800,
                "weight_gross": 800,
                "amount": 1,
                "cost": 0.0
            }]
        }],
        "statuses": [{
            "code": "CREATED",
            "name": "Создан",
            "date_time": "2019-12-18T10:03:15+0700",
            "city": "Москва"
        }, {
            "code": "ACCEPTED_AT_TRANSIT_WAREHOUSE",
            "name": "Принят на склад транзита",
            "date_time": "2020-02-21T17:49:46+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "READY_FOR_SHIPMENT_IN_TRANSIT_CITY",
            "name": "Выдан на отправку в г.-транзите",
            "date_time": "2020-02-22T09:28:13+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY",
            "name": "Сдан перевозчику в г.-транзите",
            "date_time": "2020-02-22T09:39:23+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "SENT_TO_TRANSIT_CITY",
            "name": "Отправлен в г.-транзит",
            "date_time": "2020-02-22T09:40:41+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "ACCEPTED_AT_TRANSIT_WAREHOUSE",
            "name": "Принят на склад транзита",
            "date_time": "2020-03-20T23:45:25+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "SENT_TO_TRANSIT_CITY",
            "name": "Отправлен в г.-транзит",
            "date_time": "2020-03-21T04:33:33+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "ACCEPTED_AT_TRANSIT_WAREHOUSE",
            "name": "Принят на склад транзита",
            "date_time": "2020-03-22T20:37:25+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "READY_FOR_SHIPMENT_IN_TRANSIT_CITY",
            "name": "Выдан на отправку в г.-транзите",
            "date_time": "2020-03-25T02:39:57+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY",
            "name": "Сдан перевозчику в г.-транзите",
            "date_time": "2020-03-27T05:50:30+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "SENT_TO_TRANSIT_CITY",
            "name": "Отправлен в г.-транзит",
            "date_time": "2020-03-27T08:10:26+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "ACCEPTED_IN_TRANSIT_CITY",
            "name": "Встречен в г.-транзите",
            "date_time": "2020-03-31T08:25:07+0700",
            "city": "Красноярск"
        }, {
            "code": "ACCEPTED_AT_TRANSIT_WAREHOUSE",
            "name": "Принят на склад транзита",
            "date_time": "2020-03-31T10:10:58+0700",
            "city": "Красноярск"
        }, {
            "code": "READY_FOR_SHIPMENT_IN_TRANSIT_CITY",
            "name": "Выдан на отправку в г.-транзите",
            "date_time": "2020-03-31T10:10:59+0700",
            "city": "Красноярск"
        }, {
            "code": "TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY",
            "name": "Сдан перевозчику в г.-транзите",
            "date_time": "2020-03-31T11:22:47+0700",
            "city": "Красноярск"
        }, {
            "code": "SENT_TO_RECIPIENT_CITY",
            "name": "Отправлен в г.-получатель",
            "date_time": "2020-03-31T13:40:08+0700",
            "city": "Красноярск"
        }, {
            "code": "ARRIVED_AT_RECIPIENT_CITY",
            "name": "Встречен в г.-получателе",
            "date_time": "2020-04-01T09:01:13+0700",
            "city": "Иркутск"
        }, {
            "code": "ACCEPTED_AT_RECIPIENT_CITY_WAREHOUSE",
            "name": "Принят на склад доставки",
            "date_time": "2020-04-01T11:12:55+0700",
            "city": "Иркутск"
        }],
        "delivery_date": "0002-11-28",
        "shop_seller_name": ""
    }
}
```

常见异常
获取订单信息时候经常出现的异常

| 异常编码 | 描述 |
| --- | --- |
| ERR_RESULT_SERVICE_EMPTY | 所选的服务无法使用提交的 寄件地址 - 收件地址 - 货物重量 / 。寄件国家不等于收件国家的话请检查所选的服务是否支持国际订单。提交的重量是否所选服务允许重量的范围中。所选的服务到库的话请检查目的地是否存在CDEK站点 |
| error_validate_good_payment_absent | 没填 代收付款金额 payment 参数，不需要使用代收付款服务的话需要把 payment 参数填为 0 |
| ve_package_weight_too_small | 没填包裹重量 weight 或者 包裹重量少于1克 |
| ve_as_empty_cost | 所提交的增值服务中没填费用 |
| error_validate_receiver_phone_number_incorrect | 收件人格式不正确，比如俄罗斯收件人电话格式为：79********* |
| error_validate_international_shipper_address_is_required | 没填承运商的信息 shipper |
| error_validate_international_seller_address_is_required | 没填卖家地址 seller |
| error_validate_international_date_invoice_is_required | 没填发票日期 date_invoice |
| error_validate_total_good_count_not_in_range | Общее количество товаров в заказе должно быть от 1 до 10,000 |
| error_validate_package_im_without_goods | 没填 items |

订单状态描述

| 状态码 | 名称 | 描述 |
| --- | --- | --- |
| ACCEPTED | 已接收 | 下单请求已经接收正在检查订单信息是否正确的 |
| CREATED | 已创建 | 订单信息检查完成并且成功生成运单号了 |
| REMOVED | 已删除 | 订单下单之后已经被删除了（还没有入仓的订单才能被删除） |
| RECEIVED_AT_SENDER_WAREHOUSE | 寄件城市已入仓 | 在寄件城市被CDEK已经办理入仓 |
| READY_FOR_SHIPMENT_IN_SENDER_CITY | 寄件城市已准备发货 | 订单已经集货完成并且准备完可以交给承运商 |
| RETURNED_TO_SENDER_CITY_WAREHOUSE | 已回到寄件城市 | 由于给承运商交货失败已办理回寄件城市站点仓库的入仓清单，请注意该状态不是退回给寄件方 |
| TAKEN_BY_TRANSPORTER_FROM_SENDER_CITY | 在寄件城市已交给承运商 | 在寄件城市已经办理完成交货给承运商 |
| SENT_TO_TRANSIT_CITY | 已发到中转城市 | 承运商指定了具体发货时间 |
| ACCEPTED_IN_TRANSIT_CITY | 中转城市已接货 | 中转城市注册了接货时间 |
| ACCEPTED_AT_TRANSIT_WAREHOUSE | 中转城市已入仓 | 中转城市仓库办理好了入仓清单 |
| RETURNED_TO_TRANSIT_WAREHOUSE | 已回到中转城市 | 已经回到中转城市了，（不意味着退回给寄件人，仅回到中转城市并且继续发往目的地） |
| READY_FOR_SHIPMENT_IN_TRANSIT_CITY | 在中转城市已准备发货 | 中转城市仓库办理好了出仓清单 |
| TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY | 在中转城市已交给承运商 | 中转城市已经办理好发货清单 |
| SENT_TO_RECIPIENT_CITY | 已发往收件方的城市 | 发货清单办理完，承运商开始往收件方城市发货 |
| ARRIVED_AT_RECIPIENT_CITY | 收件方的城市已接货 | 在收件方城市已注册接货清单 |
| ACCEPTED_AT_RECIPIENT_CITY_WAREHOUSE | 派送站点已入仓 | 在收件方城市办理完入仓清单，准备派送 |
| ACCEPTED_AT_PICK_UP_POINT | 在目的地站点等待领取 | 已经到了目的地站点在等待被收件人领取 |
| TAKEN_BY_COURIER | 派送途中 | 已经录入到具体派送单，派送员开始派送 |
| RETURNED_TO_RECIPIENT_CITY_WAREHOUSE | 已回到派送站点 | 派送尝试失败，需要重新派送 |
| DELIVERED | 签收 | 成功签收，妥投 |
| NOT_DELIVERED | 签收失败 | 无法签收，不再尝试派送 |
| INVALID | 订单无效-有错误 | 订单信息有错误 |

附加状态描述

| 代码 | 附加状态名称 | 服务已提供 / 1-是，0-没 | 对应的订单状态 |
| --- | --- | --- | --- |
| 1 | 退件, 地址不正确 | 0 | 签收失败 |
| 2 | 退件, 电话联系不上 | 0 | 签收失败 |
| 3 | 退件, 收件人不在地址 | 0 | 签收失败 |
| 12 | 退件, 拒绝收件, 商品质量有问题 | 0 | 签收失败 |
| 4 | 退件, 实际重量和申报重量相差.....公斤 | 0 | 签收失败 |
| 5 | 退件, 实际上没有货物 | 0 | 签收失败 |
| 6 | 退件, 在交接单里面的订单号码填入了两次 | 0 | 签收失败 |
| 7 | 退件, 无法派送到目的地 | 0 | 签收失败 |
| 8 | 退件, 在寄件人那儿的取件时发现破碎的包装 | 0 | 签收失败 |
| 9 | 退件, 拒绝收件, 在承运人包装破损 | 0 | 签收失败 |
| 10 | 退件, 拒绝收件, 在我们的仓库里包装破损 | 0 | 签收失败 |
| 11 | 退件, 拒绝收件, 无理由 | 1 | 签收失败 |
| 13 | 退件, 拒绝收件, 商品不足 | 1 | 签收失败 |
| 14 | 退件, 拒绝收件, 商品兑换 | 1 | 签收失败 |
| 15 | 退件, 拒绝收件, 对送货时间不满意 | 1 | 签收失败 |
| 16 | 退件, 拒绝收件, 已买到 | 1 | 签收失败 |
| 17 | 退件, 拒绝收件, 改变主意 | 1 | 签收失败 |
| 18 | 退件, 拒绝收件, 办理有错误 | 1 | 签收失败 |
| 19 | 退件, 拒绝收件, 在收件人包装破损 | 1 | 签收失败 |
| 20 | 部分签收 | 1 | 签收 |
| 21 | 退件, 拒绝收件, 没钱支付到付款 | 1 | 签收失败 |
| 22 | 退件, 拒绝收件, 货物不合适 | 1 | 签收失败 |
| 23 | 退件, 存货期已到期 | 0 | 签收失败 |
| 24 | 退件, 货没过海关 | 0 | 签收失败 |
| 25 | 退件, 商务货 | 0 | 签收失败 |
| 26 | 被丢失 | 0 | 签收失败 |
| 27 | 没人需要, 回收利用 | 0 | 签收失败 |

---

## 修改订单接口

URL: https://www.yuque.com/cdek/api2/order-update
Doc ID: 75904439
Updated: 2024-06-26T03:25:55.000Z

通过该接口可以修改存在的订单
更改订单的条件是 CDEK 仓库中没有货物移动（即订单状态为“已创建”）

**请求方式 Update-request**

请求内容格式为 JSON (Content-Type: application/json) .
需要使用PATCH-请求，请求URL:

| 测试环境 | ​https://api.edu.cdek.ru/v2/orders |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/orders |

请求内容
内容包含的属性以下:

|  | 属性名称 | 描述 | 类型 | 必填 |  |
| --- | --- | --- | --- | --- | --- |
| 1 | uuid​ | CDEK订单识别码 | UUID | 是, 如果CDEK number 没有填写 |  |
| 2 | cdek_number | CDEK运单号 | long | 是, 如果uuid 没有填写 |  |
| 3 | tariff_code | 服务代码 - 快递产品代码 (查看服务列表 / ) | integer | 是 |  |
| 4 | comment | 订单备注 | string() | 否 |  |
| 5 | shipment_point1 | 寄件站点代码 / 不能与 from_location 同时使用 | string() | 否 |  |
| 6 | delivery_point1 | 收件站点代码 / 不能与to_location 同时使用 | string() | 否 |  |
| 7 | delivery_recipient_cost | 运输附加费 - 电商可添加让买家多付运费 / 货币必须设置为与货到付款货币相匹配 | money | 否 |  |
| 7.1 | value | 运输附加费 - 金额 | float | 是 |  |
| 7.2 | vat_sum | 运输附加费 - 税额 | float | 否 |  |
| 7.3 | vat_rate | 运输附加费 - 税率（百分之几） /  (可选 0，10，18，20, null - 不收税) | integer | 否 |  |
| 8 | delivery_recipient_cost_adv | 根据货件申报价值的运输附加费用 / 该属性仅 "电商" 类型订单可以使用的 | threshold[] | 否 |  |
| 8.1 | threshold | 货件申报价值少于等于 | integer | 是 |  |
| 8.2 | sum | 根据货件申报价值 - 附加费用金额 | float | 是 |  |
| 8.3 | vat_sum | 根据货件申报价值- 税额 | float | 否 |  |
| 8.4 | vat_rate | 根据货件申报价值 税率  / (可选 0，10，18，20, null - 不收税) | integer | 否 |  |
| 9 | sender | 寄件方 | contact | 否 |  |
| 9.1 | company | 公司名称 | string(255) | 否 |  |
| 9.2 | name | 姓名 | string(255) | 否 |  |
| 9.3 | email | 电子邮箱地址  (应该符合RFC 2822） | string(255) | 否 / ​ |  |
| 9.4 | passport_series | 护照序列 | string(4) | 否 |  |
| 9.5 | passport_number | 护照号码 | string(20) | 否 |  |
| 9.6 | passport_date_of_issue | 护照签发日期 | date (yyyy-MM-dd) | 否 |  |
| 9.7 | passport_organization | 护照签发机关 | string(255) | 否 |  |
| 9.8 | tin | 个人税号 / 包含 10 或 12 个字符 | string(12) | 否 |  |
| 9.9 | passport_date_of_birth | 生日 | date (yyyy-MM-dd) | 否 |  |
| 9.10 | phones | 电话号码列表 (不超10个） | phone[] | 否 |  |
| 9.10.1 | number​ | 电话号码，国际格式 比如 +79094768888 / ​ | string(255) | 是 |  |
| 9.10.2 | additional | 分机号码 | string(255) | 否 |  |
| 10 | seller | 实际卖家 | seller | 否 |  |
| 10.1 | name | 卖家名称 | string(255) | 否 |  |
| 10.2 | inn | 卖家税号 | string(12) | 否 |  |
| 10.3 | phone | 卖家电话号码 | string(255) | 否 |  |
| 10.4 | ownership_form | 卖家所有制形式 | integer | 否 |  |
| 11 | recipient | 收件方 | contact | 否 |  |
| 11.1 | company | 公司名称 | string(255) | 否 |  |
| 11.2 | name | 姓名 | string(255) | 否 |  |
| 11.3 | passport_series | 护照序列 | string(4) | 否 |  |
| 11.4 | passport_number | 护照号码 | string(30) | 否 |  |
| 11.5 | passport_date_of_issue | 护照签发日期 | date (yyyy-MM-dd) | 否 |  |
| 11.6 | passport_organization | 护照签发机关 | string(255) | 否 |  |
| 11.7 | tin | 个人税号 / 包含 10 或 12 个字符 | string(12) | 否 |  |
| 11.8 | passport_date_of_birth | 生日 | date (yyyy-MM-dd) | 否 |  |
| 11.9 | email | 电子邮箱 / (应该符合RFC 2822） | string(255) | 否 |  |
| 11.10 | phones | 电话号码列表 (不超10个） | phone[] | 否 |  |
| 11.10.1 | number | 电话号码，国际格式 比如 +79094768888 | string(255) | 是 |  |
| 11.10.2 | additional | 分机号码 | string(255) | 否 |  |
| 12 | to_location2 | 收件地址 / 无法跟delivery_point同时使用 | location | 否 |  |
| 12.1 | code | 地点代码 (根据CDEK数据库) | integer | 否 |  |
| 12.2 | fias_guid | 俄罗斯海关局-新版地址数据库(FIAS)的地址代码 | UUID | 否 |  |
| 12.3 | postal_code | 邮编 | string(255) | 否 |  |
| 12.4 | longitude | 经度 | float | 否 |  |
| 12.5 | latitude | 纬度 | float | 否 |  |
| 12.6 | country_code | 国家编码 ISO_3166-1_alpha-2 格式的 | string(2) | 否 |  |
| 12.7 | region | 州省名称 | string(255) | 否 |  |
| 12.8 | region_code | 州省代码 (根据CDEK数据库) | integer | 否 |  |
| 12.9 | sub_region | 县/区 | string(255) | 否 |  |
| 12.10 | city | 城市名称 | string(255) | 否 |  |
| 12.11 | kladr_code | 俄罗斯海关局-旧版地址数据库的地址代码 | string(255) | 否 |  |
| 12.12 | address | 地址 | string(255) | 是 |  |
| 13 | from_location | 寄件地址 / 无法跟shipment_pointt同时使用 | location | 否 |  |
| 13.1 | address | 地址 | string(255) | 是 |  |
| 14 | services2 | 增值服务列表 | service[] | 否 |  |
| 14.1 | code | 增值服务代码 （查看增值服务列表） | integer | 是 |  |
| 14.2 | parameter | 增值服务的参数: / “Packing 1”、“Courier package A2”、“Safe package A2”、“Safe package A3”、“Safe package A4”、“Safe package A5”服务的包裹数量（适用于所有订单类型） / 服务“保险”的订单声明价值（仅适用于“普通”类型的订单） / “气泡膜”、“再生纸”服务的长度 / “订单送达通知”服务的电话号码 | integer | 否 |  |
| 15 | packages2 | 包装件列表 / 没有提交的包装就被删除 / 订单中的位置数 -  1 到255。 | package[] | 否 |  |
| 15.1 | package_id | CDEK的包装件序号 | string | 否，如果你提交新的包装（有新的number) |  |
| 15.2 | number | 包装件序号 (您可以使用订单包装的序列号或订单号), 订单号之内应该是独特的. 客户的订单 ID | string(20) | 是 |  |
| 15.3 | weight | 包装件总重量 （克数）​ | integer | 是 |  |
| 15.4 | length | 长度 cm | integer | 要么都填 - / 要么都不填 |  |
| 15.5 | width | 宽度 cm | integer | 要么都填 - / 要么都不填 |  |
| 15.6 | height | 高度 cm | integer | 要么都填 - / 要么都不填 |  |
| 15.7 | comment | 包装件的备注 / 为了普通订单使用 | string(255) | 否 |  |
| 15.8 | items | 内件列表（产品列表） / 该属性仅 "电商" 类型订单可以使用的 / 一个订单中不超过 126 个唯一行 / 订单中的商品总数  -  1 到 10000 | item[] | 是 |  |
| 15.8.1 | name | 货品名称 | string(255) | 是 |  |
| 15.8.2 | ware_key | 产品SKU 或其他产品唯一识别码（不能包含汉字） / 能包含: [A-z А-я 0-9 ! @ " # № $ ; % ^ : & ? * () _ - + = ?  , .{ } [ ] \ / , 空格] | string(50) | 是 |  |
| 15.8.3 | marking | 产品唯一的编号（填该属性的话 数量amout必须等于1），俄罗斯产品标记法（第487-ФЗ号） / 为了正确显示收据中的货物标记，需要转移 / 未组装类型的标记，可能如下所示： / 1) 产品代码， GS1格式的 / 比如: 010468008549838921AAA0005255832GS91EE06GS92VTwGVc7wKCc2tqRncUZ1RU5LeUKSXjWbfNQOpQjKK+A / 2) 总长度为 29 个字符的有效字符序列。 / 比如: 00000046198488X?io+qCABm8wAYa / 3) 毛皮制品有其他的格式​ / 比如: RU-430302-AAA7582720 | string() | 否 |  |
| 15.8.4 | payment | 单件的代收货款， 收件国家的币种 | money | 是 |  |
| 15.8.4.1 | value | 运输附加费 - 金额（预付款情况下=0） | float | 是 |  |
| 15.8.4.2 | vat_sum | 运输附加费 - 税额 | float | 否 |  |
| 15.8.4.3 | vat_rate | 运输附加费 - 税率（百分之几） / (可选 0，10，18，20, null - 不收税) | integer | 否 |  |
| 15.8.5 | cost | 单件申报价值 （单件，用合同的货币, 用于计算保险费） | float | 是 |  |
| 15.8.6 | weight | 单件重量（单位：克） | integer | 是 |  |
| 15.8.7 | weight_gross | 产品单件毛重 | integer | 是，如果订单号是国际的 |  |
| 15.8.8 | amount | 产品数量 (个) / 一样的件商品的数量可以从 1 到 999 | integer | 是 |  |
| 15.8.9 | name_i18n | 外文名称 | string(255) | 否 |  |
| 15.8.10 | brand | 商标名称（英文） | string(255) | 否 |  |
| 15.8.11 | country_code | 产品制造国家编码  ISO_3166-1_alpha-2 格式的 | string(2) | 否 |  |
| 15.8.12 | material | 材质编码 | string(255) | 否 |  |
| 15.8.13 | wifi_gsm | 包含 wifi/gsm | boolean | 否 |  |
| 15.8.14 | url | 稍稍平台具体产品链接 | string(255) | 否 |  |

1 订单由指定字段标识（优先级 uuid）。
2 在指定字段中传输新值时，可以重新计算订单的成本。
​

申请返回的数据
内容格式为 JSON

| ​ | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | entity | 订单信息 | entity | 否 |
| 1.1 | uuid | 被修改的CDEK订单识别码 | UUID | 否 |
| 2 | requests | 订单对应的请求列表 | request[] | 是 |
| 2.1 | request_uuid | CDEK数据库的请求ID | UUID | 否 |
| 2.2 | type | 请求类型，所可能的类型：CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 状态日期 (格式为：yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 目前的状态所可能的状态: / ACCEPTED - 预验证通过并请求接受 / WAITING - 请求待处理（取决于另一个请求的执行） / SUCCESSFUL -  成功 / INVALID - 无效-有错误 | string() | 是 |
| 2.5 | errors | 进行请求中发生的错误 | error[] | 否 |
| 2.5.1 | code | 错误编码 | string() | 是 |
| 2.5.2 | message | 错误描述 | string() | 是 |
| 2.6 | warnings | 错误描述 | warning[] | 否 |
| 2.6.1 | code | 警告编码 | string() | 是 |
| 2.6.2 | message | 警告描述 | string() | 是 |

| 请求内容的列子 |
| --- |
| { /    "uuid":"72753031-5427-4d1b-b1e4-7c4c26be00a0", /    "cdek_number":"1105660806", /    "tariff_code":"10", /    "sender":{ /       "company":"Pogoda", /       "name":"Петров Петр", /       "email":"react@cdek.ru", /       "phones":[ /          { /             "number":"+79134637228", /             "additional":"1234" /          } /       ] /    }, /    "recipient":{ /       "company":"NUMM", /       "name":"Константинов Константин", /       "email":"pochta@gmail.com", /       "phones":[ /          { /             "number":"+79134635628", /             "additional":"123" /          } /       ] /    }, /    "to_location":{ /       "code":"137" /    }, /    "from_location":{ /       "address":"Новосибирск, Большевистская 101" /    }, /    "services":[ /       { /          "code":"DANGER_CARGO" /       }, /       { /          "code":"PACKAGE_1", /          "parameter":"1" /       } /    ], /    "packages":[ /       { /          "number":"bar-666", /          "height":20, /          "length":20, /          "weight":4000, /          "width":20, /          "items":[ /             { /                "name":"Товар", /                "ware_key":"00055", /                "payment":{ /                   "value":3000 /                }, /                "cost":300, /                "amount":1, /                "weight":700 /             } /          ] /       } /    ] / } |

| 返回的数据例子 |
| --- |
| { /   "entity": { /     "uuid": "72753031-5427-4d1b-b1e4-7c4c26be00a0" /   }, /   "requests": [ /     { /       "request_uuid": "72753031-35cc-4ef6-a353-25a09d3a973a", /       "type": "UPDATE", /       "state": "ACCEPTED", /       "date_time": "2020-01-23T11:48:40Z", /       "errors": [], /       "warnings": [ /         { /           "code": "v2_cost_change_by_tariff", /           "message": "New tariff code can trigger change order cost" /         }, /         { /           "code": "v2_cost_change_by_services", /           "message": "New services can trigger change order cost" /         }, /         { /           "code": "v2_cost_change_by_parameters", /           "message": "New parameters (weight, dimensions, items cost) can trigger change order cost" /         } /       ] /     } /   ] / } |

---

## 取消订单

URL: https://www.yuque.com/cdek/api2/order-request-cancel
Doc ID: 5652188
Updated: 2024-06-26T03:26:15.000Z

仅“已办理”状态的订单可以删除，已经入仓过的订单无法通过该接口取消。

请求内容格式为 JSON (Content-Type: application/json) 字符编码 UTF-8.

为了取消订单需要发送 DELETE-请求， 请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/orders/ / {uuid} |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/orders/ / {uuid} |

返回的内容
返回的内容为 JSON 格式:
​

| 序号 | 属性 | 名称 | 属性类型 | 必填的 |
| --- | --- | --- | --- | --- |
| 1 | entity | 订单信息 | entity | 否 |
| 1.1 | uuid | CDEK订单识别码 | UUID | 否 |
| 2 | requests | 订单对应的请求列表 | request[] | 是 |
| 2.1 | request_uuid | 请求识别码（uuid） | UUID | 否 |
| 2.2 | type | 请求类型，所可能的类型：CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 状态日期 (格式为：yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 目前的状态 / 所可能的状态: ACCEPTED, WAITING, SUCCESSFUL, INVALID | string() | 是 |
| 2.5 | errors | 进行请求中发生的错误列表 | error[] | 否 |
| 2.5.1 | code | 错误编码 | string() | 是 |
| 2.5.2 | message | 错误描述 | string() | 是 |
| 2.6 | warnings | 警告列表 | warning[] | 否 |
| 2.6.1 | code | 警告编码 | string() | 是 |
| 2.6.2 | message | 警告描述 | string() | 是 |

请求例子：

```python
# encoding: utf-8
import requests
import urllib.parse
import sys

entity_uuid = '72753033-db0e-4042-9392-c5a077e24669'
access_token = "....." #- 访问令牌

url = f'https://api.cdek.ru/v2/orders/{entity_uuid}'
headers = {'Authorization': 'Bearer '+access_token, 'Content-type': 'application/json'}
responce = requests.delete(url, headers=headers)
print(responce) #
print(responce.text)
```

返回的数据

```json
{
    "entity": {
        "uuid": "72753033-db0e-4042-9392-c5a077e24669"
    },
    "requests": [{
        "request_uuid": "72753033-fafa-46a5-81a4-c7dab856a408",
        "type": "DELETE",
        "date_time": "2020-03-27T17:26:10+0700",
        "state": "ACCEPTED"
    }]
}
```

申请删除之后可以获取订单状态：

```python
responce = requests.get(f'https://api.cdek.ru/v2/orders/{entity_uuid}', headers=headers)
print(responce.text)
print(responce)
```

```json
{
    "entity": {
        "uuid": "72753033-35da-44aa-8eb0-005f09dec68a",
        "type": 1,
        "is_return": false,
        "cdek_number": "1169343879",
        "number": "TEST7-CT789435359CN",
        "tariff_code": 246,
        "comment": "",
        "date_invoice": "2020-03-26",
        "shipper_name": "CDEK",
        "shipper_address": "Novosibirsk",
        "delivery_recipient_cost": {
            "value": 0
        },
        "sender": {
            "name": "Zhang san"
        },
        "seller": {
            "name": "Zhang san",
            "address": "Shanghai, Changning District"
        },
        "recipient": {
            "name": "Ivanov Sergei Petrovich",
            "phones": [{
                "number": "9990003456"
            }, {
                "number": "9990001234"
            }]
        },
        "from_location": {
            "code": "12683",
            "postal_code": "200050",
            "longitude": 121.470462,
            "latitude": 31.230863,
            "country_code": "CN",
            "region": "Шанхай",
            "region_code": "906",
            "sub_region": "",
            "city": "Шанхай",
            "address": "",
            "country": "Китай (КНР)"
        },
        "to_location": {
            "code": "430",
            "fias_guid": "bb035cc3-1dc2-4627-9d25-a1bf2d4b936b",
            "postal_code": "443034",
            "longitude": 50.1018,
            "latitude": 53.1955,
            "country_code": "RU",
            "region": "Самарская",
            "region_code": "57",
            "sub_region": "Самара",
            "city": "Самара",
            "kladr_code": "6300000100000",
            "address": "Lenina ulitsa, 35 28;Samara;Samarskaya oblast",
            "country": "Россия"
        },
        "packages": [{
            "number": "TEST7-CT789435359CN",
            "weight": 120,
            "length": 0,
            "width": 0,
            "height": 0,
            "comment": "приложена опись",
            "items": [{
                "name": "Measuring tools",
                "ware_key": "WELRV0086000627YQ",
                "payment": {
                    "value": 0
                },
                "weight": 120,
                "weight_gross": 120,
                "amount": 1,
                "url": "",
                "cost": 0
            }, {
                "name": "Measuring tools",
                "ware_key": "WELRV0086000627YQ",
                "payment": {
                    "value": 0.0,
                    "vat_sum": 0.0
                },
                "weight": 120,
                "weight_gross": 120,
                "amount": 1,
                "cost": 0.0
            }]
        }],
        "statuses": [{
            "code": "ACCEPTED",
            "name": "Принят",
            "date_time": "2020-03-27T17:34:42+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "CREATED",
            "name": "Создан",
            "date_time": "2020-03-27T17:34:43+0700",
            "city": "Офис СДЭК"
        }, {
            "code": "CREATED",
            "name": "Создан",
            "date_time": "2020-03-27T17:34:44+0700",
            "city": "Шанхай"
        }, {
            "code": "REMOVED",
            "name": "Удален",
            "date_time": "2020-03-27T17:38:46+0700",
            "city": "Офис СДЭК"
        }],
        "shop_seller_name": "Zhang san",
        "shop_seller_address": "Shanghai, Changning District"
    },
    "requests": [{
        "request_uuid": "72753033-6f26-4cbc-9daf-7d44f04e50f9",
        "type": "CREATE",
        "date_time": "2020-03-27T17:34:43+0700",
        "state": "SUCCESSFUL" //CREATE SUCCESSFUL 成功下单了
    }, {
        "request_uuid": "72753033-d0aa-4c65-a20e-ebe3970ba368",
        "type": "DELETE",
        "date_time": "2020-03-27T17:38:47+0700",
        "state": "SUCCESSFUL" //type DELETE SUCCESSFUL订单已经成功被删除了
    }]
}
```

---

## 取件申请

URL: https://www.yuque.com/cdek/api2/aql1bkxggnt0mpvg
Doc ID: 232293640
Updated: 2025-09-03T10:03:14.000Z

```

```

---

## 获取快递员上门取件可用日期（针对货到付款）

URL: https://www.yuque.com/cdek/api2/tgfb0hy8qh1gm8vx
Doc ID: 232302936
Updated: 2025-08-24T03:18:17.000Z

此方法可让您获取快递员从在线商店仓库取货的日期，该日期为仓库所在地区。
鉴权方式 bearerAuth
POST  -请求，请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/intakes/availableDays |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/intakes/availableDays |

必填字段如下（application/json）：
from_location（必填）：取件的城市/地区信息
date（选填）：获取可用日期的截止时间（默认是今天 + 14 天）

|  | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | from_location | Адрес отправления | location | 是 |
| 1.1 | code | 城市的CDEK代码 | integer | 否 |
| 1.2 | fias_guid | FIAS 的唯一标识符 | UUID | 否 |
| 1.3 | postal_code | 邮编 | string(255) | 否 |
| 1.4 | longitude | 经度 | float | 否 |
| 1.5 | latitude | 纬度 | float | 否 |
| 1.6 | country_code | ISO_3166-1_alpha-2 格式的国家代码（默认 RU） | string(2) | 否 |
| 1.7 | region | 地区名称 | string(255) | 否 |
| 1.8 | region_code | CDEK 区域代码 | integer | 否 |
| 1.9 | sub_region | 地区 区名 | string(255) | 否 |
| 1.10 | city | 城市 | string(255) | 否 |
| 1.11 | address | 地址线 | string(255) | 是，如果没有 code |
| 2 | date | 截至哪一天（含）可获得可用天数（默认为今天加两周） | date |  |

成功响应（200 OK）：
date：可用日期列表（数组）
all_days：是否每天都能取件（true = 每天都能取，false = 不是每天都能取）
errors：错误信息（如果有的话）
warnings：警告信息（如果有的话）

失败响应（400 Bad Request）：
errors：错误信息
warnings：警告信息

请求例子：

```plain
{
  "from_location": {
    "code": 0,
    "city": "string",
    "fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
    "country_code": "st",
    "region": "string",
    "region_code": 0,
    "sub_region": "string",
    "longitude": 0.1,
    "latitude": 0.1,
    "postal_code": "string",
    "address": "string"
  },
  "date": "2019-08-24"
}
```

返回的数据:

```plain
{
"date": [
"2019-08-24"
],
"all_days": true,
"errors": [
{
"code": "string",
"additional_code": "string",
"message": "string"
}
],
"warnings": [
{
"code": "string",
"message": "string"
}
]
}
```

---

## 注册快递员上门取件申请

URL: https://www.yuque.com/cdek/api2/tzaklkr6vw4rn0xm
Doc ID: 232286802
Updated: 2025-08-14T12:14:06.000Z

该接口用于呼叫快递员从电商仓库上门取货，并送至 CDEK 仓库。
建议：上门时间区间最少为 3 小时。

在请求体中需传递寄件人地址、联系人、取件日期和时间区间、寄件包裹数量及其属性等信息。
接口返回值包括申请唯一标识符及当前请求状态*。

* 该接口为异步处理。响应中的 "ACCEPTED" 状态不代表申请已在 CDEK 系统中创建，只表示请求已被成功接收，并通过了初步校验且结构正确。之后系统会继续进行其余校验，可通过“获取申请信息”接口查询最终结果。
"SUCCESSFUL" 表示实体已在系统中成功创建；"INVALID" 表示创建时出现错误，需修正后重新调用此接口。
请求内容格式为 JSON (Content-Type: application/json)
POST-请求，请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/intakes |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/intakes |

必填字段如下：

|  | 属性名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | cdek_number | CDEK 订单号 | string |
| 2 | order_uuid | CDEK 系统中的订单唯一标识 | string  |
| 3 | intake_date (必填) | 期望快递员上门取件日期，不能晚于当前日期 			31 天。若申请在寄件人当地时间 			15:00 后创建，可能安排到次日执行。 | string  |
| 4 | intake_time_from (必填) | 开始等待快递员的时间，不早于当地 			9:00。示例: 09:00 | string HH:mm |
| 5 | intake_time_to (必填) | 结束等待快递员的时间，不晚于当地 			22:00。示例: 18:00 | string HH:mm |
| 6 | lunch_time_from | 午休开始时间，必须在等待时间区间内。示例: 			14:00 | string HH:mm |
| 7 | lunch_time_to | 午休结束时间，必须在等待时间区间内。示例: 			15:00 | string HH:mm |
| 8 | name | 货物描述。若未传订单号，则必填；否则取自订单信息。 | string ≤255 |
| 9 | weight | 包裹总重量（克）。若未传订单号，则必填；否则取自订单信息。 | integer  |
| 10 | length | 包装尺寸-长（厘米）。若未传订单号，则必填；否则取自订单信息。 | integer  |
| 11 | width | 包装尺寸-宽（厘米）。若未传订单号，则必填；否则取自订单信息。 | integer  |
| 12 | height | 包装尺寸-高（厘米）。若未传订单号，则必填；否则取自订单信息 | integer  |
| 13 | comment | 给快递员的备注信息 | string ≤255 |
| 14 | courier_power_of_attorney | 是否需要快递员携带委托书（默认 false） | boolean |
| 15 | courier_identity_card | 是否需要快递员携带身份证件（默认 	false） | boolean |
| 16 | sender | 发件人信息（CDEK 内部结构，需参考 ContactDto 定义） | object (ContactDto) |
| 17 | from_location | 发件所在地（CDEK 内部结构，需参考 			IntakeLocationDto 定义）。 | object (IntakeLocationDto) |
| 18 | need_call | 是否需要快递员提前电话联系（默认 	false）。 | boolean |

响应状态码
202 Accepted — 请求已接收，异步处理。

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| ​entity | object (RootEntityDto) | ​当前请求所操作的实体信息 |
| ​requests必填 | array of objects / (RequestDto1) | 与该实体相关的请求信息 |
| related_entities | array of objects / (RelatedEntityDto) | 关联的实体信息 |

400 Bad Request — 请求参数错误。
​

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| errors | array of objects (ErrorDto1) | 错误列表 |
| ​warnings | array of objects (WarningDto) | 警告列表 |

请求例子：

```plain
{
"cdek_number": "string",
"order_uuid": "e56795c7-0bc3-4742-a52f-988d2af8608f",
"intake_date": "2019-08-24",
"intake_time_from": "09:00",
"intake_time_to": "18:00",
"lunch_time_from": "14:00",
"lunch_time_to": "15:00",
"name": "string",
"weight": 0,
"length": 0,
"width": 0,
"height": 0,
"comment": "string",
"courier_power_of_attorney": true,
"courier_identity_card": true,
"sender": {
"company": "string",
"name": "string",
"contragent_type": "LEGAL_ENTITY",
"passport_series": "string",
"passport_number": "string",
"passport_date_of_issue": "2019-08-24",
"passport_organization": "string",
"tin": "string",
"passport_date_of_birth": "2019-08-24",
"email": "string",
"phones": [
{
"number": "string",
"additional": "string"
}
]
},
"from_location": {
"code": 0,
"city_uuid": "061925d2-e3ae-4fc4-b824-0a1be89f77be",
"city": "string",
"fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
"kladr_code": "string",
"country_code": "st",
"country": "string",
"region": "string",
"region_code": 0,
"fias_region_guid": "88d7b0d4-3671-4e5a-bafc-b9556aa1b2e8",
"kladr_region_code": "string",
"sub_region": "string",
"longitude": 0.1,
"latitude": 0.1,
"address": "string",
"postal_code": "string"
},
"need_call": true
}
```

 返回的数据

```plain
{
  "cdek_number": "string",
  "order_uuid": "e56795c7-0bc3-4742-a52f-988d2af8608f",
  "intake_date": "2019-08-24",
  "intake_time_from": "09:00",
  "intake_time_to": "18:00",
  "lunch_time_from": "14:00",
  "lunch_time_to": "15:00",
  "name": "string",
  "weight": 0,
  "length": 0,
  "width": 0,
  "height": 0,
  "comment": "string",
  "courier_power_of_attorney": true,
  "courier_identity_card": true,
  "sender": {
    "company": "string",
    "name": "string",
    "contragent_type": "LEGAL_ENTITY",
    "passport_series": "string",
    "passport_number": "string",
    "passport_date_of_issue": "2019-08-24",
    "passport_organization": "string",
    "tin": "string",
    "passport_date_of_birth": "2019-08-24",
    "email": "string",
    "phones": [
      {
        "number": "string",
        "additional": "string"
      }
    ]
  },
  "from_location": {
    "code": 0,
    "city_uuid": "061925d2-e3ae-4fc4-b824-0a1be89f77be",
    "city": "string",
    "fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
    "kladr_code": "string",
    "country_code": "st",
    "country": "string",
    "region": "string",
    "region_code": 0,
    "fias_region_guid": "88d7b0d4-3671-4e5a-bafc-b9556aa1b2e8",
    "kladr_region_code": "string",
    "sub_region": "string",
    "longitude": 0.1,
    "latitude": 0.1,
    "address": "string",
    "postal_code": "string"
  },
  "need_call": true
}
```

---

## 获取申请信息（通过 UUID）

URL: https://www.yuque.com/cdek/api2/xleu2p9amyybzfvc
Doc ID: 232293091
Updated: 2025-08-14T12:17:17.000Z

GET  -请求，请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/intakes/{uuid} |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/intakes/{uuid} |

该接口用于根据申请的 UUID 获取详细信息。

鉴权方式 bearerAuth
路径参数

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| uuid (必填) | UUID | СDEK 系统中申请的唯一标识 |

 返回的数据
200 OK — 请求成功，返回申请信息。
400 Bad Request — 请求参数错误。
​

```plain
{
  "entity": {
    "uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f",
    "cdek_number": "string",
    "order_uuid": "e56795c7-0bc3-4742-a52f-988d2af8608f",
    "intake_date": "2019-08-24",
    "intake_number": "string",
    "intake_time_from": "09:00",
    "intake_time_to": "18:00",
    "lunch_time_from": "14:00",
    "lunch_time_to": "15:00",
    "name": "string",
    "weight": 0,
    "length": 0,
    "width": 0,
    "height": 0,
    "comment": "string",
    "courier_power_of_attorney": true,
    "courier_identity_card": true,
    "sender": {
      "company": "string",
      "name": "string",
      "contragent_type": "LEGAL_ENTITY",
      "passport_series": "string",
      "passport_number": "string",
      "passport_date_of_issue": "2019-08-24",
      "passport_organization": "string",
      "tin": "string",
      "passport_date_of_birth": "2019-08-24",
      "email": "string",
      "phones": [
        {
          "number": "string",
          "additional": "string"
        }
      ],
      "passport_requirements_satisfied": true
    },
    "from_location": {
      "code": 0,
      "city_uuid": "061925d2-e3ae-4fc4-b824-0a1be89f77be",
      "city": "string",
      "fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
      "kladr_code": "string",
      "country_code": "st",
      "country": "string",
      "region": "string",
      "region_code": 0,
      "fias_region_guid": "88d7b0d4-3671-4e5a-bafc-b9556aa1b2e8",
      "kladr_region_code": "string",
      "sub_region": "string",
      "longitude": 0.1,
      "latitude": 0.1,
      "address": "string",
      "postal_code": "string"
    },
    "to_location": {
      "code": 0,
      "city_uuid": "061925d2-e3ae-4fc4-b824-0a1be89f77be",
      "city": "string",
      "fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
      "kladr_code": "string",
      "country_code": "st",
      "country": "string",
      "region": "string",
      "region_code": 0,
      "fias_region_guid": "88d7b0d4-3671-4e5a-bafc-b9556aa1b2e8",
      "kladr_region_code": "string",
      "sub_region": "string",
      "longitude": 0.1,
      "latitude": 0.1,
      "address": "string",
      "postal_code": "string"
    },
    "need_call": true,
    "statuses": [
      {
        "code": "string",
        "name": "string",
        "date_time": "2019-08-24T14:15:22Z"
      }
    ],
    "packages": [
      {
        "package_id": "82585450-66a8-4ff2-8a7e-8e7bec960ae1",
        "weight": 0,
        "length": 0,
        "width": 0,
        "height": 0
      }
    ],
    "contragent_uuid": "1b54f24c-1736-4b65-82bc-dab523f99ce5"
  },
  "requests": [
    {
      "request_uuid": "a699086b-c336-457e-9191-0c825d6efbc8",
      "type": "string",
      "date_time": "2019-08-24T14:15:22Z",
      "state": "string",
      "errors": [
        {
          "code": "string",
          "additional_code": "string",
          "message": "string"
        }
      ],
      "warnings": [
        {
          "code": "string",
          "message": "string"
        }
      ]
    }
  ]
}
```

---

## 修改取件申请的状态

URL: https://www.yuque.com/cdek/api2/ex38lg91drsygye9
Doc ID: 232402868
Updated: 2025-08-14T11:43:49.000Z

PATCH-请求，请求URL:

| ​测试环境 | https://api.edu.cdek.ru/v2/intakes |
| --- | --- |
| ​正式环境 | https://api.cdek.ru/v2/intakes |

这个接口是用来把已经存在的取件申请状态改为“需要处理”。
如果这个申请需要额外的操作（比如打电话确认、提供文件等），可以加上这些额外状态。
能改成“需要处理”的申请状态必须是：需要处理 / 已准备分配 / 已分配快递员。
认证方式：
bearerAuth（HTTP Bearer Token, 格式是 JWT）

必填字段如下（application/json）：
uuid（必填）：取件申请的唯一 ID（在 CDEK 系统里）
status（必填）：新的申请状态

|  | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | uuid | 取件申请的唯一 ID（在 CDEK 系统里） | UUID | 是 |
| 2 | status | 新的申请状态 | status | 是 |
| 2.1 | code | 状态的代码: / PROCESSING_REQUIRED - 需要处理. | string() | 是 |
| 2.2 | add_status | 补充的状态代码可以取值: / CALL_REQUIRED - 需要致电; / DOC_REQUIRED - 需要客户的文件. | string() | 是 |

成功响应（200 OK）：
​

|  | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | uuid | 取件申请的唯一 ID（在 CDEK 系统里） | UUID | 是 |
| 2 | status | 新的申请状态 | status | 是 |
| 2.1 | code | 状态的代码: / PROCESSING_REQUIRED - 需要处理. | string() | 是 |
| 2.2 | add_status | 补充的状态代码 / 可以取值: / CALL_REQUIRED - 需要致电; / DOC_REQUIRED - 需要客户的文件. | string() | 是 |

400 Bad Request

|  | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | entity | 申请信息 | entity | 是 |
| 1.1 | uuid | Идентификатор заявки в ИС СДЭК | UUID | 否 |
| 2 | requests | Информация о запросе над заявкой | request[] | 是 |
| 2.1 | request_uuid | Идентификатор запроса в ИС СДЭК | UUID | 否 |
| 2.2 | type | 请求的类型 / 可以取值: CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 设置当前请求状态的日期和时间（格式yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 请求的当前状态 / 可以接受值: / ACCEPTED - 预验证已通过，请求已接受 / WAITING - 请求正在等待处理（取决于另一个请求是否完成） / SUCCESSFUL - 成功 / INVALID - 请求处理时出现错误 | string() | 是 |
| 2.5 | errors | 错误信息 | error[] | 否 |
| 2.5.1 | code | 错误代码 | string() | 是 |
| 2.5.2 | message | 错误的描述 | string() | 是 |
| 2.6 | warnings | 查询执行期间发生的警告 | warning[] | 否 |
| 2.6.1 | code | 警告的代码 | string() | 是 |
| 2.6.2 | message | 警告的描述 | string() | 是 |

​

​

请求例子：

```plain
{
  "entity": {
    "uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f"
  },
  "requests": [
    {
      "request_uuid": "a699086b-c336-457e-9191-0c825d6efbc8",
      "type": "string",
      "date_time": "2019-08-24T14:15:22Z",
      "state": "string",
      "errors": [
        {
          "code": "string",
          "additional_code": "string",
          "message": "string"
        }
      ],
      "warnings": [
        {
          "code": "string",
          "message": "string"
        }
      ]
    }
  ],
  "related_entities": [
    {
      "uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f",
      "type": "return_order",
      "url": "string",
      "create_time": "2019-08-24T14:15:22Z",
      "cdek_number": "string",
      "date": "2019-08-24",
      "time_from": "15:00",
      "time_to": "15:00"
    }
  ]
}

```

返回的数据: 200 OK

```plain
{
"entity": {
"uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f",
"cdek_number": "string",
"order_uuid": "e56795c7-0bc3-4742-a52f-988d2af8608f",
"intake_date": "2019-08-24",
"intake_number": "string",
"intake_time_from": "09:00",
"intake_time_to": "18:00",
"lunch_time_from": "14:00",
"lunch_time_to": "15:00",
"name": "string",
"weight": 0,
"length": 0,
"width": 0,
"height": 0,
"comment": "string",
"courier_power_of_attorney": true,
"courier_identity_card": true,
"sender": {
"company": "string",
"name": "string",
"contragent_type": "LEGAL_ENTITY",
"passport_series": "string",
"passport_number": "string",
"passport_date_of_issue": "2019-08-24",
"passport_organization": "string",
"tin": "string",
"passport_date_of_birth": "2019-08-24",
"email": "string",
"phones": [
{
"number": "string",
"additional": "string"
}
],
"passport_requirements_satisfied": true
},
"from_location": {
"code": 0,
"city_uuid": "061925d2-e3ae-4fc4-b824-0a1be89f77be",
"city": "string",
"fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
"kladr_code": "string",
"country_code": "st",
"country": "string",
"region": "string",
"region_code": 0,
"fias_region_guid": "88d7b0d4-3671-4e5a-bafc-b9556aa1b2e8",
"kladr_region_code": "string",
"sub_region": "string",
"longitude": 0.1,
"latitude": 0.1,
"address": "string",
"postal_code": "string"
},
"to_location": {
"code": 0,
"city_uuid": "061925d2-e3ae-4fc4-b824-0a1be89f77be",
"city": "string",
"fias_guid": "d37bb109-5355-46b0-ac51-7b6911a53fac",
"kladr_code": "string",
"country_code": "st",
"country": "string",
"region": "string",
"region_code": 0,
"fias_region_guid": "88d7b0d4-3671-4e5a-bafc-b9556aa1b2e8",
"kladr_region_code": "string",
"sub_region": "string",
"longitude": 0.1,
"latitude": 0.1,
"address": "string",
"postal_code": "string"
},
"need_call": true,
"statuses": [
{
"code": "string",
"name": "string",
"date_time": "2019-08-24T14:15:22Z"
}
],
"packages": [
{
"package_id": "82585450-66a8-4ff2-8a7e-8e7bec960ae1",
"weight": 0,
"length": 0,
"width": 0,
"height": 0
}
],
"contragent_uuid": "1b54f24c-1736-4b65-82bc-dab523f99ce5"
},
"requests": [
{
"request_uuid": "a699086b-c336-457e-9191-0c825d6efbc8",
"type": "string",
"date_time": "2019-08-24T14:15:22Z",
"state": "string",
"errors": [
{
"code": "string",
"additional_code": "string",
"message": "string"
}
],
"warnings": [
{
"code": "string",
"message": "string"
}
]
}
]
}
```

返回的数据: 400 Bad Request

```plain
{
"errors": [
{
"code": "string",
"additional_code": "string",
"message": "string"
}
],
"warnings": [
{
"code": "string",
"message": "string"
}
]
}
```

---

## 删除取件申请

URL: https://www.yuque.com/cdek/api2/cbwrmvx0nc40yfnb
Doc ID: 232295468
Updated: 2025-08-14T06:26:43.000Z

该方法用于删除快递员上门取件的申请。 通过接口集成，可在非最终状态的任何状态下删除申请。
授权方式： bearerAuth

| 测试环境 | https://api.edu.cdek.ru/v2/intakes/{uuid} |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/intakes/{uuid} |

路径参数：

| 参数名 | 类型 | 描述 |
| --- | --- | --- |
| uuid (必填) | UUID | CDEK 系统中申请的唯一标识 |

响应状态码
200 OK — 请求成功，返回申请信息。
400 Bad Request — 请求参数错误。
​

​

请求例子：

```plain
https://api.cdek.ru/v2/intakes/72753031-0525-4aa4-9629-d6ae52e825f5
```

| ​ | 属性名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | entity | 取件申请号 | entity | 否 |
| 1.1 | uuid | CDEK系统的取件申请的唯一标识 | UUID | 否 |
| 2 | requests | 请求应用程序上方的信息 | request[] | 是 |
| 2.1 | request_uuid | 请求的CDEK识别码 | UUID | 否 |
| 2.2 | type | 请求类型 / 可以接受值: CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 设置当前请求状态的日期和时间（格式yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 当前请求状态 / 可取以下值： / ACCEPTED - 初步验证已通过，请求已被接受 / WAITING - 请求正在等待处理（取决于其他请求的执行情况） / SUCCESSFUL  - 请求已成功处理 / INVALID - 请求处理时出现错误 | string() | 是 |
| 2.5 | errors | 查询执行期间发生的错误 | error[] | 否 |
| 2.5.1 | code | 错误的代码 | string() | 是 |
| 2.5.2 | message | 错误的描述 | string() | 是 |
| 2.6 | warnings | 查询执行期间发生的警告 | warning[] | 否 |
| 2.6.1 | code | 警告的代码 | string() | ​是 |
| 2.6.2 | message | 警告的描述 | string() | 是 |

返回的数据:

```plain
{
    "entity": {
        "uuid": "72753031-0525-4aa4-9629-d6ae52e825f5"
    },
    "requests": [
        {
            "request_uuid": "72753031-9b53-48a4-8814-dda44250c565",
            "type": "DELETE",
            "state": "ACCEPTED",
            "date_time": "2020-02-10T12:02:37+0700",
            "errors": [],
            "warnings": []
        }
    ]
}
```

---

## 申请生成面单

URL: https://www.yuque.com/cdek/api2/barcode-create
Doc ID: 6275389
Updated: 2024-06-26T03:26:27.000Z

通过该接口可以申请生成面单

请求参数

请求内容格式为 JSON (Content-Type: application/json) 字符编码 UTF-8.

POST-请求， 请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/print/barcodes |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/ / print/barcodes |

​

请求内容

| 序号 | 属性名称 | 描述 | 类型 | 是否必填的 |
| --- | --- | --- | --- | --- |
| 1 | orders | 订单列表 | order[ ] | 是 |
| 1.1 | order_uuid | 订单唯一只别编码 uuid | UUID | 是, 提交 cdek_number 的话 |
| 1.2 | cdek_number | CDEK运单号 | long | 是, 提交 order_uuid 的话 |
| 2 | copy_count | 份数，默认为1 | integer | 否 |
| 3 | format | 格式，所可能的值：  A4, A5, A6（默认值为 A4） | string(2) | 否 |

请求内容JSON例子

```json
{
    "orders": [
        {
            "order_uuid": '7275asdas034-e12d-4d3d-8472-0b11f75aasd9185b'
        }
    ],
    "copy_count": 1,
    "format": "A6"
}
```

返回内容
​

返回的内容为JSON格式:
​

| 序号 | 属性名称 | 描述 | 类型 | 是否必填 |
| --- | --- | --- | --- | --- |
| 1 | entity | 面单 | entity | 否 |
| 1.1 | uuid | 面单唯一只别编码 uuid | UUID | 否 |
| 2 | requests | 面单对应的请求信息 | request[] | 是 |
| 2.1 | request_uuid | Идентификатор запроса в ИС СДЭК | UUID | 否 |
| 2.2 | type | 请求类型: CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 请求变更状态的时间以及日期 (格式为 yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 请求状态: ACCEPTED, WAITING, SUCCESSFUL, INVALID | string() | 是 |
| 2.5 | errors | 进行请求时发生的错误 | error[] | 否 |
| 2.5.1 | code | 错误编码 | string() | 是 |
| 2.5.2 | message | 错误描述 | string() | 是 |
| 2.6 | warnings | 进行请求时的警示 | warning[] | 否 |
| 2.6.1 | code | 警示编码 | string() | 是 |
| 2.6.2 | message | 警示描述 | string() | 是 |

返回内容例子：

```json
{
    "entity": {
        "uuid": "72753034-c617-46ef-b70a-8f5f520b6be4"
    },
    "requests": [
        {
            "request_uuid": "72753034-e836-499d-bee7-e02053498521",
            "type": "CREATE",
            "state": "ACCEPTED",
            "date_time": "2020-03-19T11:25:53+0700",
            "errors": [],
            "warnings": []
        }
    ]
}
```

---

## 获取面单

URL: https://www.yuque.com/cdek/api2/barcode_receive
Doc ID: 6277701
Updated: 2024-06-26T03:26:39.000Z

通过该接口可以获取已经生成好的面单

下单请求

请求内容格式为 JSON (Content-Type: application/json) 字符编码 UTF-8.

GET-请求， 请求URL:

| 测试环境 | https://api.edu.cdek.ru/v2/print/barcodes/{uuid} |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/print/barcodes/{uuid} |

​

{uuid} - 申请生成面单请求返回的 entity.uuid
entity.uuid 的时效是创建订单的一个小时（60分钟）

返回内容
返回的内容为JSON格式:
​

| 序号 | 属性名称 | 属性描述 | 类型 | 是否必填 |
| --- | --- | --- | --- | --- |
| 1 | entity | 面单信息 | entity | нет |
| 1.1 | uuid | 面单文件唯一识别码 | UUID | да |
| 1.2 | orders | 订单列表 | order[ ] | да |
| 1.2.1 | order_uuid | 订单唯一识别码 | UUID | нет |
| 1.2.2 | cdek_number | CDEK运单号 | long | нет |
| 1.1.3 | copy_count | 份数 | integer | нет |
| 1.1.4 | format | 面单格式 | string(2) | нет |
| 1.1.5 | url1 | PDF面单链接 （仅面单状态READY才有） / 格式: https://api.cdek.ru/v2/print/barcodes/{uuid}.pdf | string() | нет |
| 1.1.6 | statuses | 面单状态 | status[ ] | да |
| 1.1.6.1 | code | 状态编码 | string() | да |
| 1.1.6.2 | name | 状态名称 | string() | да |
| 1.1.6.3 | date_time | 状态日期已经时间 (格式 yyyy-MM-dd'T'HH:mm:ssZ) | datetime | да |
| 1.2 | requests | 订单对应的请求列表 | request[] | 是 |
| 1.2.1 | request_uuid | CDEK数据库的请求ID | UUID | 否 |
| 1.2.2 | type | 请求类型，所可能的类型：CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 1.2.3 | date_time | 状态日期 (格式为：yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 1.2.4 | state | 目前的状态所可能的状态: ACCEPTED, WAITING, SUCCESSFUL, INVALID | string() | 是 |
| 1.2.5 | errors | 进行请求中发生的错误列表 | error[] | 否 |
| 1.2.5.1 | code | 错误编码 | string() | 是 |
| 1.2.5.2 | message | 错误描述 | string() | 是 |
| 1.2.6 | warnings | 警告列表 | warning[] | 否 |
| 1.2.6.1 | code | 警告编码 | string() | 是 |
| 1.2.6.2 | message | 警告描述 | string() | 是 |
| 2 | requests | 订单对应的请求列表 | request[] | 是 |
| 2.1 | request_uuid | 订单唯一识别码 | UUID | 否 |
| 2.2 | type | 请求类型，所可能的类型：CREATE, UPDATE, DELETE, AUTH, GET | string() | 是 |
| 2.3 | date_time | 状态日期 (格式为：yyyy-MM-dd'T'HH:mm:ssZ) | datetime | 是 |
| 2.4 | state | 目前的状态所可能的状态: ACCEPTED, WAITING, SUCCESSFUL, INVALID | string() | 是 |
| 2.5 | errors | 进行请求中发生的错误列表 | error[] | 否 |
| 2.5.1 | code | 错误编码 | string() | 是 |
| 2.5.2 | message | 错误描述 | string() | 是 |
| 2.6 | warnings | 警告列表 | warning[] | 否 |
| 2.6.1 | code | 警告编码 | string() | 是 |
| 2.6.2 | message | 警告描述 | string() | 是 |

​

1  为了下载面单文件需要发送GET-请求并且headers中填验证参数 (/cdek/api2/auth)

状态编码

| 编码 | 名称 | 描述 |
| --- | --- | --- |
| ACCEPTED | 已接收 | 生成面单的请求已经成功接收 |
| PROCESSING | 生成中 | 面单PDF文件正在生成中 |
| READY | 生成完成 | PDF生成结束，可以通过连接下载生成好的面单 |
| REMOVED | 已被删除 | 下载PDF连接已经过期了 |
| INVALID | 请求有误 | 生成面单请求有错误 |

返回内容例子

```json
{
    "entity": {
        "uuid": "72753034-c617-46ef-b70a-8f5f520b6be4",
        "orders": [
            {
                "order_uuid": "72753034-bd61-45fc-be66-da4a03ed2ed8"
            }
        ],
        "copy_count": 1,
        "type": "barcode",
        "format": "A4",
        "url": "http://api.cdek.ru/v2/print/barcodes/72753034-c617-46ef-b70a-8f5f520b6be4.pdf",
        "statuses": [
            {
                "code": "ACCEPTED",
                "name": "Принят",
                "date_time": "2020-03-19T11:25:53+0700"
            },
            {
                "code": "PROCESSING",
                "name": "Формируется",
                "date_time": "2020-03-19T11:25:53+0700"
            },
            {
                "code": "READY",
                "name": "Сформирован",
                "date_time": "2020-03-19T11:25:54+0700"
            }
        ]
    },
    "requests": [
        {
            "request_uuid": "72753034-e836-499d-bee7-e02053498521",
            "type": "CREATE",
            "date_time": "2020-03-19T11:25:54+0700",
            "state": "SUCCESSFUL"
        }
    ]
}
```

---

## 按照费率代码获取运费

URL: https://www.yuque.com/cdek/api2/tariff_code_calc
Doc ID: 201719432
Updated: 2025-01-08T10:00:15.000Z

**POST请求， 请求URL**

| 测试环境 | https://api.edu.cdek.ru/v2/calculator/tariff |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/calculator/tariff |

**请求头信息**

| Content-type | application/json |
| --- | --- |
| Authorization | Bearer token |

**token 在验证方式可以获取
​

请求数据**

| 序列号 | 数据名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | date | 计划下单日期 / 默认值 - 今天 | datetime | 否 |
| 2 | type | 订单类型 / 1 - 电商 / 2 - 普通 | integer | 否 |
| 3 | currency | 货币编号 / 默认值 - 合同的货币 / 查看货币列表 | integer | 否 |
| 4 | tariff_code | 服务代码 / 查看服务列表 | integer | 是 |
| 5 | from_location | 发货地点 | ​ | 是 |
| 5.1 | code * | 城市编码 | integer | 否 |
| 5.2 | postal_code * | 城市邮编 | string(255) | 否 |
| 5.3 | country_code | 国家编号 ISO_3166-1_alpha-2 / 默认值 - 俄罗斯 (RU) | string(2) | 否 |
| 5.4 | city | 城市名称 | string(255) | 否 |
| 5.5 | address * | 地址 | string(255) | 否 |
| 6 | to_location | 收货地点 | ​ | 是 |
| 6.1 | code * | 城市编码 | integer | 否 |
| 6.2 | postal_code * | 城市邮编 | string(255) | 否 |
| 6.3 | country_code | 国家编码 / 默认值 - 俄罗斯 (RU) | string(2) | 否 |
| 6.4 | city | 城市名称 | string(255) | 否 |
| 6.5 | address * | 地址 | string(255) | 否 |
| 7 | services | 增值服务列表 | [ ] | 否 |
| 7.1 | code | 增值服务代码 | string(255) | 否 |
| 7.2 | parameter | 增值服务的参数 | string(255) | 否 |
| 8 | packages | 包装件列表 | [ ] | 是 |
| 8.1 | weight | 重量 (克) | integer | 是 |
| 8.2 | length | 长度 (厘米) | integer | 否 |
| 8.3 | width | 宽度 (厘米) | integer | 否 |
| 8.4 | height | 高度 (厘米) | integer | 否 |

*** 城市认证优先**

城市编码
城市邮编
地址
​

**请求数据例子**

```json
{
  "tariff_code": 137,
  "from_location": {
    "code": 44
  },
  "to_location": {
    "code": 270
  },
  "packages": [{
    "weight": 3000
  }]
}
```

**返回数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | delivery_sum | 运费 | float |
| 2 | period_min | 最小派送期限 (工作日) | integer |
| 3 | period_max | 最大派送期限 (工作日) | integer |
| 4 | calendar_min | 最小派送期限 (自然日) | integer |
| 5 | calendar_max | 最大派送期限 (自然日) | integer |
| 6 | weight_calc | 计算重量 | integer |
| 7 | services | 增值服务列表 | [ ] |
| 7.1 | code | 增值服务代码 | string(255) |
| 7.2 | sum | 金额 | float |
| 7.3 | total_sum | 总金额 | float |
| 7.4 | discount_percent | 折扣百分之 | float |
| 7.5 | discount_sum | 折扣金额 | float |
| 7.6 | vat_rate | 增值税 | float |
| 7.7 | vat_sum | 增值税金额 | float |
| 8 | total_sum | 总金额 | float |
| 9 | currency | 货币代码 | string(3) |
| 10 | errors | 错误列表 | [ ] |
| 10.1 | code | 错误代码 | string(255) |
| 10.2 | message | 错误信息 | string(255) |

**返回数据例子**

```json
{
  "delivery_sum": 61.07,
  "period_min": 4,
  "period_max": 5,
  "calendar_min": 4,
  "calendar_max": 5,
  "weight_calc": 3000,
  "services": [{
    "code": "INSURANCE",
    "sum": 0.0,
    "total_sum": 0.0,
    "discount_percent": 0,
    "discount_sum": 0.0
  }],
  "total_sum": 61.07,
  "currency": "CNY"
}
```

---

## 获取可以使用的服务列表

URL: https://www.yuque.com/cdek/api2/available_tariff
Doc ID: 201813628
Updated: 2025-01-08T09:22:59.000Z

**POST请求， 请求URL**

| 测试环境 | https://api.edu.cdek.ru/v2/calculator/tarifflist |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/calculator/tarifflist |

**请求头信息**

| Content-type | application/json |
| --- | --- |
| Authorization | Bearer token |

**token 在验证方式可以获取
​

请求数据**

| 序列号 | 数据名称 | 描述 | 类型 | 必填 |
| --- | --- | --- | --- | --- |
| 1 | date | 计划下单日期 / 默认值 - 今天 | datetime | 否 |
| 2 | type | 订单类型 / 1 - 电商 / 2 - 普通 | integer | 否 |
| 3 | currency | 货币编号 / 默认值 - 合同的货币 / 查看货币列表 | integer | 否 |
| 4 | lang | 语言 / rus - 俄文 / eng - 英文 / zho - 中文 / 默认值 - rus (俄文) | string(3) | 否 |
| 5 | from_location | 发货地点 | ​ | 是 |
| 5.1 | code * | 城市编码 | integer | 否 |
| 5.2 | postal_code * | 城市邮编 | string(255) | 否 |
| 5.3 | country_code | 国家编码 / 默认值 - 俄罗斯 (RU) | string(2) | 否 |
| 5.4 | city | 城市名称 | string(255) | 否 |
| 5.5 | address * | 地址 | string(255) | 否 |
| 6 | to_location | 收货地点 | ​ | 是 |
| 6.1 | code * | 城市编码 | integer | 否 |
| 6.2 | postal_code * | 城市邮编 | string(255) | 否 |
| 6.3 | country_code | 国家编码 / 默认值 - 俄罗斯 (RU) | string(2) | 否 |
| 6.4 | city | 城市名称 | string(255) | 否 |
| 6.5 | address * | 地址 | string(255) | 否 |
| 7 | packages | 包装件列表 | [ ] | 是 |
| 7.1 | weight | 重量 (克) | integer | 是 |
| 7.2 | length | 长度 (厘米) | integer | 否 |
| 7.3 | width | 宽度 (厘米) | integer | 否 |
| 7.4 | height | 高度 (厘米) | integer | 否 |

*** 城市认证优先**

城市编码
城市邮编
地址
​

**请求数据例子**

```json
{
  "lang": "zho",
  "from_location": {
    "code": 44
  },
  "to_location": {
    "code": 270
  },
  "packages": [{
    "weight": 60000
  }]
}
```

**返回数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | tariff_codes | 可以使用的服务列表 | [ ] |
| 1.1 | tariff_code | 服务代码 | integer |
| 1.2 | tariff_name | 服务名称 | string(255) |
| 1.3 | tariff_description | 服务描述 | string(255) |
| 1.4 | delivery_mode | 运输模式 / 查看运输模式列表 | integer |
| 1.5 | delivery_sum | 运费 | float |
| 1.6 | period_min | 最小派送期限 (工作日) | integer |
| 1.7 | period_max | 最大派送期限 (工作日) | integer |
| 1.8 | calendar_min | 最小派送期限 (自然日) | integer |
| 1.9 | calendar_max | 最大派送期限 (自然日) | integer |
| 2 | errors | 错误列表 | [ ] |
| 2.1 | code | 错误代码 | string(255) |
| 2.2 | message | 错误信息 | string(255) |

**返回数据例子**

```json
{
  "tariff_codes": [
    {
      "tariff_code": 121,
      "tariff_name": "干线快递 门到门",
      "tariff_description": "",
      "delivery_mode": 1,
      "delivery_sum": 434.94,
      "period_min": 5,
      "period_max": 6,
      "calendar_min": 5,
      "calendar_max": 6
    },
    {
      "tariff_code": 123,
      "tariff_name": "干线快递 门到库",
      "tariff_description": "",
      "delivery_mode": 2,
      "delivery_sum": 376.1,
      "period_min": 5,
      "period_max": 6,
      "calendar_min": 5,
      "calendar_max": 6
    },
    {
      "tariff_code": 122,
      "tariff_name": "干线快递 库到门",
      "tariff_description": "",
      "delivery_mode": 3,
      "delivery_sum": 376.1,
      "period_min": 5,
      "period_max": 6,
      "calendar_min": 5,
      "calendar_max": 6
    },
    {
      "tariff_code": 62,
      "tariff_name": "干线快递 库到库",
      "tariff_description": "",
      "delivery_mode": 4,
      "delivery_sum": 317.27,
      "period_min": 5,
      "period_max": 6,
      "calendar_min": 5,
      "calendar_max": 6
    },
    {
      "tariff_code": 522,
      "tariff_name": "干线快递 дверь-постамат",
      "tariff_description": "",
      "delivery_mode": 6,
      "delivery_sum": 376.1,
      "period_min": 5,
      "period_max": 6,
      "calendar_min": 5,
      "calendar_max": 6
    },
    {
      "tariff_code": 523,
      "tariff_name": "干线快递 склад-постамат",
      "tariff_description": "",
      "delivery_mode": 7,
      "delivery_sum": 317.27,
      "period_min": 5,
      "period_max": 6,
      "calendar_min": 5,
      "calendar_max": 6
    },
    {
      "tariff_code": 480,
      "tariff_name": "快递  门到门",
      "tariff_description": "",
      "delivery_mode": 1,
      "delivery_sum": 1674.21,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 481,
      "tariff_name": "快递  门到库",
      "tariff_description": "",
      "delivery_mode": 2,
      "delivery_sum": 1642.56,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 482,
      "tariff_name": "快递  库到门",
      "tariff_description": "",
      "delivery_mode": 3,
      "delivery_sum": 1642.56,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 483,
      "tariff_name": "快递  库到库",
      "tariff_description": "",
      "delivery_mode": 4,
      "delivery_sum": 1610.91,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 485,
      "tariff_name": "快递  дверь-постамат",
      "tariff_description": "",
      "delivery_mode": 6,
      "delivery_sum": 1642.56,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 486,
      "tariff_name": "快递  склад-постамат",
      "tariff_description": "",
      "delivery_mode": 7,
      "delivery_sum": 1610.91,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 605,
      "tariff_name": "快递  постамат-дверь",
      "tariff_description": "",
      "delivery_mode": 8,
      "delivery_sum": 1642.56,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 606,
      "tariff_name": "快递  постамат-склад",
      "tariff_description": "",
      "delivery_mode": 9,
      "delivery_sum": 1610.91,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    },
    {
      "tariff_code": 607,
      "tariff_name": "快递  постамат-постамат",
      "tariff_description": "",
      "delivery_mode": 10,
      "delivery_sum": 1610.91,
      "period_min": 2,
      "period_max": 3,
      "calendar_min": 3,
      "calendar_max": 3
    }
  ]
}
```

---

## 获取城市列表

URL: https://www.yuque.com/cdek/api2/cities
Doc ID: 200213722
Updated: 2025-02-19T09:34:05.000Z

**GET请求， 请求URL**

| 测试环境 | https://api.edu.cdek.ru/v2/location/cities |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/location/cities |

​

**请求头信息**

| Content-type | application/json |
| --- | --- |
| Authorization | Bearer token |

**token 在验证方式可以获取
​

请求数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | country_codes | 国家编号 ISO_3166-1_alpha-2 | string(2) [ ] |
| 2 | region_code | 区域编号 | integer |
| 3 | fias_guid | 城市编号 FIAS | UUID |
| 4 | postal_code | 城市邮编 | string(255) |
| 5 | code | 城市编码 | integer |
| 6 | city | 城市名称 | string(255) |
| 7 | size | 结果选定限制 | integer |
| 8 | lang | 语言 / rus - 俄文 / eng - 英文 / zho - 中文 / 默认值 - rus (俄文) | string(3) |
| 9 | payment_limit | 到付金额限制 / -1 - 没有限制 / 0 - 没有到付 | float |

**请求例子**

https://api.cdek.ru/v2/location/cities?postal_code=198261&lang=zho (https://api.cdek.ru/v2/location/cities?postal_code=198261&lang=zho)
​

**返回数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | code | 城市编码 | integer |
| 2 | city | 城市名称 | string(255) |
| 3 | fias_guid | 城市编号 FIAS | UUID |
| 4 | city_uuid | 城市UUID | UUID |
| 5 | country_code | 国家编号 ISO_3166-1_alpha-2 | string(2) |
| 6 | country | 国家名称 | string(255) |
| 7 | region | 区域名称 | string(255) |
| 8 | region_code | 区域编码 | integer |
| 9 | sub_region | 地区名称 | string(255) |
| 10 | longitude | 经度 | float |
| 11 | latitude | 纬度 | float |
| 12 | time_zone | 时区 | string(255) |
| 13 | payment_limit | 到付金额限制 | float |
| 14 | errors | 错误列表 | [ ] |
| 14.1 | code | 错误代码 | string(255) |
| 14.2 | message | 错误信息 | string(255) |

**返回数据例子**

```json
[
  {
    "code": 137,
    "city_uuid": "901944f4-dbd1-4308-9cc7-d1fbbd858804",
    "city": "圣彼得堡",
    "fias_guid": "c2deb16a-0330-4f05-821f-1d09c93331e6",
    "country_code": "RU",
    "country": "俄罗斯 / 俄羅斯",
    "region": "圣彼得堡",
    "region_code": 82,
    "fias_region_guid": "c2deb16a-0330-4f05-821f-1d09c93331e6",
    "sub_region": "圣彼得堡",
    "longitude": 30.315877,
    "latitude": 59.939099,
    "time_zone": "Europe/Moscow",
    "payment_limit": -1.0
  }
]
```

---

## 获取服务网点列表

URL: https://www.yuque.com/cdek/api2/pick-up-points
Doc ID: 5801104
Updated: 2024-12-26T09:05:19.000Z

**GET请求， 请求URL**

| 测试环境 | https://api.edu.cdek.ru/v2/deliverypoints |
| --- | --- |
| 正式环境 | https://api.cdek.ru/v2/deliverypoints |

**请求头信息**

| Content-type | application/json |
| --- | --- |
| Authorization | Bearer token |

**token 在验证方式可以获取

请求数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | postal_code​ | 城市邮编 | integer |
| 2 | city_code​ | 城市编号 | integer |
| 3 | type | 网点类型： / “PVZ” - 网点 / “POSTOMAT” - 快递柜 / “ALL” - 所有的网点 / 默认值 - “ALL” | string(8) |
| 4 | country_code | 国家编号 ISO_3166-1_alpha-2 | string(2) |
| 5 | region_code | 区域编号 | integer |
| 6 | have_cashless | 有没有非现金结算 / 1 - true - 有 / 0 - false - 没有 | boolean |
| 7 | have_cash | 有没有现金结算 / 1 - true - 有 / 0 - false - 没有 | boolean |
| 8 | allowed_cod | 有没有到付 / 1 - true - 有 / 0 - false - 没有 | boolean |
| 9 | is_dressing_room | 有没有试衣间 / 1 - true - 有 / 0 - false - 没有 | boolean |
| 10 | weight_max | 重量上限（公斤） | integer |
| 11 | weight_min | 重量下限（公斤） | integer |
| 12 | lang | 语言： / rus - 俄文 / eng - 英文 / zho - 中文 / 默认值 - rus | string(3) |
| 13 | take_only | 是否只有派送 / 1 - true - 是 / 0 - false - 否 | boolean |
| 14 | is_handout | 是否网点 / 1 - true - 是 / 0 - false - 否 | boolean |
| 15 | is_reception | 是否能接收 / 1 - true - 是 / 0 - false - 否 | boolean |
| 16 | fias_guid | 城市编号 FIAS | UUID |
| 17 | code | 网点编号 | string(10) |
| 18 | is_ltl | 有没有混货（LTL） / 1 - true - 有 / 0 - false - 没有 | boolean |
| 19 | fulfillment | 有没有海外仓 / 1 - true - 有 / 0 - false - 没有 | boolean |
| 20 | size | 结果限制 | integer |

**请求例子**

https://api.cdek.ru/v2/deliverypoints?city_code=44&weight_max=50&allowed_cod=1 (https://api.cdek.ru/v2/deliverypoints?city_code=44&weight_max=50&allowed_cod=1)

**响应例子**

| 1 | pvz | 网点 | [ ] |
| --- | --- | --- | --- |
| 1.1 | code | 网点代码 | string |
| 1.2 | name | 网点名称 | string |
| 1.3 | uuid | 网点UUID | string |
| 1.4 | address_comment | 地址注释 | string |
| 1.5 | nearest_station | 最近的公交车站 | string |
| 1.6 | work_time | 工作时间 | string |
| 1.7 | phones | 联系电话 | [ ] |
| 1.7.1 | number | 电话号码 | string |
| 1.8 | email | 电子邮箱 | string |
| 1.9 | note | 注释 | string |
| 1.10 | type | 网点类型 | string |
| 1.11 | owner_code | 所有者编号 | string |
| 1.12 | take_only | 是否只有派送 | boolean |
| 1.13 | is_handout | 是否网点 | boolean |
| 1.14 | is_reception | 是否能接收 | boolean |
| 1.15 | is_dressing_room | 有没有试衣间 | boolean |
| 1.16 | is_ltl | 有没有混货（LTL） | boolean |
| 1.17 | have_cashless | 有没有非现金结算 | boolean |
| 1.18 | have_cash | 有没有现金结算 | boolean |
| 1.19 | allowed_cod | 有没有到付 | boolean |
| 1.20 | office_image_list | 网点图片列表 | [ ] |
| 1.20.1 | url | 图片链接 | string |
| 1.21 | work_time_list | 工作时间列表 | [ ] |
| 1.21.1 | day | 工作日 | integer |
| 1.21.2 | time | 工作时间 | string |
| 1.22 | weight_min | 重量下限（公斤） | integer |
| 1.23 | weight_max | 重量上限（公斤） | integer |
| 1.24 | location | 网点定位 | { } |
| 1.24.1 | country_code | 国家编号 ISO_3166-1_alpha-2 | string |
| 1.24.2 | region_code | 区域编号 | integer |
| 1.24.3 | region | 区域名称 | string |
| 1.24.4 | city_code | 城市编号 | integer |
| 1.24.5 | city | 城市名称 | string |
| 1.24.6 | fias_guid | 城市编号 FIAS | UUID |
| 1.24.7 | postal_code | 网点邮编 | string |
| 1.24.8 | longitude | 网点经度 | float |
| 1.24.9 | latitude | 网点纬度 | float |
| 1.24.10 | address | 网点地址 | string |
| 1.24.11 | address_full | 网点完整地址 | string |
| 1.25 | fulfillment | 有没有海外仓 | boolean |

---

## 查看轨迹

URL: https://www.yuque.com/cdek/api2/tracing
Doc ID: 206637839
Updated: 2025-08-01T02:32:29.000Z

**第一步：验证**

**POST请求， 请求URL**

| 正式环境 | https://auth.api.cdek.ru/web/simpleauth/authorize |
| --- | --- |

**​

请求头信息**

| Content-type | application/json |
| --- | --- |

**​

请求数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | user | 账号（apiuser-17tracknew） | string |
| 2 | hashedPass | 哈希密码 | string |

**​

哈希密码**

```python
import hashlib

password = 'qV2qh+kk'
hash = hashlib.md5(password.encode('utf-8'))
hashed_password = hash.hexdigest()
# print(hashed_password)
```

**​

请求数据例子**

```json
{
  "user": "apiuser-17tracknew",
  "hashedPass": hashed_password
}
```

**​

返回数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | token | 令牌 | string |

**返回数据例子**

```json
{
  "token": "3b859b410f584f36a5859f19ec281863"
}
```

**​

第二步：获取轨迹**

**POST请求， 请求URL**

| 正式环境 | https://tracing.api.cdek.ru/web/tracing/v2/order/find |
| --- | --- |

**请求头信息**

| Content-type | application/json |
| --- | --- |
| X-Auth-Token | token |
| X-User-Lang | rus (俄文), eng (英文), zho (中文) |

**​

请求数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | orderNumber | CDEK 单号 | string |

**请求数据例子**

```json
{
  "orderNumber": "10072445702"
}
```

**返回数据**

| 序列号 | 数据名称 | 描述 | 类型 |
| --- | --- | --- | --- |
| 1 | result | 结果 | { } |
| 1.1 | order | 订单 | { } |
| 1.1.1 | number | 单号 | string |
| 1.1.2 | type | 类型 | string |
| 1.1.3 | packagesCount | 货件数量 | integer |
| 1.1.4 | creationTimestamp | 下单日期 | datetime |
| 1.1.5 | trueDeliveryMode | 派送模式 | integer |
| 1.1.6 | cdekOrderType | CDEK订单类型 | integer |
| 1.1.7 | weight | 重量 | float |
| 1.1.8 | sender | 寄件人 | { } |
| 1.1.8.1 | name | 寄件人名称 | string |
| 1.1.8.2 | type | 寄件人类型 / LEGAL_ENTITY - 法人 / NATURAL_PERSON - 个人 | string |
| 1.1.8.3 | address | 寄件人地址 | { } |
| 1.1.8.3.1 | city | 寄件人城市 | { } |
| 1.1.8.3.1.1 | code | 城市编码 | string |
| 1.1.8.3.1.2 | name | 城市名称 | string |
| 1.1.8.3.1.3 | timezone | 时区 | string |
| 1.1.8.3.1.4 | timezoneOffset | 时区偏移 | string |
| 1.1.8.3.2 | country | 寄件人国家 | { } |
| 1.1.8.3.2.1 | code | 国家编码 | string |
| 1.1.8.3.2.2 | name | 国家名称 | string |
| 1.1.9 | receiver | 收件人 | { } |
| 1.1.9.1 | name | 收件人名称 | string |
| 1.1.9.2 | type | 收件人类型 / LEGAL_ENTITY - 法人 / NATURAL_PERSON - 个人 | string |
| 1.1.9.3 | address | 收件人地址 | { } |
| 1.1.9.3.1 | title | 收件人完整地址 | string |
| 1.1.9.3.2 | city | 收件人城市 | { } |
| 1.1.9.3.2.1 | code | 城市编码 | string |
| 1.1.9.3.2.2 | name | 城市名称 | string |
| 1.1.9.3.2.3 | timezone | 时区 | string |
| 1.1.9.3.2.4 | timezoneOffset | 时区偏移 | string |
| 1.1.9.3.3 | country | 收件人国家 | { } |
| 1.1.9.3.3.1 | code | 国家编码 | string |
| 1.1.9.3.3.2 | name | 国家名称 | string |
| 1.1.10 | payer | 付款人 | { } |
| 1.1.10.1 | type | 付款人类型 / LEGAL_ENTITY - 法人 / NATURAL_PERSON - 个人 | string |
| 1.1.11 | tariff | 费率 | { } |
| 1.1.11.1 | code | 费率代码 | integer |
| 1.2 | statusGroups | 轨迹分组 | [ ] |
| 1.2.1 | id | id | integer |
| 1.2.2 | code | 轨迹分组编码 | string |
| 1.2.3 | name | 轨迹分组名称 | string |
| 1.2.4 | timestamp | 日期 | datetime |
| 1.3 | statuses | 轨迹 | [ ] |
| 1.3.1 | code | 轨迹编码 | string |
| 1.3.2 | name | 轨迹名称 | string |
| 1.3.3 | timestamp | 日期 | datetime |
| 1.3.4 | currentCity | 目前的城市 | { } |
| 1.3.4.1 | code | 城市编码 | integer |
| 1.3.4.2 | name | 城市名称 | string |
| 1.3.4.3 | timezone | 时区 | string |
| 1.3.4.4 | timezoneOffset | 时区偏移 | string |
| 1.3.5 | nextCity | 下一个城市 | { } |
| 1.3.5.1 | code | 城市编码 | integer |
| 1.3.5.2 | name | 城市名称 | string |
| 1.3.5.3 | timezone | 时区 | string |
| 1.3.5.4 | timezoneOffset | 时区偏移 | string |
| 1.3.6 | groupId | 轨迹分组的 id | integer |
| 1.4 | warehouse | 仓库 | { } |
| 1.4.1 | acceptance | 入库 | { } |
| 1.4.1.1 | plannedEndDate | 仓库预发日期 | date |
| 1.4.2 | storage | 仓储 | { } |
| 1.4.2.1 | days | 仓储天数 | integer |
| 1.4.2.2 | endDate | 有效日期 | date |
| 1.4.2.3 | endTimestamp | 有效日期 | datetime |

**返回数据例子**

```json
{
  "result": {
    "order": {
      "number": '10072445702",
      "type": "CDEK",
      "packagesCount": 1,
      "creationTimestamp": "2025-01-10T09:12:12Z",
      "trueDeliveryMode": "3",
      "cdekOrderType": "1",
      "weight": 1.9,
      "sender": {
        "name": "Shanghai Sidek Freight Forwarding Co., Ltd.",
        "type": "LEGAL_ENTITY",
        "address": {
          "city": {
            "code": "12683",
            "name": "Шанхай",
            "timezone": "Asia/Shanghai",
            "timezoneOffset": "+08:00"
          },
          "country": {
              "code": "138",
              "name": "Китай (КНР)"
          }
        }
      },
      "receiver": {
        "initials": "Е.о.О.",
        "type": "NATURAL_PERSON",
        "address": {
          "title": "Москва, ул. Тимирязевская, д. 1",
          "city": {
            "code": "44",
            "name": "Москва",
            "timezone": "Europe/Moscow",
            "timezoneOffset": "+03:00"
          },
          "country": {
            "code": "1",
            "name": "Россия"
          }
        }
      },
      "payer": {
        "type": "LEGAL_ENTITY"
      },
      "tariff": {
        "code": "2263"
      },
    "statusGroups": [
      {"id": 0, "code": "CREATED", "name": "Создан", "timestamp": "2025-01-10T09:12:12.367Z", "showStatuses": False, "future": False},
      {"id": 1, "code": "IN_PROGRESS", "name": "В пути", "timestamp": "2025-01-11T11:57:59.070Z", "showStatuses": True, "future": False},
      {"id": 2, "code": "DELIVERED", "name": "Вручен", "timestamp": "2025-01-22T08:14:12Z", "showStatuses": False, "future": False}
    ],
    "statuses": [
      {"code": "CREATED", "name": "Создан", "timestamp": "2025-01-10T09:12:12.367Z", "groupId": 0},
      {"code": "ACCEPTED_FOR_DELIVERY", "name": "Принят на доставку", "timestamp": "2025-01-11T11:57:59.070Z", "currentCity": {"code": "7157", "name": "Шэньчжэнь", "timezone": "Asia/Shanghai", "timezoneOffset": "+08:00"}, "nextCity": {"code": "7157", "name": "Шэньчжэнь", "timezone": "Asia/Shanghai", "timezoneOffset": "+08:00"}, "groupId": 1},
      {"code": "SENT_TO_SORTING_CENTER", "name": "Отправлен в сортировочный центр", "timestamp": "2025-01-15T07:54:21.934Z", "currentCity": {"code": "7157", "name": "Шэньчжэнь", "timezone": "Asia/Shanghai", "timezoneOffset": "+08:00"}, "nextCity": {"code": "7157", "name": "Шэньчжэнь", "timezone": "Asia/Shanghai", "timezoneOffset": "+08:00"}, "groupId": 1},
      {"code": "SENDER_COUNTRY_CUSTOM_CLEARANCE", "name": "Таможенное оформление в стране отправления", "timestamp": "2025-01-16T05:36:10.570Z", "currentCity": {"code": "7157", "name": "Шэньчжэнь", "timezone": "Asia/Shanghai", "timezoneOffset": "+08:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "SENT_TO_RECEIVER_COUNTRY", "name": "Отправлен в страну назначения", "timestamp": "2025-01-16T05:36:10.571Z", "currentCity": {"code": "7157", "name": "Шэньчжэнь", "timezone": "Asia/Shanghai", "timezoneOffset": "+08:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "ACCEPTED_AT_SORTING_CENTER", "name": "Прибыл в сортировочный центр", "timestamp": "2025-01-17T08:37:09.236Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "46941", "name": "Химки", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "SENT_TO_NEXT_CITY", "name": "Отправлено в г. Химки", "timestamp": "2025-01-17T08:39:33.049Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "46941", "name": "Химки", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "ACCEPTED_AT_SORTING_CENTER", "name": "Прибыл в сортировочный центр", "timestamp": "2025-01-17T12:48:33.443Z", "currentCity": {"code": "46941", "name": "Химки", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "RECEIVER_COUNTRY_CUSTOM_CLEARANCE", "name": "Таможенное оформление в стране назначения", "timestamp": "2025-01-19T12:47:14Z", "groupId": 1},
      {"code": "CUSTOM_CLEARANCE_COMPLETED", "name": "Таможенное оформление завершено", "timestamp": "2025-01-19T14:30:29.607Z", "groupId": 1},
      {"code": "SENT_TO_NEXT_CITY", "name": "Отправлено в г. Москва", "timestamp": "2025-01-20T14:08:33.069Z", "currentCity": {"code": "46941", "name": "Химки", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "ACCEPTED_AT_SORTING_CENTER", "name": "Прибыл в сортировочный центр", "timestamp": "2025-01-20T19:08:10.480Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "SENT_TO_SORTING_CENTER", "name": "Отправлен в сортировочный центр", "timestamp": "2025-01-21T15:07:10.928Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "ACCEPTED_AT_SORTING_CENTER", "name": "Прибыл в сортировочный центр", "timestamp": "2025-01-21T19:23:14.985Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "SENT_TO_COURIER_POINT", "name": "Отправлен в пункт доставки", "timestamp": "2025-01-22T05:38:04.051Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "nextCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "ACCEPTED_AT_COURIER_POINT", "name": "Прибыл в пункт доставки", "timestamp": "2025-01-22T08:11:54.451Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 1},
      {"code": "DELIVERED", "name": "Вручен", "timestamp": "2025-01-22T08:14:12Z", "currentCity": {"code": "44", "name": "Москва", "timezone": "Europe/Moscow", "timezoneOffset": "+03:00"}, "groupId": 2}
    ],
    "warehouse": {
      "acceptance": {
        "plannedEndDate": "2025-02-10"
      },
      "storage": {
        "days": 7,
        "endDate": "2025-01-29",
        "endTimestamp": "2025-01-29T20:59:59Z"
      }
    }
}
```

---

## 轨迹列表

URL: https://www.yuque.com/cdek/api2/statuses
Doc ID: 230516929
Updated: 2025-08-01T05:33:40.000Z

| ​轨迹代码 | 轨迹俄文名称 | 轨迹中文名称 |
| --- | --- | --- |
| CREATED | Создан | 已创建 |
| ACCEPTED_FOR_DELIVERY | Принят на доставку | 接受来交付 |
| ACCEPTED_AT_SORTING_CENTER | Прибыл в сортировочный центр | 达到分拣中心 |
| ACCEPTED_AT_COURIER_POINT | Прибыл в пункт доставки | 达到交付点 |
| SENT_TO_RECEIVER_COUNTRY | Отправлен в страну назначения | 送到目的国 |
| SENT_TO_NEXT_CITY | Отправлен в следующий город | 送到下一个到达点 |
| SENT_TO_PICK_UP_POINT | Отправлен в пункт выдачи | 送到提货点 |
| SENDER_COUNTRY_CUSTOM_CLEARANCE | Таможенное оформление в стране отправления | 发出国清关 |
| RECEIVER_COUNTRY_CUSTOM_CLEARANCE | Таможенное оформление в стране назначения | 目的国清关 |
| CUSTOM_CLEARANCE_COMPLETED | Таможенное оформление завершено | 清关完成好了 |
| PICKED_UP_BY_COURIER | Выдан курьеру | 交给快递员 |
| PICKED_UP_BY_COURIER_TO_POSTAMAT | Курьер везет заказ в постамат | 派送中到自提柜 |
| PICKED_UP_FROM_POSTAMAT | Изъят из постамата курьером | 自提柜里货物的保质期已过期，订单将退回给发货人 |
| POSTAMAT_READY_FOR_PICK_UP | Заложен в постамат | 已放自提柜里 |
| READY_FOR_PICK_UP | Поступил, заберите заказ | 已达到了，请接受您的订单 |
| COURIER_DELIVERY_FAILED | Курьер не смог доставить заказ | 快递员无法交付货物了 |
| DELIVERED | Вручен | 已交付 |
| NOT_DELIVERED | Не вручен | 未交付 |

---

## 服务列表

URL: https://www.yuque.com/cdek/api2/tariff_codes
Doc ID: 178934780
Updated: 2026-01-19T02:07:52.000Z

| 服务代码 | 服务俄文名称 | 服务中文名称 | 服务模式 | 重量限制 | 服务类型 |
| --- | --- | --- | --- | --- | --- |
| 62 | Магистральный экспресс | 干线 | Склад-склад 库到库 | 无 | 派送 |
| 121 | Дверь-дверь 门到门 |  |  |  |  |
| 122 | Склад-дверь 库到门 |  |  |  |  |
| 123 | Дверь-склад 门到库 |  |  |  |  |
| 136 | Посылка Parcel | 快件 | Склад-склад 库到库 | 50公斤以下 | 电商 |
| 137 | Склад-дверь 库到门 |  |  |  |  |
| 138 | Дверь-склад 门到库 |  |  |  |  |
| 139 | Дверь-дверь 门到门 |  |  |  |  |
| 184 | E-com Standard | E-com Standard | Дверь-дверь 门到门 | 无 | 电商 |
| 185 | Склад-склад 库到库 |  |  |  |  |
| 186 | Склад-дверь 库到门 |  |  |  |  |
| 186 | Дверь-склад 门到库 |  |  |  |  |
| 231 | Экономичная посылка | 经济性快件 | Дверь-дверь 门到门 | 50公斤以下 | 电商 |
| 232 | Дверь-склад 门到库 |  |  |  |  |
| 233 | Склад-дверь 库到门 |  |  |  |  |
| 234 | Склад-склад 库到库 |  |  |  |  |
| 291 | E-com Express | E-com Express | Склад-склад 库到库 | 500公斤以下 | 电商 |
| 293 | Дверь-дверь 门到门 |  |  |  |  |
| 294 | Склад-дверь 库到门 |  |  |  |  |
| 295 | Дверь-склад 门到库 |  |  |  |  |
| 480 | Express | 小包快递 | Дверь-дверь 门到门 | 无 | 派送 |
| 481 | Дверь-склад 门到库 |  |  |  |  |
| 482 | Склад-дверь 库到门 |  |  |  |  |
| 483 | Склад-склад 库到库 |  |  |  |  |
| 748 | Сборный груз | 拼箱 | Дверь-дверь 门到门 | 70公斤以上 / 10万公斤以下 | 派送 |
| 749 | Дверь-склад 门到库 |  |  |  |  |
| 750 | Склад-дверь 库到门 |  |  |  |  |
| 751 | Склад-склад 库到库 |  |  |  |  |
| 2261 | Documents Express | Documents Express | Дверь-дверь 门到门 | 特定目的地的个人限制 | 派送 |
| 2262 | Дверь-склад 门到库 |  |  |  |  |
| 2263 | Склад-дверь 库到门 |  |  |  |  |
| 2263 | Склад-склад 库到库 |  |  |  |  |

---

## 货币列表

URL: https://www.yuque.com/cdek/api2/currency
Doc ID: 201807913
Updated: 2025-08-01T03:27:38.000Z

| 货币编号 | 货币名称 | 货币代码 |
| --- | --- | --- |
| 1 | 🇷🇺 俄罗斯卢布 | RUB |
| 2 | 🇰🇿 哈萨克斯坦坚戈 | KZT |
| 3 | 🇺🇸 美元 | USD |
| 4 | 🇪🇺 欧元 | EUR |
| 5 | 🇬🇧 英镑 | GBP |
| 6 | 🇨🇳 中国人民币 | CNY |
| 7 | 🇧🇾 白俄罗斯卢布 | BYR |
| 8 | 🇺🇦 乌克兰格里夫纳 | UAH |
| 9 | 🇰🇬 吉尔吉斯斯坦索姆 | KGS |
| 10 | 🇦🇲 亚美尼亚德拉姆 | AMD |
| 11 | 🇹🇷 土耳其里拉 | TRY |
| 12 | 🇹🇭 泰铢 | THB |
| 13 | 🇰🇷 韩元 | KRW |
| 14 | 🇦🇪 阿联酋迪拉姆 | AED |
| 15 | 🇺🇿 乌兹别克斯坦苏姆 | UZS |
| 16 | 🇲🇳 蒙古图格里克 | MNT |
| 17 | 🇵🇱 波兰兹罗提 | PLN |
| 18 | 🇹🇲 土库曼斯坦马那特 | AZN |
| 19 | 🇬🇪 格鲁吉亚拉里 | GEL |
| 55 | 🇯🇵 日元 | JPY |
| 704 | 🇻🇳 越南盾 | VND |

---

## 运输模式列表

URL: https://www.yuque.com/cdek/api2/delivery_modes
Doc ID: 201822209
Updated: 2025-08-01T03:27:48.000Z

| 运输模式代码 | 运输模式 |
| --- | --- |
| 1 | 门到门 |
| 2 | 门到库 |
| 3 | 库到门 |
| 4 | 库到库 |
| 6 | 门到快递柜 |
| 7 | 库到快递柜 |
| 8 | 快递柜到门 |
| 9 | 快递柜到库 |
| 10 | 快递柜到快递柜 |