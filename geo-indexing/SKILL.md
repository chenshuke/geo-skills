---
name: geo-indexing
description: GEO平台收录检测管理模块，包含收录任务导入/查询/删除/批量导入、收录结果查询、发布状态检测
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO 收录检测管理

本模块整合了 GEO 平台收录检测的全部操作能力，支持在多个 AI 平台（DeepSeek、豆包、元宝、通义千问、文心一言、Kimi、智谱、ChatGPT、Gemini）上查询品牌词的收录情况，管理收录检测任务的生命周期，以及查看详细的 AI 回答和引用来源。

---

## 能力总览

- **收录任务导入**：提交查收录任务（单个/批量），支持多品牌词格式
- **任务列表查询**：分页查询收录检测任务，查看状态和收录情况
- **任务删除**：单个/批量/范围删除收录任务
- **批量导入**：从关键词列表/文件/飞书批量导入收录检测任务
- **收录结果查询**：查看 AI 回答内容、引用来源、文章链接（indexed 字段标识是否被 AI 采纳）
- **发布状态检测**：查询文章在平台上的发布状态（已发布/待发布）

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/ai-indexing-task/custom/import | 导入查收录任务（单个/批量） |
| GET | /v1/ai-indexing-task/custom | 获取查收录任务列表 |
| DELETE | /v1/ai-indexing-task/custom?companyId= | 删除查收录任务 |
| GET | /v1/ai-indexing/custom | 获取收录结果详情 |
| GET | /v1/publication | 查询发布状态 |

---

## 一、收录任务导入（POST /v1/ai-indexing-task/custom/import）

### 请求体

```json
{
  "data": "燃气壁挂炉推荐[海顿]",
  "platforms": ["deepseek", "doubao", "yuanbao", "qwen", "yiyan"],
  "companyId": ${companyId}
}
```

### 多品牌词格式（推荐）

```json
{
  "data": "减震器品牌推荐[多耐|DN]",
  "platforms": ["deepseek", "doubao"],
  "companyId": ${companyId}
}
```

### 参数

| 参数 | 说明 | 必填 |
|------|------|------|
| `--data` | 查询问题，格式：`问题[品牌词]`，多品牌用 `\|` 分隔 | 是 |
| `--platforms` | 查询平台（逗号分隔或 `all`） | 是 |
| `--company-id` | 公司 ID | 是 |

### 支持的平台

| API 值 | 平台 |
|--------|------|
| deepseek | DeepSeek |
| doubao | 豆包 |
| yuanbao | 元宝 |
| qwen | 通义千问 |
| yiyan | 文心一言 |
| kimi | Kimi |
| zhipu | 智谱 |
| chatgpt | ChatGPT |
| gemini | Gemini |

### curl 示例

```bash
# ${companyId} 从 geo-config.json 的 defaults.companyId 读取
curl -X POST "${baseUrl}/v1/ai-indexing-task/custom/import" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": \"燃气壁挂炉推荐[海顿]\",
    \"platforms\": [\"deepseek\", \"doubao\", \"yuanbao\", \"qwen\", \"yiyan\", \"kimi\", \"zhipu\", \"chatgpt\", \"gemini\"],
    \"companyId\": ${companyId}
  }"
```

### data 字段格式规范

- 单品牌：`问题[品牌名]`
- 多品牌：`问题[品牌1|品牌2]`
- 关键词与方括号之间**不加空格**，多品牌用 `|` 分隔
- 批量导入时多个查询任务以换行符 `\n` 分隔

---

## 二、任务列表查询（GET /v1/ai-indexing-task/custom）

### 查询参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--page` | 页码 | 1 |
| `--limit` | 每页数量 | 30 |
| `--keyword` | 关键词筛选（模糊匹配问题） | 全部 |
| `--company-id` | 公司 ID | 从配置读取 |
| `--format` | 输出格式：table / detail / json | table |

### curl 示例

```bash
# ${companyId} 从 geo-config.json 的 defaults.companyId 读取
curl -X GET "${baseUrl}/v1/ai-indexing-task/custom?page=1&limit=30&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

### 任务状态

| 状态 | 说明 |
|------|------|
| pending | 待查询 |
| running | 查询中 |
| completed | 已完成 |
| failed | 失败 |

---

## 三、任务删除（DELETE /v1/ai-indexing-task/custom）

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--id` | 单个任务 ID | - |
| `--ids` | 多个任务 ID（逗号/范围/混合） | - |
| `--company-id` | 公司 ID | 从配置读取 |
| `--force` | 跳过确认 | false |

