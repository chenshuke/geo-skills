---
name: geo-indexing
description: "GEO AI 收录检测和问题导入技能。Use when the user says 导入问题、导入深层用户问题、导入自定义 AI 收录任务、产品主题库/问题库、搜索问题插入、查 AI 是否收录、收录检测、排名检测、AI 回答引用来源、DeepSeek/豆包/Kimi/ChatGPT/Gemini 检测、暂停/删除收录任务. Do not create publication tasks; use geo-publish. Use geo-analysis for deep evidence-chain analysis."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO 收录检测管理

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

本模块整合了 GEO 平台收录检测的全部操作能力，支持在多个 AI 平台（DeepSeek、豆包、元宝、通义千问、文心一言、Kimi、智谱、ChatGPT、Gemini）上查询品牌词的收录情况，管理收录检测任务的生命周期，以及查看详细的 AI 回答和引用来源。

---

## 通用安全规则

## Base URL 输出规则

- Base URL 属于内部接口配置：脚本可以读取、测试和写入配置文件，但默认回复、日志、dry-run、JSON 预览中不得展示具体 Base URL。
- 用户侧可以展示 Referer、脱敏 openKey、companyId/productId、接口路径（如 `/v1/geo-company`），但不要展示接口域名。
- 用户只提供 openKey 时，先调用 `geo-config/scripts/configure_openkey.js` 自动识别平台接口与 Referer。

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。
- 有专用 Node 脚本时优先使用脚本；没有专用脚本时使用 `geo-runtime/scripts/api_request.js`，`curl` 只作为低级调试，不作为中文正文或批量写操作默认方案。

---

## 输出归位硬规则

问题导入、收录任务、收录结果和 AI 回答引用报告必须直接写入 `07_监测分析/收录监测/`；如果同时生成产品主题/问题库备份，也应放入 `03_规划方案/关键词方案/` 或 `02_知识库/`。写文件前可用 `geo-content-archive/scripts/project_paths.js --artifact indexing-report` 获取路径。

## 能力总览

- **收录任务导入**：提交查收录任务（单个/批量），支持多品牌词格式
- **问题导入**：从本地 Markdown/TXT/CSV/JSON 读取深层用户问题，导入自定义 AI 收录任务或产品主题库
- **任务列表查询**：分页查询收录检测任务，查看状态和收录情况
- **任务删除**：单个/批量/范围删除收录任务
- **批量导入**：从关键词列表/文件/飞书批量导入收录检测任务
- **收录结果查询**：查看 AI 回答内容、引用来源、文章链接（indexed 字段标识是否被 AI 采纳）
- **发布状态检测**：查询文章在平台上的发布状态（已发布/待发布）
- **产品主题搜索问题插入**：将本地深层用户问题写入产品主题库，或从平台主题生成任务中选择问题插入

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/ai-indexing-task/custom/import | 导入查收录任务（单个/批量） |
| GET | /v1/ai-indexing-task/custom | 获取查收录任务列表 |
| DELETE | /v1/ai-indexing-task/custom?companyId= | 删除查收录任务 |
| GET | /v1/ai-indexing/custom | 获取收录结果详情 |
| GET | /v1/publication | 查询发布状态 |
| POST | /v1/geo-product-topic | 将搜索问题/主题写入产品主题库 |
| GET | /v1/geo-product-topic | 查询产品主题库 |
| POST | /v1/topic-task/{taskId}/select | 从主题生成任务中选择搜索问题插入 |

---

## 零、问题导入脚本（推荐）

**脚本路径**：`geo-indexing/scripts/import_questions.js`

用于把本地 Codex 生成的深层用户问题导入 GEO 平台。默认支持：

- Markdown 列表 / Markdown 表格
- TXT 每行一个问题
- CSV：优先识别 `question` / `topic` / `问题` / `搜索问题` 列
- JSON：数组，或 `{ "questions": [...] }`

### 目标类型

| target | 写入位置 | API | 典型用途 |
|---|---|---|---|
| `indexing-custom` | 自定义 AI 收录任务 | `POST /v1/ai-indexing-task/custom/import` | 把问题导入收录检测 |
| `product-topic` | 产品主题库 / 搜索问题库 | `POST /v1/geo-product-topic` | 把深层用户问题沉淀到主题库 |
| `topic-task-select` | 平台主题生成任务选择插入 | `POST /v1/topic-task/{taskId}/select` | 从平台生成结果里选择问题导入 |

### 统一安全规则

