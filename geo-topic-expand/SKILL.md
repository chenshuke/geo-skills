---
name: geo-topic-expand
description: GEO平台主题拓展技能，支持创建关键词拓展任务、管理L1/L2/L3三级拓展阶段、选择并执行多层级主题拓展等操作。
version: v1.0
date: 2026-04-15
---

# GEO 主题拓展技能

## 技能说明

本技能封装了 GEO 平台「主题拓展」模块的完整 API，可用于对关键词进行多层级主题拓展。核心能力包括：创建拓展任务、查看任务状态、编辑 L1 阶段输出、执行 L2 拓展、选择 L2 并执行 L3 拓展。

## 使用场景

- 为客户或项目进行关键词主题拓展，发现更多相关搜索意图
- 分阶段（L1→L2→L3）逐步细化拓展主题
- 编辑和优化 L1 阶段的初始拓展结果
- 选择有价值的 L2 主题进行 L3 深度拓展
- 查询拓展任务的完整执行状态和结果

---

## 配置

所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：
  - Authorization: Bearer ${openKey}
  - Referer: https://geo.bihuoai.com/
- Base URL: https://nbgeo.aimusiclj.com

---

## API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| POST | /v1/topic-expand | 创建拓展任务 | keywords, companyId |
| GET | /v1/topic-expand | 获取拓展任务列表 | page, limit, status |
| GET | /v1/topic-expand/{id} | 获取任务详情 | id（路径参数） |
| PATCH | /v1/topic-expand/{id}/l1 | 更新L1阶段输出 | id, l1Result |
| POST | /v1/topic-expand/{id}/expand-l2 | 执行L2拓展 | id |
| POST | /v1/topic-expand/{id}/select-l2 | 选择L2并执行L3拓展 | id, selectedL2Ids |

---

## 接口详细说明与 curl 示例

### 1. 创建拓展任务

**POST** `/v1/topic-expand`

创建一个新的主题拓展任务，传入关键词列表和关联的公司 ID。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keywords | string[] | 是 | 待拓展的关键词列表 |
| companyId | string | 否 | 关联的公司/客户 ID |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/topic-expand" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["AI客服", "智能营销", "数据分析"],
    "companyId": "company_001"
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "expand_xyz789",
    "keywords": ["AI客服", "智能营销", "数据分析"],
    "companyId": "company_001",
    "status": "l1_processing",
    "createdAt": "2026-04-15T12:00:00Z"
  }
}
```

---

### 2. 获取拓展任务列表

**GET** `/v1/topic-expand`

分页查询主题拓展任务列表，支持按状态筛选。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 10 |
| status | string | 否 | 任务状态筛选（如 l1_processing, l1_completed, l2_processing, l2_completed, l3_processing, completed, failed） |

**curl 示例：**

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/topic-expand?page=1&limit=10&status=l1_completed" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "list": [
      {
        "id": "expand_xyz789",
        "keywords": ["AI客服", "智能营销", "数据分析"],
        "status": "l1_completed",
        "createdAt": "2026-04-15T12:00:00Z"
      }
    ]
  }
}
```

---

### 3. 获取任务详情

**GET** `/v1/topic-expand/{id}`

根据任务 ID 获取拓展任务的详细信息，包括各阶段（L1/L2/L3）的拓展结果。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |

**curl 示例：**

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/topic-expand/expand_xyz789" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "expand_xyz789",
    "keywords": ["AI客服", "智能营销", "数据分析"],
    "companyId": "company_001",
    "status": "l1_completed",
    "l1Result": [
      { "id": "l1_001", "topic": "AI客服系统选型指南", "searchVolume": 1200 },
      { "id": "l1_002", "topic": "智能营销自动化工具", "searchVolume": 850 }
    ],
    "l2Result": null,
    "l3Result": null,
    "createdAt": "2026-04-15T12:00:00Z",
    "updatedAt": "2026-04-15T12:30:00Z"
  }
}
```

---

### 4. 更新L1阶段输出

**PATCH** `/v1/topic-expand/{id}/l1`

编辑和更新 L1 阶段的拓展结果，可增删改主题内容。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| l1Result | array | 是 | 更新后的 L1 阶段结果列表 |

**curl 示例：**

```bash
curl -X PATCH "https://nbgeo.aimusiclj.com/v1/topic-expand/expand_xyz789/l1" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "l1Result": [
      { "id": "l1_001", "topic": "AI客服系统选型指南（2026版）", "searchVolume": 1200 },
      { "id": "l1_002", "topic": "智能营销自动化工具对比", "searchVolume": 850 },
      { "id": "l1_new", "topic": "数据分析平台推荐", "searchVolume": 600 }
    ]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "expand_xyz789",
    "l1Result": [
      { "id": "l1_001", "topic": "AI客服系统选型指南（2026版）", "searchVolume": 1200 },
      { "id": "l1_002", "topic": "智能营销自动化工具对比", "searchVolume": 850 },
      { "id": "l1_new", "topic": "数据分析平台推荐", "searchVolume": 600 }
    ]
  }
}
```

---

### 5. 执行L2拓展

**POST** `/v1/topic-expand/{id}/expand-l2`

基于当前的 L1 阶段结果，执行 L2 级别的深度拓展。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/topic-expand/expand_xyz789/expand-l2" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "expand_xyz789",
    "status": "l2_processing",
    "message": "L2拓展任务已启动"
  }
}
```

