---
name: geo-package
description: GEO平台套餐管理技能，用于获取套餐列表、用户当前套餐、SKU列表及SKU详情
version: v1.0
date: 2026-04-15
---

# GEO 套餐管理（geo-package）

## 技能说明

该技能用于管理 GEO 平台的套餐（Package）和 SKU 信息，支持查询套餐列表、用户当前套餐、SKU 列表及 SKU 详情。帮助用户了解平台提供的套餐方案及资源配额。

## 使用场景

- 浏览平台所有可用套餐及其定价信息
- 查询当前账户已开通的套餐及剩余配额
- 查看某个套餐下的 SKU（规格）详情
- 辅助套餐选购和升级决策

## API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| GET | /v1/package | 获取套餐列表 | page, limit |
| GET | /v1/package/user | 获取用户当前套餐 | — |
| GET | /v1/sku | 获取SKU列表 | page, limit, packageId |
| GET | /v1/sku/{id} | 获取SKU详情 | id（路径参数） |

### curl 示例

```bash
# 获取套餐列表
curl -X GET "https://nbgeo.aimusiclj.com/v1/package?page=1&limit=10" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 获取用户当前套餐
curl -X GET "https://nbgeo.aimusiclj.com/v1/package/user" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 获取SKU列表
curl -X GET "https://nbgeo.aimusiclj.com/v1/sku?page=1&limit=10&packageId=1" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 获取SKU详情
curl -X GET "https://nbgeo.aimusiclj.com/v1/sku/1" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

## 请求参数说明

### 获取套餐列表 - GET /v1/package

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | int | 否 | 页码，默认 1 |
| limit | query | int | 否 | 每页数量，默认 10 |

### 获取用户当前套餐 - GET /v1/package/user

无需额外参数。

### 获取SKU列表 - GET /v1/sku

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | int | 否 | 页码，默认 1 |
| limit | query | int | 否 | 每页数量，默认 10 |
| packageId | query | int | 否 | 按套餐ID筛选SKU |

### 获取SKU详情 - GET /v1/sku/{id}

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | path | int | 是 | SKU的唯一标识 |

## 响应格式说明

### 获取套餐列表响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "基础版",
        "description": "适合个人用户入门使用",
        "price": 0,
        "status": 1
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 10
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list | array | 套餐列表 |
| list[].id | int | 套餐ID |
| list[].name | string | 套餐名称 |
| list[].description | string | 套餐描述 |
| list[].price | number | 套餐价格 |
| list[].status | int | 套餐状态（1-启用，0-停用） |
| data.total | int | 总记录数 |
| data.page | int | 当前页码 |
| data.limit | int | 每页数量 |

### 获取用户当前套餐响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "packageId": 1,
    "packageName": "基础版",
    "expireTime": "2026-12-31 23:59:59",
    "topicQuota": 100,
    "topicUsed": 45,
    "articleQuota": 500,
    "articleUsed": 230
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| data.packageId | int | 当前套餐ID |
| data.packageName | string | 当前套餐名称 |
| data.expireTime | string | 套餐到期时间 |
| data.topicQuota | int | 主题配额总量 |
| data.topicUsed | int | 主题已使用量 |
| data.articleQuota | int | 文章配额总量 |
| data.articleUsed | int | 文章已使用量 |

### 获取SKU列表响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "packageId": 1,
        "name": "基础版-月付",
        "price": 29.9,
        "duration": 30,
        "durationUnit": "day",
        "status": 1
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list | array | SKU列表 |
| list[].id | int | SKU ID |
| list[].packageId | int | 所属套餐ID |
| list[].name | string | SKU名称 |
| list[].price | number | SKU价格 |
| list[].duration | int | 有效时长 |
| list[].durationUnit | string | 时长单位（day/month/year） |
| list[].status | int | SKU状态（1-上架，0-下架） |

### 获取SKU详情响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "packageId": 1,
    "name": "基础版-月付",
    "price": 29.9,
    "duration": 30,
    "durationUnit": "day",
    "topicQuota": 100,
    "articleQuota": 500,
    "description": "基础版套餐月付方案，适合个人用户",
    "status": 1,
    "features": ["基础功能", "邮件支持"]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| data.id | int | SKU ID |
| data.packageId | int | 所属套餐ID |
| data.name | string | SKU名称 |
| data.price | number | SKU价格 |
| data.duration | int | 有效时长 |
| data.durationUnit | string | 时长单位 |
| data.topicQuota | int | 主题配额 |
| data.articleQuota | int | 文章配额 |
| data.description | string | SKU详细描述 |
| data.status | int | 状态 |
| data.features | array | 功能特性列表 |

## 执行步骤

1. 从 `geo-config/geo-config.json` 读取 `openKey`
2. 根据需求选择对应接口：
   - 查看所有套餐 → 调用 `GET /v1/package`
   - 查看当前套餐 → 调用 `GET /v1/package/user`
   - 查看某套餐的SKU → 调用 `GET /v1/sku?packageId={id}`
   - 查看SKU详情 → 调用 `GET /v1/sku/{id}`
3. 设置统一请求头（Authorization、Referer）
4. 拼接查询参数（page、limit、packageId 等）
5. 发送请求并解析响应
6. 格式化输出套餐/SKU信息，重点展示价格、配额、有效期等关键信息

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 401 | 认证失败，openKey 无效或已过期 | 检查 geo-config.json 中的 openKey 是否正确 |
| 403 | 无权限访问该接口 | 确认账户权限 |
| 404 | 资源不存在（如SKU ID无效） | 检查传入的ID参数是否正确 |
| 422 | 参数校验失败 | 检查查询参数类型和范围 |
| 429 | 请求频率超限 | 稍后重试，建议间隔 1 秒以上 |
| 500 | 服务器内部错误 | 联系平台管理员排查 |

## 注意事项

- 套餐列表支持分页，建议使用合理的 `limit` 值避免一次请求返回过多数据
- `packageId` 为可选筛选参数，不传则返回所有SKU
- 用户当前套餐接口无需参数，直接调用即可获取账户当前开通的套餐信息
- 套餐配额使用量可帮助判断是否需要升级套餐
- SKU 为套餐的具体售卖规格，一个套餐可对应多个 SKU（如月付、季付、年付）

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：
  - Authorization: Bearer ${openKey}
  - Referer: https://geo.bihuoai.com/
- Base URL: https://nbgeo.aimusiclj.com
