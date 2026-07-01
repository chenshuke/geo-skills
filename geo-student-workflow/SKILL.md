---
name: geo-student-workflow
description: "GEO 课程/新手统一入口，支持三种模式：快速闭环模式、20问题上榜战役模式、持续运营飞轮模式。Use when the user says 我是新学员、从0跑一个GEO项目、私教班、快速跑通GEO闭环、4980、大师班、9800、20个问题上榜、20问题实战、带项目拿结果、持续运营飞轮、不断优化知识库和关键词池、一步一步带我做GEO、线下课练习、不要给我太多脚本参数、帮我完整跑一遍GEO. This skill selects the right mode, guides step by step, and routes to geo-config, geo-account, geo-knowledge, geo-brand-diagnosis, geo-keyword-pool, geo-content-production, geo-content-audit, geo-content-to-publish-pipeline, geo-publish, geo-indexing, geo-source-assets, geo-analysis, geo-troubleshooter without exposing internal Base URL."
---

# GEO 课程/新手统一入口

本技能是课程交付的一句话入口，不新增分裂流程；用**一个入口**按学员阶段选择**三种模式**，底层复用同一套 GEO Skills。

## 三种模式

| 模式 | 适合对象 | 目标 | 默认深度 |
|---|---|---|---|
| `quick_loop` 快速闭环模式 | 私教班/4980/首次体验 | 快速跑通安装、知识库、内容、上传发布、查收录 | 1-3 个关键词/文章 |
| `twenty_question_campaign` 20问题上榜战役模式 | 大师班/9800/带项目实战 | 围绕 20 个问题做基线、内容资产、发布资产、收录复盘和持续计划 | 20 个问题 |
| `continuous_flywheel` 持续运营飞轮模式 | 高阶学员/内部实战/长期交付 | 知识库、关键词池、内容、发布、收录、信源、复盘持续迭代 | 持续循环 |

## 模式识别

- 用户说“私教班 / 4980 / 快速跑通 / 快速闭环 / 先跑一遍” → `quick_loop`
- 用户说“大师班 / 9800 / 20个问题 / 上榜 / 带项目拿结果 / 实战拿结果” → `twenty_question_campaign`
- 用户说“持续运营 / 飞轮 / 不断优化 / 下一轮优化 / 长期迭代 / 我自己实战” → `continuous_flywheel`
- 用户只说“我是新学员，帮我从 0 跑一个 GEO 项目” → 先询问学员类型；若用户不确定，默认 `quick_loop`。

## 通用安全原则

- 面向新手时不要一开始展示脚本参数、接口字段、Base URL 或内部实现。
- API 写操作必须先预览/确认；真实执行后必须回查。
- 不暴露内部 Base URL；可以展示 Referer、脱敏 openKey、companyId/productId、articleId、publishedUrl、scheduleId 等业务证据。
- 如果失败，立即切到 `geo-troubleshooter`，固定输出“问题/原因/证据/下一步/是否人工确认”。
- 遇到行业差异或重复问题，最后建议助教/内部团队用 `geo-skill-evolution` 沉淀。

## 通用开场

如果信息不足，先收集 5 项：

1. openKey：用于初始化平台；展示时必须脱敏。
2. 项目/品牌名：用于项目目录和报告名。
3. 行业/业务：用于关键词和内容方向。
4. 已有资料位置：本地文件夹、文档、网页摘录均可；没有就先建空知识库。
5. 课程/目标：私教班快速闭环、大师班20问题上榜、持续运营飞轮，或其他目标。

推荐开场：

```text
我会先帮你选模式，再一步步跑。请给我：openKey、品牌名、行业、已有资料位置、这次目标/班型。如果资料还没有，也可以说“暂无资料”。
```

## 模式一：快速闭环模式（私教班）

目标：让学员快速看到完整 GEO 链路，不追求一次性极致效果。

```text
安装技能 → 初始化项目 → 整理知识库 → 关键词方案 → 标题方案 → 内容 → 上传 GEO → 创建发布任务 → 查询收录任务 → 简单闭环报告
```

### 默认执行顺序

1. `geo-runtime`：检查技能安装和运行环境。
2. `geo-config` + `geo-account`：写入 openKey，配置默认公司/产品，确认账号资源。
3. `geo-knowledge`：初始化项目文件夹并整理知识库；资料不足则输出补资料清单。
4. `geo-content-production`：生成少量关键词方案、标题方案和内容。
5. `geo-content-audit`：做发布前质量检查。
6. `geo-content-to-publish-pipeline`：上传文章、封面/图片 OSS、生成发布确认清单。
7. `geo-publish`：创建发布任务并回查 articleId → publishedUrl。
8. `geo-indexing`：创建/执行收录任务，查询 answers/matrix 或 pending。
9. `geo-analysis`：输出简单闭环报告。