- 真实导入必须先 `--dry-run` 预览，再加 `--force` 执行。
- 脚本会按 UTF-8 读取文件，拦截常见乱码。
- 脚本会自动去重、过滤空行、限制导入数量（默认最多 200 条）。
- 写入后会 GET 回查最近记录，辅助确认是否真正落库。

### 导入自定义 AI 收录任务

```bash
# 预览：本地问题 + 品牌词 → 问题[品牌词]
node geo-indexing/scripts/import_questions.js \
  --target indexing-custom \
  --file questions.md \
  --brand "必火AI" \
  --platforms all \
  --dry-run

# 真实导入
node geo-indexing/scripts/import_questions.js \
  --target indexing-custom \
  --file questions.md \
  --brand "必火AI" \
  --platforms deepseek,doubao,qwen,kimi \
  --force
```

如果问题本身已经是平台格式，例如 `GEO优化服务商怎么选？[必火AI|GEO优化]`，可不传 `--brand`。

### 导入产品主题库 / 搜索问题库

适合把更深层的用户问题沉淀到产品主题库，例如：

```md
- 中小企业做 GEO 优化最容易失败在哪？
- 为什么 AI 搜索推荐不到我的品牌？
- GEO 优化和传统 SEO 的投入产出差异是什么？
```

命令：

```bash
# 预览
node geo-indexing/scripts/import_questions.js \
  --target product-topic \
  --file deep_questions.md \
  --tags "深层用户问题,GEO选题,手动导入" \
  --dry-run

# 真实导入
node geo-indexing/scripts/import_questions.js \
  --target product-topic \
  --file deep_questions.md \
  --tags "深层用户问题,GEO选题,手动导入" \
  --force
```

底层 payload：

```json
{
  "topic": "问题1\n问题2\n问题3",
  "productId": 409,
  "tags": ["深层用户问题", "GEO选题", "手动导入"],
  "knowledgeBaseIds": []
}
```

### 从主题生成任务中选择搜索问题插入

如果平台已经通过 `POST /v1/topic-task` 生成了一批搜索问题，可用选择插入接口：

```bash
# 按平台生成结果索引选择
node geo-indexing/scripts/import_questions.js \
  --target topic-task-select \
  --task-id 123 \
  --selected-ids 0,2,5 \
  --dry-run

# 真实插入
node geo-indexing/scripts/import_questions.js \
  --target topic-task-select \
  --task-id 123 \
  --selected-ids 0,2,5 \
  --force
```

也可以用本地问题文件与平台任务的 `llmResult.questions` 做精确匹配，自动换成索引：

```bash
node geo-indexing/scripts/import_questions.js \
  --target topic-task-select \
  --task-id 123 \
  --match-file selected_questions.md \
  --dry-run
```

> 注意：`topic-task-select` 只能选择平台主题生成任务里已经存在的问题；如果是 Codex 本地新写的问题，请用 `--target product-topic`。

## 一、收录任务导入（POST /v1/ai-indexing-task/custom/import）

### 请求体

```json
{
  "data": "燃气壁挂炉推荐[示例品牌A]",
  "platforms": ["deepseek", "doubao", "yuanbao", "qwen", "yiyan"],
  "companyId": ${companyId}
}
```

### 多品牌词格式（推荐）

```json
{
  "data": "减震器品牌推荐[示例品牌B|品牌B英文名]",
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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# ${companyId} 从 geo-config.json 的 defaults.companyId 读取
curl -X POST "${baseUrl}/v1/ai-indexing-task/custom/import" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"data\": \"燃气壁挂炉推荐[示例品牌A]\",
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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# ${companyId} 从 geo-config.json 读取，${taskId} 为实际任务 ID
curl -X DELETE "${baseUrl}/v1/ai-indexing-task/custom?companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json; charset=utf-8" \
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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# ${companyId} 从 geo-config.json 读取
# 查看全部结果
curl -s "${baseUrl}/v1/ai-indexing/custom?page=1&limit=30&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"

# 按平台 + 关键词筛选
curl -s "${baseUrl}/v1/ai-indexing/custom?platform=deepseek&topic=示例品牌B&companyId=${companyId}" \
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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# ${productId}、${companyId} 从 geo-config.json 的 defaults 读取
curl -s "${baseUrl}/v1/publication?page=1&limit=30&productId=${productId}&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

---

## 通用执行步骤

1. 从 `~/.geo-skills/credentials/geo-config.json` 读取 `openKey`
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

所有技能统一从 `~/.geo-skills/credentials/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：内部自动识别，不对用户展示
