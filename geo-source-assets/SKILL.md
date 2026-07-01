---
name: geo-source-assets
description: "GEO 引用源资产库技能。Use when the user says 引用源资产库、信源资产、searchedSites、AI 引用来源沉淀、我方内容源/竞品内容源/泛行业源/媒体源分类、判断引用源是否可控/可复用/需补强/稳定引用、从 Scheduled Indexing answers 生成信源台账、输出信源补强建议. Use after geo-indexing or geo-analysis; do not create articles or publish tasks."
---

# GEO 引用源资产库

把 AI 回答里的 `searchedSites` 沉淀为长期可运营的信源资产库，帮助学员从“发文章”升级到“让 AI 引用逐步偏向我方可控资产”。

## 核心原则

- 本技能不写文章、不发布文章、不创建收录任务；它只治理引用源资产。
- 默认从 Scheduled Indexing 的 `answers` 结果导入：`GET /v1/scheduled-indexing/{id}/answers`。
- Base URL 不在回复、日志、dry-run 或报告中展示；可以展示 Referer、脱敏 openKey、接口路径。
- 输出统一归位到 `07_监测分析/引用源资产库/`。

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

### 3. 直接从 Scheduled Indexing 拉取 answers

```bash
node geo-source-assets/scripts/source_assets.js \
  --action fetch \
  --project-dir "项目_品牌GEO" \
  --schedule-id 123 \
  --limit 200 \
  --owned-domains "example.com" \
  --owned-brands "示例品牌A"
```

### 4. 输出下一步信源补强建议

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
| `stable_cited` | 是否被 AI 稳定引用，默认引用次数≥2 或跨平台/跨批次出现 |
| `citation_count` | 出现在 searchedSites 的次数 |
| `indexed_count` | 作为我方命中/被采纳的次数 |
| `related_topics` | 关联问题 |
| `related_platforms` | 关联 AI 平台 |
| `next_action` | 下一步动作 |

## 下一步动作规则

- 我方源被引用但不稳定：补权威信号、更新内容、补内链和媒体二次分发。
- 竞品源高频被引用：优先写替代型/对比型内容，并在媒体源补我方观点。
- 泛行业源高频出现：在同类主题做我方专业解释页或榜单页。
- 媒体源有效：优先复用该媒体/同类媒体继续分发。
- 无关源过多：回到 `geo-keyword-pool` 或关键词方案校准搜索意图。

## 与其他技能配合

```text
geo-indexing 生成 answers / matrix
  ↓
geo-source-assets 沉淀引用源资产库和补强动作
  ↓
geo-content-production / geo-content-to-publish-pipeline 执行补强内容
  ↓
geo-analysis 分析平台偏好和证据链变化
```
