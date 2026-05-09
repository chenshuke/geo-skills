---
name: geo-video
description: GEO平台视频管理技能，支持查询视频列表和从OEM导入视频
version: v1.0
date: 2026-04-15
---

# GEO 视频管理技能

GEO平台视频管理接口，提供视频列表查询和从OEM渠道批量导入视频的能力。

## 使用场景

- **视频资产盘点**：分页查询已导入的视频列表，了解当前视频资源概况
- **批量导入视频**：从OEM平台批量拉取指定视频ID到GEO平台进行管理
- **视频同步检查**：导入后通过列表接口验证视频是否成功入库

## API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| GET | /v1/video | 查询视频列表 | page, limit |
| POST | /v1/video/import | 从OEM导入视频 | source, videoIds |

## curl 示例

```bash
# 查询视频列表
curl -X GET "https://nbgeo.aimusiclj.com/v1/video?page=1&limit=10" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 导入视频
curl -X POST "https://nbgeo.aimusiclj.com/v1/video/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -d '{"source":"oem", "videoIds":["id1","id2"]}'
```

## 请求参数说明

### GET /v1/video — 查询视频列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| limit | int | 否 | 每页条数，默认10 |

### POST /v1/video/import — 导入视频

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source | string | 是 | 导入来源，当前固定为 `oem` |
| videoIds | string[] | 是 | OEM平台视频ID数组，支持批量导入 |

## 响应格式说明

### 查询视频列表响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "视频唯一ID",
        "title": "视频标题",
        "status": "视频状态",
        "createdAt": "创建时间",
        "source": "来源渠道"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### 导入视频响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "successCount": 2,
    "failCount": 0,
    "failedIds": []
  }
}
```

## 执行步骤

1. **读取认证配置**：从 `geo-config/geo-config.json` 获取 `openKey`
2. **构建请求头**：设置 `Authorization: Bearer ${openKey}` 和 `Referer: https://geo.bihuoai.com/`
3. **发起API调用**：根据操作类型选择对应接口
   - 查询列表：GET `/v1/video?page=&limit=`
   - 导入视频：POST `/v1/video/import`，Body 传入 JSON
4. **处理响应**：检查 `code` 字段是否为 200，解析 `data` 内容
5. **结果反馈**：返回视频列表或导入结果摘要

## 错误处理

| HTTP 状态码 | 错误码 | 说明 | 处理方式 |
|-------------|--------|------|----------|
| 401 | 401 | 认证失败，openKey 无效或过期 | 检查 `geo-config.json` 中的 openKey 配置 |
| 400 | 400 | 请求参数错误 | 检查 page/limit 是否为正整数，videoIds 是否为非空数组 |
| 404 | 404 | 接口不存在 | 确认 API 路径拼写正确 |
| 429 | 429 | 请求频率超限 | 等待后重试，建议间隔 1 秒以上 |
| 500 | 500 | 服务端内部错误 | 稍后重试，若持续出现需联系平台运维 |

## 注意事项

- 批量导入时 `videoIds` 数组不宜过大，建议单次不超过 50 个ID，避免超时
- 导入操作为异步处理，导入后需等待片刻再查询列表确认结果
- `page` 和 `limit` 参数需为正整数，`limit` 上限取决于服务端配置
- 所有接口均需携带统一认证请求头，缺失将返回 401

## 配置

所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：
  - Authorization: Bearer ${openKey}
  - Referer: https://geo.bihuoai.com/
- Base URL: https://nbgeo.aimusiclj.com
