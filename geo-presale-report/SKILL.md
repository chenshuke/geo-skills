---
name: geo-presale-report
description: GEO平台售前诊断技能，支持创建售前诊断任务、管理搜索意图、管理收录任务、确认任务等全流程操作。
version: v1.0
date: 2026-04-15
---

# GEO 售前诊断技能

## 技能说明

本技能封装了 GEO 平台「售前诊断」模块的完整 API，可用于为客户生成 GEO 诊断报告。核心能力包括：创建诊断任务、查看任务状态、编辑搜索意图主题、管理 AI 索引收录任务、最终确认并提交任务。

## 使用场景

- 为新客户创建 GEO 售前诊断报告
- 查询诊断任务列表及执行状态
- 编辑或调整诊断任务中的搜索意图
- 管理收录任务（添加/删除/排除）
- 确认诊断任务，选择不同的确认模式

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
| POST | /v1/pre-sale-report | 创建售前诊断任务 | companyName, keywords |
| GET | /v1/pre-sale-report | 获取任务列表 | page, limit, status |
| GET | /v1/pre-sale-report/{id} | 获取任务详情 | id（路径参数） |
| PATCH | /v1/pre-sale-report/{id}/topics | 更新搜索意图 | id, topics |
| PATCH | /v1/pre-sale-report/{id}/omit-indexing | 排除AI索引任务 | id, indexingIds |
| POST | /v1/pre-sale-report/{id}/add-indexing-tasks | 添加收录任务 | id, tasks |
| POST | /v1/pre-sale-report/{id}/delete-indexing-tasks | 删除收录任务 | id, indexingIds |
| POST | /v1/pre-sale-report/{id}/confirm | 确认任务（模式1/2） | id, mode（1或2） |

---

## 接口详细说明与 curl 示例

### 1. 创建售前诊断任务

**POST** `/v1/pre-sale-report`

创建一个新的售前诊断任务，传入公司名称和关键词列表。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| companyName | string | 是 | 客户公司名称 |
| keywords | string[] | 是 | 诊断关键词列表 |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/pre-sale-report" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "某某科技有限公司",
    "keywords": ["AI客服", "智能营销", "数据分析平台"]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "companyName": "某某科技有限公司",
    "keywords": ["AI客服", "智能营销", "数据分析平台"],
    "status": "pending",
    "createdAt": "2026-04-15T12:00:00Z"
  }
}
```

---

### 2. 获取任务列表

**GET** `/v1/pre-sale-report`

分页查询售前诊断任务列表，支持按状态筛选。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 10 |
| status | string | 否 | 任务状态筛选（如 pending, processing, completed, failed） |

**curl 示例：**

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/pre-sale-report?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "list": [
      {
        "id": "task_abc123",
        "companyName": "某某科技有限公司",
        "status": "completed",
        "createdAt": "2026-04-15T12:00:00Z"
      }
    ]
  }
}
```

---

### 3. 获取任务详情

**GET** `/v1/pre-sale-report/{id}`

根据任务 ID 获取诊断任务的详细信息，包括搜索意图、收录任务等。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |

**curl 示例：**

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/pre-sale-report/task_abc123" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "companyName": "某某科技有限公司",
    "keywords": ["AI客服", "智能营销", "数据分析平台"],
    "status": "completed",
    "topics": [
      { "id": "t1", "name": "AI客服解决方案", "intent": "purchase" }
    ],
    "indexingTasks": [
      { "id": "idx1", "url": "https://example.com/ai-customer-service", "status": "indexed" }
    ],
    "createdAt": "2026-04-15T12:00:00Z",
    "updatedAt": "2026-04-15T14:30:00Z"
  }
}
```

---

### 4. 更新搜索意图

**PATCH** `/v1/pre-sale-report/{id}/topics`

更新诊断任务中的搜索意图（topics）信息。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| topics | array | 是 | 更新后的搜索意图列表 |

**curl 示例：**

```bash
curl -X PATCH "https://nbgeo.aimusiclj.com/v1/pre-sale-report/task_abc123/topics" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "topics": [
      { "id": "t1", "name": "AI客服解决方案", "intent": "comparison" },
      { "id": "t2", "name": "智能营销工具推荐", "intent": "purchase" }
    ]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "topics": [
      { "id": "t1", "name": "AI客服解决方案", "intent": "comparison" },
      { "id": "t2", "name": "智能营销工具推荐", "intent": "purchase" }
    ]
  }
}
```

---

### 5. 排除AI索引任务

**PATCH** `/v1/pre-sale-report/{id}/omit-indexing`

将指定的收录任务标记为排除，不再纳入 AI 索引范围。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| indexingIds | string[] | 是 | 要排除的收录任务 ID 列表 |

**curl 示例：**

```bash
curl -X PATCH "https://nbgeo.aimusiclj.com/v1/pre-sale-report/task_abc123/omit-indexing" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "indexingIds": ["idx1", "idx3"]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "omittedIndexingIds": ["idx1", "idx3"]
  }
}
```

---

### 6. 添加收录任务

**POST** `/v1/pre-sale-report/{id}/add-indexing-tasks`

为诊断任务手动添加新的收录任务。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| tasks | array | 是 | 要添加的收录任务列表 |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/pre-sale-report/task_abc123/add-indexing-tasks" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      { "url": "https://example.com/new-page-1", "title": "新产品介绍" },
      { "url": "https://example.com/new-page-2", "title": "客户案例" }
    ]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "addedTasks": [
      { "id": "idx_new1", "url": "https://example.com/new-page-1", "status": "pending" },
      { "id": "idx_new2", "url": "https://example.com/new-page-2", "status": "pending" }
    ]
  }
}
```

