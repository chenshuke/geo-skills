---
name: geo-indexing
description: "GEO Scheduled Indexing 定时收录检测技能。Use when the user says 导入问题、创建定时收录计划、立即查收录、查 AI 是否收录、收录检测、排名检测、问题×平台矩阵、AI 回答引用来源、publishedUrl 精确命中、searchedSites URL 命中检测、title/account 弱命中、DeepSeek/豆包/Kimi/ChatGPT/Gemini/nami/grok/perp/poe 检测、暂停/删除收录计划. Do not create publication tasks; use geo-publish. Use geo-analysis for deep evidence-chain analysis."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.4.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO Scheduled Indexing 收录检测管理

本模块默认使用 **Scheduled Indexing** 接口管理 AI 收录检测：创建定时收录计划、立即执行、查询执行历史、问题×平台收录矩阵、AI 完整回答与引用来源、topic 统计和趋势指标。

## 通用安全规则

- Base URL 属于内部接口配置：脚本可以读取、测试和写入配置文件，但默认回复、日志、dry-run、JSON 预览中不得展示具体 Base URL。
- 用户侧可以展示 Referer、脱敏 openKey、companyId/productId、接口路径（如 `/v1/scheduled-indexing`），但不要展示接口域名。
- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 创建、更新、删除、立即执行、AI 建议竞品等写入/耗资源操作必须先 `--dry-run`，真实执行必须加 `--force`。
- 写入后必须 GET 回查确认，不只相信 POST/PATCH/DELETE 返回值。
- 默认优先使用 Node 脚本；`curl` 只作为低级调试，不作为中文正文或批量写操作默认方案。

## 输出归位硬规则

问题导入、收录计划、收录矩阵、AI 回答引用报告必须写入 `07_监测分析/收录监测/`。写文件前可用：

```bash
node geo-content-archive/scripts/project_paths.js --artifact indexing-report --project-dir "项目目录" --json
```

## 当前接口总览（Scheduled Indexing）

| 动作 | 方法 | 路径 |
|---|---:|---|
| 获取定时收录计划列表 | GET | `/v1/scheduled-indexing` |
| 创建定时收录计划 | POST | `/v1/scheduled-indexing` |
| 获取计划详情 | GET | `/v1/scheduled-indexing/{id}` |
| 更新计划 / enabled 开关 | PATCH | `/v1/scheduled-indexing/{id}` |
| 删除计划（不可恢复） | DELETE | `/v1/scheduled-indexing/{id}` |
| 立即执行一次 | POST | `/v1/scheduled-indexing/{id}/run-now` |
| 执行历史列表 | GET | `/v1/scheduled-indexing/{id}/runs` |
| 趋势指标 / 折线图数据 | GET | `/v1/scheduled-indexing/{id}/metrics` |
| AI 完整回答与引用来源 | GET | `/v1/scheduled-indexing/{id}/answers` |
| 问题×平台收录矩阵 | GET | `/v1/scheduled-indexing/{id}/topic-platform-matrix` |
| 引用分析（渠道引用 + 内容引用） | GET | `/v1/scheduled-indexing/{id}/citations` |
| topic 聚合统计 | GET | `/v1/scheduled-indexing/{id}/topic-stats` |
| topic 统计 Excel 导出 | GET | `/v1/scheduled-indexing/{id}/topic-stats/export` |
| AI 建议竞品 | POST | `/v1/scheduled-indexing/suggest-competitors` |
| 发布 URL 命中检测 | 本地脚本 | `geo-indexing/scripts/published_url_match.js` 读取 answers.searchedSites |

> 旧自定义收录接口 `/v1/ai-indexing-task/custom/import`、`/v1/ai-indexing-task/custom`、`/v1/ai-indexing/custom` 仅作为内部人工回滚入口保留，学员和 Agent 默认禁止使用；正常查收录必须走 Scheduled Indexing。

## 常见“参数不正确”排查规则

学员创建收录计划时，Agent 必须优先使用保守参数，避免把平台接口错误暴露给新手：

1. **不要默认 `--platforms all`**：`all` 会包含账号未开通或已禁用的平台，容易报“所选平台已被禁用”。课堂默认用 `--platforms doubao`，多平台必须由用户或账号资源确认后再加。
2. **`source` 合法值是 `1/2/3`**：课堂默认 `1` 本地/设备模式；云端模式传 `--source 3`；`2` 是平台保留模式，学员不要默认使用。
3. **`scheduleConfig` 必须完整**：
   - `once`：一次性计划，payload 只传 `{"type":"once"}`，不得附带空的 `hours: []`；
   - `daily`：建议 `--hours 9`；
   - `weekly`：必须传 `--weekdays`，例如 `--weekdays 1,3,5`；
   - `interval`：必须传 `--interval-days`。
