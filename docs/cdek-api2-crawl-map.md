# CDEK API 2.0 Yuque Crawl Map

Source: https://www.yuque.com/cdek/api2
Generated at: 2026-04-28T08:30:52.224Z
Book updated at: 2026-01-19T02:07:52.000Z
TOC updated at: 2025-08-14T11:40:16.000Z

## Directory

- DOC: 客户授权 - https://www.yuque.com/cdek/api2/authorization
- TITLE: 下单
  - DOC: 申请下单请求 - https://www.yuque.com/cdek/api2/order-request
  - DOC: 获取订单信息 - https://www.yuque.com/cdek/api2/order-info
  - DOC: 修改订单接口 - https://www.yuque.com/cdek/api2/order-update
  - DOC: 取消订单 - https://www.yuque.com/cdek/api2/order-request-cancel
- DOC: 取件申请 - https://www.yuque.com/cdek/api2/aql1bkxggnt0mpvg
  - DOC: 获取快递员上门取件可用日期（针对货到付款） - https://www.yuque.com/cdek/api2/tgfb0hy8qh1gm8vx
  - DOC: 注册快递员上门取件申请 - https://www.yuque.com/cdek/api2/tzaklkr6vw4rn0xm
  - DOC: 获取申请信息（通过 UUID） - https://www.yuque.com/cdek/api2/xleu2p9amyybzfvc
  - DOC: 修改取件申请的状态 - https://www.yuque.com/cdek/api2/ex38lg91drsygye9
  - DOC: 删除取件申请 - https://www.yuque.com/cdek/api2/cbwrmvx0nc40yfnb
- TITLE: 打印面单
  - DOC: 申请生成面单 - https://www.yuque.com/cdek/api2/barcode-create
  - DOC: 获取面单 - https://www.yuque.com/cdek/api2/barcode_receive
- TITLE: 计算器
  - DOC: 按照费率代码获取运费 - https://www.yuque.com/cdek/api2/tariff_code_calc
  - DOC: 获取可以使用的服务列表 - https://www.yuque.com/cdek/api2/available_tariff
- DOC: 获取城市列表 - https://www.yuque.com/cdek/api2/cities
- DOC: 获取服务网点列表 - https://www.yuque.com/cdek/api2/pick-up-points
- DOC: 查看轨迹 - https://www.yuque.com/cdek/api2/tracing
- TITLE: 附件
  - DOC: 轨迹列表 - https://www.yuque.com/cdek/api2/statuses
  - DOC: 服务列表 - https://www.yuque.com/cdek/api2/tariff_codes
  - DOC: 货币列表 - https://www.yuque.com/cdek/api2/currency
  - DOC: 运输模式列表 - https://www.yuque.com/cdek/api2/delivery_modes

## Documents

### 客户授权
- Slug: authorization
- Source: https://www.yuque.com/cdek/api2/authorization
- Updated: 2025-07-14T04:22:23.000Z
- Word count: 234
- Code blocks: 3
- Endpoints: https://api.cdek.ru/v2/oauth/token?parameters; https://api.edu.cdek.ru/v2/oauth/token?parameters; https://api.edu.cdek.ru/v2/oauth/token?parameters'
- Opening note: POST请求， 请求URL
 测试环境
 | https://api.edu.cdek.ru/v2/oauth/token?parameters
 |
 正式环境
 | https://api.cdek.ru/v2/oauth/token?parameters
 |
 请求内容格式
 | application/x-www-form-urlencoded
 |

### 申请下单请求
- Slug: order-request
- Source: https://www.yuque.com/cdek/api2/order-request
- Updated: 2025-07-04T05:19:32.000Z
- Word count: 3622
- Code blocks: 4
- Endpoints: http://api.cdek.ru/v2/oauth/token'; https://api.cdek.ru/v2/orders',
- Headings: 下单请求 / 请求内容 / 申请下单请求例子 / Python3 申请下单请求例子 / 申请成功返回的数据 / 申请失败返回的数据 / 常见异常 / 附件 / 国家以及对应的币种 / 附加服务 / 材质列表
- Opening note: 申请下单请求不返回运单号，为了获取运单号需要使用 申请下单请求 返回的请求UUID（ entity.uuid ）提交到 获取下单请求结果 的接口。

