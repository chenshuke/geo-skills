---
name: geo-report
description: GEO平台售后报告技能，支持报告列表查询、详情获取和报告生成
version: v1.0
date: 2026-04-15
---

# GEO 售后报告技能

GEO平台售后报告管理接口，提供报告列表查询、报告详情获取（含收录统计、竞争对手分析、情感分析）以及按需生成新报告的能力。

## 使用场景

- **定期报告查看**：按公司维度分页查询历史报告列表，追踪售后服务效果
- **报告详情分析**：获取单份报告的完整内容，包括收录统计、竞争对手分析、情感分析等深度数据
- **按需生成报告**：指定公司和日期范围，触发系统生成新的售后分析报告

## API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| GET | /v1/report | 获取报告列表 | page, limit, companyId |
| GET | /v1/report/{id} | 获取报告详情 | id（路径参数）；返回含收录统计、竞争对手分析、情感分析 |
| POST | /v1/report/generate | 生成报告 | companyId, dateRange |

## curl 示例

```bash
# 获取报告列表
curl -X GET "https://nbgeo.aimusiclj.com/v1/report?page=1&limit=10&companyId=36" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 获取报告详情
curl -X GET "https://nbgeo.aimusiclj.com/v1/report/123" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 生成报告
curl -X POST "https://nbgeo.aimusiclj.com/v1/report/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -d '{"companyId":36, "dateRange":{"start":"2026-01-01","end":"2026-04-15"}}'
```

## 请求参数说明

### GET /v1/report — 获取报告列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| limit | int | 否 | 每页条数，默认10 |
| companyId | int | 是 | 公司ID，筛选指定公司的报告 |

### GET /v1/report/{id} — 获取报告详情

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 报告ID，路径参数 |

### POST /v1/report/generate — 生成报告

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| companyId | int | 是 | 公司ID，指定为哪家公司生成报告 |
| dateRange | object | 是 | 日期范围对象 |
| dateRange.start | string | 是 | 起始日期，格式 `YYYY-MM-DD` |
| dateRange.end | string | 是 | 结束日期，格式 `YYYY-MM-DD` |

## 响应格式说明

### 报告列表响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 123,
        "companyId": 36,
        "companyName": "示例公司",
        "dateRange": {
          "start": "2026-01-01",
          "end": "2026-04-15"
        },
        "status": "completed",
        "createdAt": "2026-04-15 10:00:00"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

### 报告详情响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 123,
    "companyId": 36,
    "companyName": "示例公司",
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-04-15"
    },
    "status": "completed",
    "indexStats": {
      "totalIndexed": 1500,
      "growthRate": "12.5%"
    },
    "competitorAnalysis": [
      {
        "name": "竞品A",
        "marketShare": "15%"
      }
    ],
    "sentimentAnalysis": {
      "positive": 60,
      "neutral": 30,
      "negative": 10
    },
    "createdAt": "2026-04-15 10:00:00"
  }
}
```

### 生成报告响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "reportId": 124,
    "status": "processing",
    "message": "报告生成中，请稍后查询"
  }
}
```

## 执行步骤

1. **读取认证配置**：从 `geo-config/geo-config.json` 获取 `openKey`
2. **构建请求头**：设置 `Authorization: Bearer ${openKey}` 和 `Referer: https://geo.bihuoai.com/`
3. **发起API调用**：根据操作类型选择对应接口
   - 查询列表：GET `/v1/report?page=&limit=&companyId=`
   - 查询详情：GET `/v1/report/{id}`
   - 生成报告：POST `/v1/report/generate`，Body 传入 JSON
4. **处理响应**：检查 `code` 字段是否为 200，解析 `data` 内容
5. **生成报告后轮询**：若返回 `status: processing`，需间隔 5-10 秒后通过详情接口查询，直至 `status` 变为 `completed`
6. **结果反馈**：返回报告数据或生成状态摘要

## 错误处理

| HTTP 状态码 | 错误码 | 说明 | 处理方式 |
|-------------|--------|------|----------|
| 401 | 401 | 认证失败，openKey 无效或过期 | 检查 `geo-config.json` 中的 openKey 配置 |
| 400 | 400 | 请求参数错误 | 检查 companyId 是否有效，dateRange 格式是否正确 |
| 404 | 404 | 报告或接口不存在 | 确认报告ID正确，接口路径拼写无误 |
| 409 | 409 | 报告已存在或正在生成中 | 查询已有报告列表，避免重复生成 |
| 429 | 429 | 请求频率超限 | 等待后重试，建议间隔 1 秒以上 |
| 500 | 500 | 服务端内部错误 | 稍后重试，若持续出现需联系平台运维 |

## 注意事项

- `companyId` 为必填参数，需提前确认目标公司的正确ID
- 生成报告为异步操作，返回后需通过详情接口轮询状态，建议轮询间隔不短于 5 秒
- `dateRange` 起始日期不可晚于结束日期，且范围不宜过大（建议不超过 90 天）
- 报告详情中的收录统计、竞争对手分析、情感分析为平台预计算结果，生成完成后数据即固定
- 同一公司同一日期范围请勿重复提交生成请求，以免造成资源浪费

## 配置

所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：
  - Authorization: Bearer ${openKey}
  - Referer: https://geo.bihuoai.com/
- Base URL: https://nbgeo.aimusiclj.com