4. **`screenshotPlatforms` 必须是 `platforms` 子集**，不能单独传未选择的平台。
5. 创建前先 dry-run，看 payload 里是否是 `/v1/scheduled-indexing`、`platforms: ["doubao"]`、`source: 1`、`scheduleConfig` 合法。

## 推荐脚本

### 1. 创建定时收录计划（默认新接口）

```bash
# 预览：不会写入
node geo-indexing/scripts/scheduled_indexing.js \
  --action create \
  --file questions.md \
  --name "示例品牌A-每日收录" \
  --platforms doubao \
  --schedule-type daily \
  --hours 9 \
  --dry-run

# 真实创建；如需立刻查一次，加 --run-now
node geo-indexing/scripts/scheduled_indexing.js \
  --action create \
  --file questions.md \
  --name "示例品牌A-每日收录" \
  --platforms doubao \
  --schedule-type daily \
  --hours 9 \
  --run-now \
  --force
```

兼容旧提示词：

```bash
# 旧 --target indexing-custom 会被 import_questions.js 自动路由到 /v1/scheduled-indexing
node geo-indexing/scripts/import_questions.js \
  --target indexing-custom \
  --file questions.md \
  --name "示例品牌A-收录计划" \
  --platforms doubao \
  --dry-run
```

### 2. 查询计划、执行、结果

```bash
# 计划列表
node geo-indexing/scripts/scheduled_indexing.js --action list --limit 20

# 计划详情
node geo-indexing/scripts/scheduled_indexing.js --action detail --id 123

# 立即执行一次（写/耗资源操作）
node geo-indexing/scripts/scheduled_indexing.js --action run-now --id 123 --dry-run
node geo-indexing/scripts/scheduled_indexing.js --action run-now --id 123 --force

# 执行历史
node geo-indexing/scripts/scheduled_indexing.js --action runs --id 123 --limit 20

# 问题×平台收录矩阵
node geo-indexing/scripts/scheduled_indexing.js --action matrix --id 123 --limit 100

# AI 完整回答与引用来源；支持 platform/topicId/runId/taskId/startDate/endDate
node geo-indexing/scripts/scheduled_indexing.js --action answers --id 123 --platform deepseek --limit 50

# 引用分析
node geo-indexing/scripts/scheduled_indexing.js --action citations --id 123 --limit 100

# topic 聚合统计
node geo-indexing/scripts/scheduled_indexing.js --action topic-stats --id 123 --limit 100

# 趋势指标
node geo-indexing/scripts/scheduled_indexing.js --action metrics --id 123 --platform deepseek
```



### 学员判断规则（重要）

```text
articleId ≠ 已发布
publishedUrl ≠ AI 已看见
weak_title_account_hit ≠ 精确收录
exact_url_hit = URL 被 answers.searchedSites 精确引用/检索到的证据
stable = 需要跨批次或跨平台持续出现
```

所以发布后必须按顺序判断：先用 `geo-publish` 拿 publishedUrl，再用 `published_url_match.js` 判断 exact / weak / not_hit。

### 2.1 Published URL 精确命中检测

发布任务拿到 `publishedUrl` 后，不能直接认为 AI 已经看见。用本脚本检查 answers 里的 `searchedSites`：

```bash
# 先从发布状态回查 JSON 中读取 publishedUrl，再拉取 Scheduled Indexing answers 检测
node geo-indexing/scripts/published_url_match.js \
  --publication-json "项目_品牌GEO/06_发布记录/发布状态回查/publication_status_YYYY-MM-DD.json" \
  --schedule-id 123 \
  --project-dir "项目_品牌GEO"

# 或使用本地 answers JSON
node geo-indexing/scripts/scheduled_indexing.js --action answers --id 123 --limit 200 --json-out answers.json
node geo-indexing/scripts/published_url_match.js \
  --published-url "https://example.com/published/article" \
  --answers-json answers.json \
  --title "文章标题" \
  --account "账号名" \
  --project-dir "项目_品牌GEO"
```

输出到 `07_监测分析/收录监测/URL命中回查/`。兼容 `geo-publish` 标准化 JSON，也兼容平台原始 `/v1/publication` 多层回包（如 `data.data.data[]`）。无 publishedUrl 的记录会输出 `manual_required` / `pending` / `task_mapping_only`，不会中断。

命中层级：

