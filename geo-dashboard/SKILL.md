---
name: geo-dashboard
description: GEO平台数据总览技能，用于获取主题/文章/发布/收录的周统计数据
version: v1.0
date: 2026-04-15
---

# GEO 数据总览（geo-dashboard）

## 技能说明

该技能用于从 GEO 平台获取数据总览信息，包括主题数量、文章数量、发布数量、收录数量等周统计数据。帮助用户快速了解平台运营状况和内容增长趋势。

## 使用场景

- 查看本周平台数据汇总
- 监控主题、文章、发布、收录的周统计趋势
- 辅助运营决策和数据汇报

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/dashboard/summary | 数据总览，返回主题/文章/发布/收录的周统计数据 |

### curl 示例

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/dashboard/summary" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

## 请求参数说明

该接口无需请求参数，仅需携带认证请求头即可。

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| — | — | — | — | 无额外参数 |

## 响应格式说明

成功响应（HTTP 200）示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "topicCount": 120,
    "articleCount": 580,
    "publishCount": 420,
    "indexCount": 350,
    "weeklyData": [
      {
        "date": "2026-04-09",
        "topicCount": 15,
        "articleCount": 72,
        "publishCount": 58,
        "indexCount": 40
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码，200 表示成功 |
| message | string | 响应消息 |
| data.topicCount | int | 主题总数 |
| data.articleCount | int | 文章总数 |
| data.publishCount | int | 发布总数 |
| data.indexCount | int | 收录总数 |
| data.weeklyData | array | 周统计数据列表 |
| weeklyData[].date | string | 统计日期 |
| weeklyData[].topicCount | int | 当日新增主题数 |
| weeklyData[].articleCount | int | 当日新增文章数 |
| weeklyData[].publishCount | int | 当日新增发布数 |
| weeklyData[].indexCount | int | 当日新增收录数 |

## 执行步骤

1. 从 `geo-config/geo-config.json` 读取 `openKey`
2. 构造 GET 请求，目标路径 `/v1/dashboard/summary`
3. 设置统一请求头（Authorization、Referer）
4. 发送请求并解析响应
5. 提取并展示关键统计数据（主题数、文章数、发布数、收录数及周趋势）

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 401 | 认证失败，openKey 无效或已过期 | 检查 geo-config.json 中的 openKey 是否正确 |
| 403 | 无权限访问该接口 | 确认账户是否拥有数据总览权限 |
| 429 | 请求频率超限 | 稍后重试，建议间隔 1 秒以上 |
| 500 | 服务器内部错误 | 联系平台管理员排查 |

## 注意事项

- 该接口返回的是周统计数据，数据更新频率以平台实际为准
- 建议在运营日报/周报场景中调用此接口获取汇总数据
- 如需更细粒度的数据，请参考其他技能接口

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：
  - Authorization: Bearer ${openKey}
  - Referer: https://geo.bihuoai.com/
- Base URL: https://nbgeo.aimusiclj.com