### ID 格式

- 逗号分隔：`14227,14228,14229`
- 范围格式：`14227-14250`（含边界）
- 混合格式：`14227,14230-14240,14250`

### curl 示例

```bash
# ${companyId} 从 geo-config.json 读取，${taskId} 为实际任务 ID
curl -X DELETE "${baseUrl}/v1/ai-indexing-task/custom?companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json" \
  -d "{\"ids\":[${taskId1},${taskId2}]}"
```

> 注意：删除不可恢复，批量建议不超过 100 个。

---

## 四、批量导入收录任务

支持从关键词列表、文本文件、飞书关键词库批量导入。

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--keywords` | 关键词列表（逗号分隔） | - |
| `--file` | 关键词文本文件路径（每行一个） | - |
| `--company` | 公司名称（必须） | - |
| `--company-id` | 公司 ID | 从 API 获取 |
| `--platforms` | 监测平台 | deepseek,doubao,yuanbao,qwen,yiyan,kimi,zhipu,chatgpt,gemini |
| `--source` | 数据来源：feishu / manual | manual |
| `--priority` | 优先级过滤：P0/P1/P2/ALL | ALL |

### 关键词格式处理

自动将关键词格式化为 `关键词[品牌名]`，多品牌合并为 `关键词[品牌1|品牌2]`。

---

## 五、收录结果查询（GET /v1/ai-indexing/custom）

查看已完成收录检测的**实际结果**，包括 AI 回答内容、引用来源和文章链接。

> 与任务列表的区别：任务列表查的是任务状态，本接口查的是 AI 的实际回答和引用来源。

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `companyId` | number | 公司 ID（必填） |
| `page` | number | 页码（默认 1） |
| `limit` | number | 每页数量（默认 30） |
| `platform` | string | 平台筛选 |
| `topic` | string | 问题关键词筛选（模糊匹配） |

### curl 示例

```bash
# ${companyId} 从 geo-config.json 读取
# 查看全部结果
curl -s "${baseUrl}/v1/ai-indexing/custom?page=1&limit=30&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"

# 按平台 + 关键词筛选
curl -s "${baseUrl}/v1/ai-indexing/custom?platform=deepseek&topic=多耐&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

### 核心响应字段

| 字段 | 说明 |
|------|------|
| platform | 查询的 AI 平台 |
| content | AI 的完整回答内容（Markdown） |
| topic | 查询的问题 |
| searchedSite[] | 引用的信息来源列表 |
| searchedSite[].url | 来源文章链接 |
| searchedSite[].title | 来源文章标题 |
| searchedSite[].indexed | 该来源是否被 AI 实际采纳（true/false） |

---

## 六、发布状态检测（GET /v1/publication）

查询文章的发布状态，识别已发布和待发布的文章。

### 查询参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--page` | 页码 | 1 |
| `--limit` | 每页数量 | 30 |
| `--productId` | 产品 ID | 必填 |
| `--companyId` | 公司 ID | 必填 |

### curl 示例

```bash
# ${productId}、${companyId} 从 geo-config.json 的 defaults 读取
curl -s "${baseUrl}/v1/publication?page=1&limit=30&productId=${productId}&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

---

## 通用执行步骤

1. 从 `geo-config/geo-config.json` 读取 `openKey`
2. 根据操作选择对应 API 接口
3. 设置统一请求头（Authorization + Referer）
4. 拼接参数并发送请求
5. 检查响应 `statusCode` 字段（0 为成功），解析数据
6. 格式化输出结果

## 通用错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 401 | 认证失败 | 检查 openKey 是否有效 |
| 400 | 请求参数错误 | 检查参数格式（如 data 必须含 `[品牌词]`） |
| 404 | 资源不存在 | 检查 ID 参数 |
| 429 | 请求频率超限 | 等待后重试（间隔 0.3-1 秒） |
| 500 | 服务端错误 | 联系平台管理员 |

---

## 配置

所有技能统一从 `geo-config/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：https://nbgeo.aimusiclj.com