---

### 7. 删除收录任务

**POST** `/v1/pre-sale-report/{id}/delete-indexing-tasks`

从诊断任务中删除指定的收录任务。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| indexingIds | string[] | 是 | 要删除的收录任务 ID 列表 |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/pre-sale-report/task_abc123/delete-indexing-tasks" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "indexingIds": ["idx2", "idx4"]
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "deletedIndexingIds": ["idx2", "idx4"]
  }
}
```

---

### 8. 确认任务

**POST** `/v1/pre-sale-report/{id}/confirm`

确认诊断任务，支持两种确认模式。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（路径参数） |
| mode | number | 是 | 确认模式：1 = 标准模式，2 = 增强模式 |

**curl 示例：**

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/pre-sale-report/task_abc123/confirm" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": 1
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "task_abc123",
    "status": "confirmed",
    "mode": 1,
    "confirmedAt": "2026-04-15T15:00:00Z"
  }
}
```

---

## 执行步骤（完整工作流）

以下是使用售前诊断技能的完整操作流程：

### Step 1：读取认证配置

从 `geo-config/geo-config.json` 读取 `openKey`，构建统一请求头。

### Step 2：创建诊断任务

调用 `POST /v1/pre-sale-report`，传入客户公司名称和诊断关键词。记录返回的任务 ID。

### Step 3：查询任务状态

调用 `GET /v1/pre-sale-report/{id}` 查看任务是否已完成初始化。若状态为 `pending` 或 `processing`，可轮询等待。

### Step 4：查看并编辑搜索意图

任务初始化完成后，查看详情中的 `topics` 字段。如需调整，调用 `PATCH /v1/pre-sale-report/{id}/topics` 更新搜索意图。

### Step 5：管理收录任务

- **排除不需要的收录**：调用 `PATCH /v1/pre-sale-report/{id}/omit-indexing`
- **手动添加收录**：调用 `POST /v1/pre-sale-report/{id}/add-indexing-tasks`
- **删除不需要的收录**：调用 `POST /v1/pre-sale-report/{id}/delete-indexing-tasks`

### Step 6：确认并提交任务

检查所有配置无误后，调用 `POST /v1/pre-sale-report/{id}/confirm` 确认任务。根据需求选择模式 1（标准）或模式 2（增强）。

### Step 7：查看最终结果

确认后再次查询任务详情，获取最终诊断报告数据。

---

## 错误处理

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查必填参数是否缺失或格式是否正确 |
| 401 | 认证失败 | 检查 `geo-config.json` 中的 `openKey` 是否有效 |
| 404 | 任务不存在 | 确认任务 ID 是否正确，任务是否已被删除 |
| 409 | 状态冲突（如重复确认） | 检查当前任务状态，避免重复操作 |
| 429 | 请求频率超限 | 降低请求频率，适当增加轮询间隔 |
| 500 | 服务器内部错误 | 稍后重试，如持续出现请联系平台方 |

**通用错误响应格式：**

```json
{
  "code": 400,
  "message": "参数错误：companyName 不能为空",
  "data": null
}
```

---

## 注意事项

1. **认证安全**：`openKey` 为敏感信息，请勿硬编码在代码中，务必通过 `geo-config.json` 统一管理。
2. **请求频率**：批量操作时注意控制请求频率，建议每次请求间隔 ≥ 200ms。
3. **任务状态**：确认操作不可逆，确认前请务必检查所有配置。
4. **幂等性**：创建任务接口非幂等，避免重复提交相同参数的创建请求。
5. **超时处理**：诊断任务处理可能需要较长时间，建议使用轮询方式检查状态，轮询间隔建议 5-10 秒。
6. **关键词数量**：单次创建任务的关键词数量建议不超过 20 个，过多可能导致处理超时。