| status | 含义 | 行动建议 |
|---|---|---|
| `exact_url_hit` | `searchedSites.url` 与 publishedUrl 规范化后精确一致 | 说明 AI 已引用/检索到新 URL，继续观察稳定性 |
| `weak_title_account_hit` | URL 未命中，但标题、账号或品牌弱命中 | 继续复测；检查发布页标题、摘要、账号名是否一致 |
| `not_hit` | URL、标题、账号均未命中 | 等待抓取后复测；必要时补外链、媒体分发和可抓取性 |

> 这一步用于区分“已发布”和“已被 AI 看见”，避免学员误判 GEO 效果。

### 3. 更新、停用、删除计划

```bash
# 停用计划
node geo-indexing/scripts/scheduled_indexing.js --action update --id 123 --enabled false --dry-run
node geo-indexing/scripts/scheduled_indexing.js --action update --id 123 --enabled false --force

# 删除计划（不可恢复，会连同运行历史/子任务/指标删除）
node geo-indexing/scripts/scheduled_indexing.js --action delete --id 123 --dry-run
node geo-indexing/scripts/scheduled_indexing.js --action delete --id 123 --force
```

## 创建计划 payload

`POST /v1/scheduled-indexing`：

```json
{
  "name": "示例品牌A-每日收录",
  "companyId": 101,
  "productId": 93,
  "topics": ["2026年GEO优化服务商怎么选？", "AI搜索为什么推荐不到我的品牌？"],
  "platforms": ["doubao"],
  "scheduleConfig": { "type": "daily", "hours": [9] },
  "source": 1,
  "enabled": true
}
```

可选字段：

| 字段 | 说明 |
|---|---|
| `platforms` | AI 平台数组。课堂默认建议只用 `doubao`；`all` 只有在账号已开通全部平台时才能用，否则会报“所选平台已被禁用” |
| `screenshotPlatforms` | 截图平台数组，必须是 `platforms` 子集 |
| `source` | 采集模式：`1` 本地/设备模式（默认），`3` 云端模式；API 也保留 `2`，课堂不默认使用 |
| `competitorBrands` | 竞品品牌数组，仅用于 `(竞)` 标记 |

`scheduleConfig` 支持：

| type | 常用字段 |
|---|---|
| `once` | 一次性计划；只传 `type`，不要传 `hours`（包括空数组） |
| `daily` | 推荐 `hours: [9]`；也兼容 `timesPerDay` |
| `weekly` | 必须有 `weekdays`，再配 `hours` 或 `timesPerActiveDay` |
| `interval` | 必须有 `intervalDays`，再配 `hours` 或 `timesPerCycle` |


## 本地模式与云端模式

- 默认使用本地/设备模式：`source: 1`。脚本在创建计划时会显式写入 `source=1`，用户不需要额外传参。
- 如需云端模式，创建或更新计划时传 `--source 3`。API 文档还保留 `source=2`，但课堂/学员默认不要使用。
- 两种模式都走同一套 Scheduled Indexing 查询接口；区别只在创建/更新计划时的 `source` 字段。

## 查询字段重点

### answers

`GET /v1/scheduled-indexing/{id}/answers` 返回大模型回答和引用来源，核心字段：

| 字段 | 说明 |
|---|---|
| `topic` | 问题文本 |
| `platform` | AI 平台 |
| `status` | `0=Pending,1=Processing,2=Finished,3=Paused` |
| `indexed` | 是否命中收录 |
| `targetWord` | 产品品牌词数组 |
| `content` | 大模型完整回答 |
| `searchedSites[]` | 引用网页来源 |
| `searchedSites[].articleIndexed` | 该网页是否为本品牌文章命中 |
| `screenshotUrl` | 截图 URL（如有） |

### matrix

`GET /v1/scheduled-indexing/{id}/topic-platform-matrix` 返回问题×平台状态：

- `pending`
- `indexed`
- `not_indexed`

### topic-stats / metrics

用于趋势、提及率、平均排名：

- `taskCount`
- `mentionCount`
- `mentionRate`
- `avgRank`

## 支持平台

`deepseek`、`doubao`、`yuanbao`、`qwen`、`yiyan`、`kimi`、`zhipu`、`chatgpt`、`gemini`、`nami`、`grok`、`perp`、`poe`。注意：平台枚举“支持”不等于每个 openKey 都“已开通”；学员默认用 `doubao`，需要多平台时再显式传账号已开通的平台。

## 产品主题库接口仍保留

如果只是把本地深层问题沉淀到产品主题库，而不是创建收录检测计划，仍使用：

```bash
node geo-indexing/scripts/import_questions.js \
  --target product-topic \
  --file deep_questions.md \
  --tags "深层用户问题,手动导入" \
  --dry-run
```

底层接口：`POST /v1/geo-product-topic`。