### 获取订单信息
- Slug: order-info
- Source: https://www.yuque.com/cdek/api2/order-info
- Updated: 2024-11-16T09:13:11.000Z
- Word count: 4501
- Code blocks: 3
- Endpoints: https://api.cdek.ru/v2/orders/{entity_uuid}'
- Headings: 获取下单结果 / 请求内容 / 返回的数据描述 / 返回的数据例子1 / 返回的数据例子2 / 常见异常 / 订单状态描述 / 附加状态描述
- Opening note: 下单结果接口接收申请下单接口返回的  entity.uuid 值，返回申请下单请求提交的数据以及下单结果。
 获取下单结果

### 修改订单接口
- Slug: order-update
- Source: https://www.yuque.com/cdek/api2/order-update
- Updated: 2024-06-26T03:25:55.000Z
- Word count: 2240
- Code blocks: 0
- Endpoints: https://api.edu.cdek.ru/v2/orders
- Headings: 请求内容 / 申请返回的数据
- Opening note: 通过该接口可以修改存在的订单
 更改订单的条件是 CDEK 仓库中没有货物移动（即订单状态为“已创建”）
 请求方式 Update-request
 请求内容格式为 JSON (Content-Type: application/json) .
 需要使用 PATCH-请求， 请求URL:
 测试环境
 | ​ https://api.edu.cdek.ru/v2/orders
 |
 正式环境
 | https://api.cdek.ru /v2/orders
 |

### 取消订单
- Slug: order-request-cancel
- Source: https://www.yuque.com/cdek/api2/order-request-cancel
- Updated: 2024-06-26T03:26:15.000Z
- Word count: 752
- Code blocks: 4
- Endpoints: https://api.cdek.ru/v2/orders/{entity_uuid}'; https://api.cdek.ru/v2/orders/{entity_uuid}',
- Headings: 返回的内容
- Opening note: 仅“已办理”状态的订单可以删除，已经入仓过的订单无法通过该接口取消。

### 取件申请
- Slug: aql1bkxggnt0mpvg
- Source: https://www.yuque.com/cdek/api2/aql1bkxggnt0mpvg
- Updated: 2025-09-03T10:03:14.000Z
- Word count: 0
- Code blocks: 0

### 获取快递员上门取件可用日期（针对货到付款）
- Slug: tgfb0hy8qh1gm8vx
- Source: https://www.yuque.com/cdek/api2/tgfb0hy8qh1gm8vx
- Updated: 2025-08-24T03:18:17.000Z
- Word count: 437
- Code blocks: 2
- Endpoints: https://api.cdek.ru/v2/intakes/; https://api.edu.cdek.ru/v2/intakes/
- Opening note: 此方法可让您获取快递员从在线商店仓库取货的日期，该日期为仓库所在地区。
 鉴权方式 bearerAuth
 POST -请求， 请求URL:
 测试环境
 | https://api.edu.cdek.ru/v2/intakes/ availableDays
 |
 正式环境
 | https://api.cdek.ru/v2/intakes/ availableDays
 |

### 注册快递员上门取件申请
- Slug: tzaklkr6vw4rn0xm
- Source: https://www.yuque.com/cdek/api2/tzaklkr6vw4rn0xm
- Updated: 2025-08-14T12:14:06.000Z
- Word count: 1080
- Code blocks: 2
- Endpoints: https://api.cdek.ru/v2/intakes; https://api.edu.cdek.ru/v2/intakes
- Headings: 响应状态码
- Opening note: 该接口用于呼叫快递员从电商仓库上门取货，并送至 CDEK 仓库。
建议：上门时间区间最少为 3 小时。

### 获取申请信息（通过 UUID）
- Slug: xleu2p9amyybzfvc
- Source: https://www.yuque.com/cdek/api2/xleu2p9amyybzfvc
- Updated: 2025-08-14T12:17:17.000Z
- Word count: 307
- Code blocks: 1
- Endpoints: https://api.cdek.ru/v2/intakes/{uuid}; https://api.edu.cdek.ru/v2/intakes/{uuid}
- Headings: 返回的数据
- Opening note: GET -请求， 请求URL:
 测试环境
 | https://api.edu.cdek.ru/v2/intakes/{uuid}
 |
 正式环境
 | https://api.cdek.ru/v2/intakes/{uuid}
 |

