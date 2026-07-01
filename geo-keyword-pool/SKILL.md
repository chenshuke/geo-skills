---
name: geo-keyword-pool
description: "GEO 关键词池和状态机技能。Use when the user says 关键词池、关键词状态机、批量导入问题、P0/P1/P2/P3优先级、planned/baseline_done/need_content/published/postpublish_monitoring/source_gap/stable/regression/blocked、下一步动作、不知道先优化哪个关键词、每个关键词推进到哪一步、多关键词GEO闭环、关键词运营总表. Do not write full articles; route content creation to geo-content-production and indexing checks to geo-indexing."
---

# GEO 关键词池 / 状态机

把零散问题、关键词方案、标题方案、收录结果和发布结果，沉淀成一个长期可推进的关键词池，解决学员最常见的问题：**不知道先优化哪个关键词，也不知道每个关键词现在推进到哪一步**。

## 核心原则

- 本技能维护“关键词/问题的运营状态”，不直接写文章、不直接发布、不直接查平台 API。
- 默认输出到 `03_规划方案/关键词池/`。
- 每个关键词必须有：优先级、状态、下一步动作、证据、更新时间。
- 状态推进要可解释：不能只改状态，必须记录依据。

## 推荐脚本

脚本：`geo-keyword-pool/scripts/keyword_pool.js`

### 创建关键词池

```bash
node geo-keyword-pool/scripts/keyword_pool.js \
  --action init \
  --project-dir "项目_示例品牌GEO"
```

### 批量导入问题/关键词

```bash
node geo-keyword-pool/scripts/keyword_pool.js \
  --action import \
  --project-dir "项目_示例品牌GEO" \
  --file questions.md \
  --source "课前调研" \
  --brand "示例品牌A"
```

### 导入收录 answers，更新状态

```bash
node geo-keyword-pool/scripts/keyword_pool.js \
  --action import-answers \
  --project-dir "项目_示例品牌GEO" \
  --answers-json answers.json \
  --brand "示例品牌A" \
  --owned-domains "example.com"
```

### 输出下一步动作

```bash
node geo-keyword-pool/scripts/keyword_pool.js \
  --action next \
  --project-dir "项目_示例品牌GEO" \
  --top 20
```

## 状态机

| 状态 | 含义 | 下一步 |
|---|---|---|
| `planned` | 已进入关键词池，但未做基线检测 | 先创建/加入收录检测计划 |
| `baseline_done` | 已有基线收录结果 | 判断是否需要内容 |
| `need_content` | 缺内容或我方证据不足 | 用 `geo-content-production` 生成内容 |
| `published` | 内容已发布或已有 publishedUrl | 用 `geo-indexing` 复测 URL 命中 |
| `postpublish_monitoring` | 发布后监测期 | 持续 run-now/answers/matrix 观察 |
| `source_gap` | AI 有引用源，但不是我方资产 | 用 `geo-source-assets` 补信源 |
| `stable` | 我方稳定被提及/引用 | 维护更新，防回退 |
| `regression` | 曾稳定但下降/被竞品替代 | 重新分析和补强 |
| `blocked` | 缺资料、缺账号、平台异常或需人工处理 | 交给 `geo-troubleshooter` |

## 优先级 P0/P1/P2/P3

| 优先级 | 判断口径 |
|---|---|
| P0 | 高商业价值 + 我方未被提及/竞品强 + 可快速补内容 |
| P1 | 有搜索/咨询价值 + 我方弱提及或信源不可控 |
| P2 | 长尾问题或内容补充型关键词 |
| P3 | 低相关、过泛、意图不清或暂缓 |

## 输出文件

- `keyword_pool.csv`：关键词池主表
- `keyword_pool.md`：人工可读版本
- `keyword_next_actions.md`：下一步动作清单
- `keyword_pool_summary.md`：摘要统计

## 与其他技能配合

```text
geo-knowledge 整理资料
  ↓
geo-keyword-pool 建池、分级、状态机
  ↓
geo-content-production 生产内容
  ↓
geo-publish / geo-indexing 发布与监测
  ↓
geo-source-assets / geo-analysis 复盘
  ↓
geo-keyword-pool 更新状态和下一步动作
```