### 产物要求

- 项目目录和知识库。
- 1-3 个关键词/标题/文章。
- 文章上传记录和发布状态表。
- 收录检测结果或 pending 说明。
- 简单复盘：已完成、证据、下一步。

## 模式二：20问题上榜战役模式（大师班）

目标：围绕 20 个优质问题做项目实战，形成可持续优化的资产地图。

```text
整理知识库 → 筛选20问题 → 基线查询 → 分析AI回复/引用源 → 创作任务方案 → 证据包/内容资产 → 创作配图审核 → 多平台发布 → 发布回查 → 收录复测 → 资产地图 → 持续优化计划
```

### 默认执行顺序

1. `geo-knowledge`：整理项目资料和证据包，输出缺口。
2. `geo-keyword-pool`：筛选/导入 20 个优质问题，建立 P0/P1/P2/P3 和状态机。
3. `geo-indexing`：对 20 个问题做 AI 基线查询，拿 answers/matrix。
4. `geo-source-assets` + `geo-analysis`：分析 AI 回复、竞品、searchedSites 和引用源。
5. `geo-content-production`：为 20 个问题生成创作任务方案：标题、内容类型、发布平台偏好。
6. `geo-knowledge` + `geo-source-assets`：补强证据包、内容资产和可控信源。
7. `geo-content-production` + `geo-content-audit`：批量创作内容、配图、审核。
8. `geo-content-to-publish-pipeline` + `geo-publish`：发布到多平台并记录 articleId/publishedUrl/状态。
9. `geo-indexing`：复测 publishedUrl 精确命中和弱命中。
10. `geo-analysis` + `geo-keyword-pool`：构建 20 问题资产地图，更新状态，输出持续优化计划。

### 产物要求

- `20问题关键词池`：问题、优先级、状态、下一步动作。
- `20问题基线分析`：AI 是否提我方、竞品、引用源。
- `20问题创作任务方案`：创作什么标题、什么类型内容、发布到什么平台。
- `发布结果表`：articleId、publishedUrl、平台、状态、人工处理/失败原因。
- `收录复测表`：exact_url_hit / weak_title_account_hit / not_hit / pending。
- `资产地图`：问题 → 内容资产 → 发布资产 → 引用源资产 → 当前状态 → 下一步。

## 模式三：持续运营飞轮模式

目标：把 GEO 从一次项目变成长期增长系统。

```text
知识库更新 → 关键词池更新 → 最新收录/引用源分析 → 新内容/发布方案 → 创作审核发布 → 收录复测 → 状态机更新 → 下一轮优化
```

### 默认执行顺序

1. `geo-knowledge`：持续补充新资料、新案例、新证据、新 FAQ。
2. `geo-keyword-pool`：持续维护关键词池状态，输出下一批 P0/P1。
3. `geo-indexing`：查询最新收录结果和 AI 回复变化。
4. `geo-source-assets` + `geo-analysis`：分析最新引用源、竞品和内容缺口。
5. `geo-content-production`：生成新一轮关键词/标题/内容/发布方案。
6. `geo-content-audit`：审核内容质量和覆盖度。
7. `geo-content-to-publish-pipeline` + `geo-publish`：发布并回查。
8. `geo-indexing`：复测 publishedUrl 命中。
9. `geo-keyword-pool` + `geo-content-archive`：更新状态机并归档。
10. `geo-skill-evolution`：由助教/内部团队把重复问题沉淀为技能改进。

### 产物要求

- 持续更新的知识库。
- 持续更新的关键词池和状态机。
- 每轮内容/发布/收录复盘。
- 引用源资产库和补强计划。
- 下一轮 P0/P1 优化清单。

## 必须反复提醒的新手判断口径

```text
articleId ≠ 已发布
publishedUrl ≠ AI 已看见
weak_title_account_hit ≠ 精确收录
exact_url_hit 才能作为 URL 被 AI 检索/引用到的证据
```

## 每个阶段固定输出

```text
当前模式：
当前阶段：
已完成：
证据文件/ID：
是否需要你确认：
下一步：
```

失败时输出：

```text
问题是什么：
可能原因：
证据在哪里：
下一步怎么处理：
是否需要人工确认：
```