### 修改取件申请的状态
- Slug: ex38lg91drsygye9
- Source: https://www.yuque.com/cdek/api2/ex38lg91drsygye9
- Updated: 2025-08-14T11:43:49.000Z
- Word count: 963
- Code blocks: 3
- Opening note: PATCH -请求，请求URL:
 ​ 测试环境

### 删除取件申请
- Slug: cbwrmvx0nc40yfnb
- Source: https://www.yuque.com/cdek/api2/cbwrmvx0nc40yfnb
- Updated: 2025-08-14T06:26:43.000Z
- Word count: 400
- Code blocks: 2
- Endpoints: https://api.cdek.ru/v2/intakes/72753031-0525-4aa4-9629-d6ae52e825f5; https://api.cdek.ru/v2/intakes/{uuid}; https://api.edu.cdek.ru/v2/intakes/{uuid}
- Headings: 响应状态码
- Opening note: 该方法用于删除快递员上门取件的申请。 通过接口集成，可在非最终状态的任何状态下删除申请。
 授权方式： bearerAuth
 测试环境
 | https://api.edu.cdek.ru/v2/intakes/{uuid}
 |
 正式环境
 | https://api.cdek.ru/v2/intakes/{uuid}
 |

### 申请生成面单
- Slug: barcode-create
- Source: https://www.yuque.com/cdek/api2/barcode-create
- Updated: 2024-06-26T03:26:27.000Z
- Word count: 397
- Code blocks: 2
- Headings: 请求参数 / 请求内容 / 返回内容
- Opening note: 通过该接口可以申请生成面单

### 获取面单
- Slug: barcode_receive
- Source: https://www.yuque.com/cdek/api2/barcode_receive
- Updated: 2024-06-26T03:26:39.000Z
- Word count: 752
- Code blocks: 1
- Endpoints: http://api.cdek.ru/v2/print/barcodes/72753034-c617-46ef-b70a-8f5f520b6be4.pdf",; https://api.cdek.ru/v2/print/barcodes/{uuid}; https://api.cdek.ru/v2/print/barcodes/{uuid}.pdf; https://api.edu.cdek.ru/v2/print/barcodes/{uuid}
- Headings: 下单请求 / 返回内容 / 状态编码 / 返回内容例子
- Opening note: 通过该接口可以获取已经生成好的面单

### 按照费率代码获取运费
- Slug: tariff_code_calc
- Source: https://www.yuque.com/cdek/api2/tariff_code_calc
- Updated: 2025-01-08T10:00:15.000Z
- Word count: 573
- Code blocks: 2
- Endpoints: https://api.cdek.ru/v2/calculator/tariff; https://api.edu.cdek.ru/v2/calculator/tariff
- Opening note: POST请求， 请求URL
 测试环境
 | https://api.edu.cdek.ru/v2/calculator/tariff
 |
 正式环境
 | https://api.cdek.ru/v2/calculator/tariff
 |

### 获取可以使用的服务列表
- Slug: available_tariff
- Source: https://www.yuque.com/cdek/api2/available_tariff
- Updated: 2025-01-08T09:22:59.000Z
- Word count: 979
- Code blocks: 2
- Endpoints: https://api.cdek.ru/v2/calculator/tarifflist; https://api.edu.cdek.ru/v2/calculator/tarifflist
- Opening note: POST请求， 请求URL
 测试环境
 | https://api.edu.cdek.ru/v2/calculator/tarifflist
 |
 正式环境
 | https://api.cdek.ru/v2/calculator/tarifflist
 |

### 获取城市列表
- Slug: cities
- Source: https://www.yuque.com/cdek/api2/cities
- Updated: 2025-02-19T09:34:05.000Z
- Word count: 347
- Code blocks: 1
- Endpoints: https://api.cdek.ru/v2/location/cities?postal_code=198261&lang=zho; https://api.edu.cdek.ru/v2/location/cities
- Opening note: GET请求， 请求URL
 测试环境
 | https://api.edu.cdek.ru/v2/location/cities
 |
 正式环境
 | https://api .cdek.ru/v2/ location/cities
 |

### 获取服务网点列表
- Slug: pick-up-points
- Source: https://www.yuque.com/cdek/api2/pick-up-points
- Updated: 2024-12-26T09:05:19.000Z
- Word count: 698
- Code blocks: 0
- Endpoints: https://api.cdek.ru/v2/deliverypoints?city_code=44&weight_max=50&allowed_cod=1; https://api.edu.cdek.ru/v2/deliverypoints
- Opening note: GET请求， 请求URL
 测试环境
 | https://api.edu.cdek.ru/v2/deliverypoints
 |
 正式环境
 | https://api .cdek.ru/v2/deliverypoints
 |