---

### 6. 选择L2并执行L3拓展

**POST** `/v1/topic-expand/{id}/select-l2`

从 L2 拓展结果中选择有价值的主题，执行 L3 级别的最终拓展。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| selectedL2Ids | string[] | 是 | 选中的 L2 主题 ID 列表 |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/topic-expand/expand_xyz789/select-l2" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "selectedL2Ids": ["l2_001", "l2_003", "l2_005"]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "expand_xyz789",
    "status": "l3_processing",
    "selectedL2Ids": ["l2_001", "l2_003", "l2_005"],
    "message": "已选择3个L2主题，L3拓展任务已启动"
  }
}
```

---

## 执行步骤（完整工作流）

以下是使用主题拓展技能的完整操作流程：

### Step 1：读取认证配置

从 `geo-config/geo-config.json` 读取 `openKey`，构建统一请求头。

### Step 2：创建拓展任务

调用 `POST /v1/topic-expand`，传入关键词列表和可选的 `companyId`。记录返回的任务 ID。

### Step 3：等待 L1 拓展完成

轮询调用 `GET /v1/topic-expand/{id}` 查看任务状态，直到状态变为 `l1_completed`。建议轮询间隔 5-10 秒。

### Step 4：查看并编辑 L1 结果

查看任务详情中的 `l1Result` 字段。如需调整主题内容（修改、新增或删除），调用 `PATCH /v1/topic-expand/{id}/l1` 更新 L1 结果。

### Step 5：执行 L2 拓展

确认 L1 结果无误后，调用 `POST /v1/topic-expand/{id}/expand-l2` 触发 L2 深度拓展。

### Step 6：等待 L2 拓展完成

继续轮询任务状态，直到状态变为 `l2_completed`。

### Step 7：选择 L2 主题并执行 L3 拓展

查看 `l2Result`，评估各主题价值后，选择有价值的 L2 主题 ID 列表，调用 `POST /v1/topic-expand/{id}/select-l2` 执行 L3 拓展。

### Step 8：查看最终结果

轮询等待任务状态变为 `completed`，获取完整的 L1/L2/L3 三级拓展结果。

---

## 错误处理

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查必填参数是否缺失或格式是否正确；`selectedL2Ids` 中的 ID 需在 L2 结果中存在 |
| 401 | 认证失败 | 检查 `geo-config.json` 中的 `openKey` 是否有效 |
| 404 | 任务不存在 | 确认任务 ID 是否正确，任务是否已被删除 |
| 409 | 状态冲突（如在 L1 处理中执行 L2） | 检查当前任务阶段状态，确保操作顺序正确 |
| 429 | 请求频率超限 | 降低请求频率，适当增加轮询间隔 |
| 500 | 服务器内部错误 | 稍后重试，如持续出现请联系平台方 |

**通用错误响应格式：**

```json
{
  "code": 400,
  "message": "参数错误：keywords 不能为空",
  "data": null
}
```

---

## 注意事项

1. **认证安全**：`openKey` 为敏感信息，请勿硬编码在代码中，务必通过 `geo-config.json` 统一管理。
2. **阶段顺序**：拓展任务必须按 L1 → L2 → L3 的顺序执行，不可跳过阶段。
3. **L1 编辑时机**：L1 结果仅在 L1 阶段完成后、L2 拓展启动前可编辑。L2 启动后无法再修改 L1。
4. **L2 选择数量**：`selectedL2Ids` 建议选择 3-10 个主题，过多可能导致 L3 拓展时间过长。
5. **请求频率**：批量操作时注意控制请求频率，建议每次请求间隔 ≥ 200ms。
6. **超时处理**：每阶段拓展可能需要较长时间（尤其 L3），建议使用轮询方式检查状态，轮询间隔建议 5-10 秒。
7. **关键词数量**：单次创建任务的关键词数量建议不超过 20 个，过多可能导致 L1 处理超时。
8. **幂等性**：创建任务接口非幂等，避免重复提交相同参数的创建请求。但 L2/L3 拓展接口在相同状态下重复调用通常安全（服务端会返回当前状态）。
