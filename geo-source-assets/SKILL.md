---
name: geo-source-assets
description: "GEO 引用源资产库技能。支持选择单个或多个 Scheduled Indexing 监测任务，按任务、运行批次、问题和 AI 平台独立提取 searchedSites，生成对应信源 CSV、Markdown、HTML 和多任务汇总报告。Use when the user says 引用源报告、选择监测任务分析信源、品牌监测引用来源、产品推荐任务引用来源、单个/多个任务信源分析、引用源资产库。Use after geo-indexing or geo-analysis; do not create articles or publish tasks."
---

# GEO 引用源资产库

把 AI 回答里的 `searchedSites` 沉淀为长期可运营的信源资产库，帮助学员从“发文章”升级到“让 AI 引用逐步偏向我方可控资产”。

## 核心原则

- 本技能不写文章、不发布文章、不创建收录任务；它只治理引用源资产。
- 默认从 Scheduled Indexing 的 `answers` 结果导入：`GET /v1/scheduled-indexing/{id}/answers`。
- Base URL 不在回复、日志、dry-run 或报告中展示；可以展示 Referer、脱敏 openKey、接口路径。
- 输出统一归位到 `07_监测分析/引用源资产库/`。
- 一个监测任务生成一套独立信源报告；多个任务不得直接混入同一资产明细表。
- 同一 URL 在不同 AI 平台分别统计。豆包引用过，不代表千问、元宝或其他平台也会引用。
- 本技能与 `geo-knowledge` 的证据库分工明确：核心优势与可信证据库回答“企业能证明什么”，引用源资产库回答“AI 实际检索和引用什么”。不得因为某网页被 AI 引用，就自动把网页内容升级为企业强证据。
- 如果项目存在 `02_知识库/证据库/核心优势与可信证据库_*.md`，在生成补强建议时关联证据编号、适用问题和待补强主张；优先推动高价值证据形成可检索的品牌自有页或第三方公开页。

## 推荐脚本

脚本：`geo-source-assets/scripts/source_assets.js`

### 1. 初始化资产库

```bash
node geo-source-assets/scripts/source_assets.js \
  --action init \
  --project-dir "项目_品牌GEO"
```

生成：

- `source_assets.csv`：机器可读资产表
- `source_assets.md`：人工可读资产库
- `source_gap_actions.md`：下一步信源补强动作
- `source_asset_summary.md`：摘要报告

### 2. 从本地 answers JSON 导入

```bash
node geo-indexing/scripts/scheduled_indexing.js \
  --action answers \
  --id 123 \
  --limit 200 \
  --json-out answers.json

node geo-source-assets/scripts/source_assets.js \
  --action import \
  --project-dir "项目_品牌GEO" \
  --answers-json answers.json \
  --owned-domains "example.com,brand.com" \
  --owned-brands "示例品牌A" \
  --competitor-brands "竞品A,竞品B"
```

### 3. 先列出任务供用户选择

```bash
node geo-source-assets/scripts/source_assets.js \
  --action list \
  --limit 50
```

向用户展示任务名称、任务 ID、平台和更新时间，允许选择一个或多个任务。不要要求用户手工提供问题或回答。

### 4. 生成单个任务信源报告

```bash
node geo-source-assets/scripts/source_assets.js \
  --action fetch \
  --project-dir "项目_品牌GEO" \
  --schedule-id 123 \
  --limit 200 \
  --owned-domains "example.com" \
  --owned-brands "示例品牌A"
```

输出到：

```text
07_监测分析/引用源资产库/任务_123_任务名称/
├── task_source_report.html
├── source_assets.csv
├── source_assets.md
├── source_gap_actions.md
└── source_asset_summary.md
```

### 5. 生成多个任务信源报告

```bash
node geo-source-assets/scripts/source_assets.js \
  --action fetch \
  --project-dir "项目_品牌GEO" \
  --schedule-ids 123,456,789 \
  --limit 200 \
  --owned-domains "example.com" \
  --owned-brands "示例品牌A"
```

每个任务单独生成上述五个文件，并额外生成：

```text
07_监测分析/引用源资产库/multi_task_source_summary.md
```

多任务汇总只用于比较任务之间的信源差异，不能改变来源所属的任务、问题或 AI 平台。

### 6. 输出下一步信源补强建议

```bash
node geo-source-assets/scripts/source_assets.js \
  --action next \
  --project-dir "项目_品牌GEO"
```

## 引用源分类

| source_type | 含义 |
|---|---|
| `owned_source` | 我方内容源：我方域名、我方品牌页，或 `articleIndexed=true` |
| `competitor_source` | 竞品内容源：竞品品牌/域名出现 |
| `industry_source` | 泛行业源：百科、行业站、垂直知识页、非竞品评测 |
| `media_source` | 媒体源：新闻、自媒体、内容平台、问答社区 |
| `platform_source` | 平台/社区/论坛/百科等可运营渠道 |
| `irrelevant_source` | 疑似无关源：标题/URL 明显不相关或无法解释 |
| `unknown_source` | 待人工判断 |

## 状态字段

| 字段 | 说明 |
|---|---|
| `control_level` | `owned` / `controllable` / `influenceable` / `uncontrollable` / `unknown` |
| `reusable` | 是否适合复用为后续内容或投放渠道 |
| `needs_strengthening` | 是否需要补强 |
| `stable_cited` | 在同一监测任务、同一 AI 平台内是否稳定引用，默认引用次数≥2或跨批次出现 |
| `citation_count` | 出现在 searchedSites 的次数 |
| `indexed_count` | 作为我方命中/被采纳的次数 |
| `related_topics` | 关联问题 |
| `related_ai_platforms` | 关联 AI 平台；不同平台分别建立资产行 |
| `next_action` | 下一步动作 |

## 下一步动作规则

- 我方源被引用但不稳定：补权威信号、更新内容、补内链和媒体二次分发。
- 竞品源高频被引用：优先写替代型/对比型内容，并在媒体源补我方观点。
- 泛行业源高频出现：在同类主题做我方专业解释页或榜单页。
- 媒体源有效：只能把该媒体列为对应 AI 平台的已验证来源；“同类媒体”只能作为待验证实验。
- 无关源过多：回到 `geo-keyword-pool` 或关键词方案校准搜索意图。
- A/B 级高价值证据没有公开可检索页面：优先转成结构化案例页、事实页或合作方公开记录。
- 某项优势只有 C/D 级证据：先回到 `geo-knowledge` 补证，不直接通过大量发布放大弱主张。

## 与其他技能配合

```text
geo-indexing 生成 answers / matrix
  ↓
geo-source-assets 按选定任务和 AI 平台生成独立信源报告
  ↓
geo-knowledge 对照核心优势证据库，区分“补企业证据”与“补公开信源”
  ↓
geo-content-production / geo-content-to-publish-pipeline 执行补强内容
  ↓
geo-analysis 分析平台偏好和证据链变化
```