### 查看轨迹
- Slug: tracing
- Source: https://www.yuque.com/cdek/api2/tracing
- Updated: 2025-08-01T02:32:29.000Z
- Word count: 1909
- Code blocks: 5
- Opening note: 第一步：验证
 POST请求， 请求URL
 正式环境
 | https://auth.api.cdek.ru/web/simpleauth/authorize
 |

### 轨迹列表
- Slug: statuses
- Source: https://www.yuque.com/cdek/api2/statuses
- Updated: 2025-08-01T05:33:40.000Z
- Word count: 537
- Code blocks: 0
- Opening note: ​ 轨迹代码
 | 轨迹俄文名称
 | 轨迹中文名称
 |
 CREATED
 | Создан
 | 已创建
 |
 ACCEPTED_FOR_DELIVERY
 | Принят на доставку
 | 接受来交付
 |
 ACCEPTED_AT_SORTING_CENTER
 | Прибыл в сортировочный центр
 | 达到分拣中心
 |
 ACCEPTED_AT_COURIER_POINT
 | Прибыл в пункт доставки
 | 达到交付点
 |
 SENT_TO_RECEIVER_COUNTRY
 | Отправлен в страну назначения
 | 送到目的国
 |
 SENT_TO_NEXT_CITY
 | Отправлен в 

### 服务列表
- Slug: tariff_codes
- Source: https://www.yuque.com/cdek/api2/tariff_codes
- Updated: 2026-01-19T02:07:52.000Z
- Word count: 649
- Code blocks: 0
- Opening note: 服务代码
 | 服务俄文名称
 | 服务中文名称
 | 服务模式
 | 重量限制
 | 服务类型
 |
 62
 | Магистральный экспресс
 | 干线
 | Склад-склад 库到库
 | 无
 | 派送
 |
 121
 | Дверь-дверь 门到门
 |
 122
 | Склад-дверь 库到门
 |
 123
 | Дверь-склад 门到库
 |
 136
 | Посылка Parcel
 | 快件
 | Склад-склад 库到库
 | 50公斤以下
 | 电商
 |
 137
 | Склад-дверь 库到门
 |
 138
 | Дверь-склад 门到库
 |
 139
 | Дверь-дверь 门到门
 |
 184
 | E-

### 货币列表
- Slug: currency
- Source: https://www.yuque.com/cdek/api2/currency
- Updated: 2025-08-01T03:27:38.000Z
- Word count: 200
- Code blocks: 0
- Opening note: 货币编号
 | 货币名称
 | 货币代码
 |
 1
 | 🇷🇺 俄罗斯卢布
 | RUB
 |
 2
 | 🇰🇿 哈萨克斯坦坚戈
 | KZT
 |
 3
 | 🇺🇸 美元
 | USD
 |
 4
 | 🇪🇺 欧元
 | EUR
 |
 5
 | 🇬🇧 英镑
 | GBP
 |
 6
 | 🇨🇳 中国人民币
 | CNY
 |
 7
 | 🇧🇾 白俄罗斯卢布
 | BYR
 |
 8
 | 🇺🇦 乌克兰格里夫纳
 | UAH
 |
 9
 | 🇰🇬 吉尔吉斯斯坦索姆
 | KGS
 |
 10
 | 🇦🇲 亚美尼亚德拉姆
 | AMD
 |
 11
 | 🇹🇷 土耳其里拉
 | TRY
 |
 12
 | 🇹🇭 泰铢
 | THB
 |
 13
 | 🇰🇷

### 运输模式列表
- Slug: delivery_modes
- Source: https://www.yuque.com/cdek/api2/delivery_modes
- Updated: 2025-08-01T03:27:48.000Z
- Word count: 58
- Code blocks: 0
- Opening note: 运输模式代码
 | 运输模式
 |
 1
 | 门到门
 |
 2
 | 门到库
 |
 3
 | 库到门
 |
 4
 | 库到库
 |
 6
 | 门到快递柜
 |
 7
 | 库到快递柜
 |
 8
 | 快递柜到门
 |
 9
 | 快递柜到库
 |
 10
 | 快递柜到快递柜
 |

