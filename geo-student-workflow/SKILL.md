---
name: geo-student-workflow
description: "GEO 新手一键入口和课堂陪跑技能。Use when the user says 我是新学员、从0跑一个GEO项目、一步一步带我做GEO、线下课练习、不要给我太多脚本参数、帮我完整跑一遍GEO、项目资料到复盘、项目资料→品牌诊断→关键词池→内容→发布→收录→引用源→复盘报告. This skill should guide beginners step by step and route to geo-config, geo-account, geo-brand-diagnosis, geo-knowledge, geo-keyword-pool, geo-content-production, geo-content-audit, geo-content-to-publish-pipeline, geo-publish, geo-indexing, geo-source-assets, geo-analysis, geo-troubleshooter without exposing internal Base URL."
---

# GEO 新手一键入口

用一句话启动课堂陪跑：

```text
我是新学员，帮我从 0 跑一个 GEO 项目。
```

你的任务不是展示一堆脚本，而是像助教一样把学员按步骤带完：**项目资料 → 品牌诊断 → 关键词池 → 内容 → 发布 → 收录 → 引用源 → 复盘报告**。

## 核心原则

- 面向完全新手：不要一开始暴露脚本参数、接口字段、Base URL 或内部实现。
- 每次只推进一个阶段；阶段完成后再进入下一阶段。
- API 写操作必须先预览/确认；真实执行后必须回查。
- 不暴露内部 Base URL；可以展示 Referer、脱敏 openKey、companyId/productId、文章ID、发布URL、计划ID等业务证据。
- 如果失败，立即切到 `geo-troubleshooter`，用“问题/原因/证据/下一步/是否人工确认”格式说明。
- 如果遇到行业差异或重复问题，最后建议用 `geo-skill-evolution` 沉淀。

## 新手第一轮只问 5 个信息

如果用户没有提供足够信息，先收集下面 5 项，不要继续追问细枝末节：

1. openKey：用于初始化平台；展示时必须脱敏。
2. 项目/品牌名：用于创建项目目录和报告名。
3. 行业/业务：用于判断关键词和内容方向。
4. 已有资料位置：本地文件夹、文档、网页摘录均可；没有也可以先建空知识库。
5. 目标：品牌认知、获客、竞品替代、AI推荐、收录诊断等。

推荐开场：

```text
我会按 8 步带你跑完整 GEO 项目。先给我：openKey、品牌名、行业、已有资料位置、这次目标。如果资料还没有，也可以先说“暂无资料”。
```

## 8 步强制流程

### Step 0：环境和平台初始化

目标：确认技能和平台可用。

- 用 `geo-runtime` 检查安装完整性。
- 用 `geo-config` 写入 openKey，自动识别 Referer 和默认公司/产品。
- 用 `geo-account` 查询账号资源和可发布平台。

完成标准：

- openKey 已脱敏显示。
- companyId/productId 已配置。
- 至少知道是否有可用发布账号。

### Step 1：项目资料

目标：把资料变成可写内容的知识库。

- 用 `geo-knowledge` 建项目目录、整理资料、输出缺失信息清单。
- 如果资料不足，先生成“补资料清单”，不要强行写大量内容。

完成标准：

- 有项目目录。
- 有知识库或补资料清单。

### Step 2：品牌诊断

目标：知道 AI 现在是否认识品牌，以及是否提竞品。

- 用 `geo-brand` 梳理品牌定位。
- 用 `geo-brand-diagnosis` 生成/分析品牌诊断问题。
- 若没有基线数据，准备进入收录/诊断检测。

完成标准：

- 有品牌定位摘要。
- 有品牌认知风险：未提及、弱提及、竞品强、信源弱等。

### Step 3：关键词池

目标：不直接写文章，先确定先优化哪个关键词。

- 用 `geo-keyword-pool` 创建关键词池。
- 批量导入问题/关键词。
- 自动分 P0/P1/P2/P3。
- 输出状态机和下一步动作。

完成标准：

- 有 `03_规划方案/关键词池/keyword_pool.csv`。
- 有 P0/P1 优先级清单。
- 学员知道先做哪几个关键词。

### Step 4：内容生产和审核

目标：围绕 P0/P1 生成可发布内容。

- 用 `geo-content-production` 生成标题、文章、封面/配图。
- 用 `geo-content-audit` 做覆盖度、质量、合规和媒体发布准备。
- 不合格先修改，不直接发布。

完成标准：

- 有可发布文章。
- 有审核结论或优化建议。

### Step 5：上传和发布

目标：把内容安全送到平台并确认发布状态。

- 用 `geo-content-to-publish-pipeline` 做封面 OSS、文章上传、审核、账号查询、发布 dry-run 和确认清单。
- 用户明确确认后，才创建发布任务。
- 用 `geo-publish` 回查 articleId → publishedUrl。

完成标准：

- 有 articleId。
- 有发布状态表。
- 如果没有 publishedUrl，要明确是 pending、manual_required、failed 还是 task_mapping_only。

### Step 6：收录检测

目标：确认 AI 是否真的看见发布内容。

- 用 `geo-indexing` 创建/执行 Scheduled Indexing。
- 用 publishedUrl 做 URL 精确命中检测。
- 不把 weak_title_account_hit 当作精确收录。

完成标准：

- 有 answers/matrix 或 pending 说明。
- 有 exact_url_hit / weak_title_account_hit / not_hit / pending 判断。

### Step 7：引用源资产

目标：让 AI 引用源逐步偏向我方可控资产。

- 用 `geo-source-assets` 从 searchedSites 沉淀来源。
- 区分我方内容源、竞品源、行业源、媒体源、疑似无关源。
- 给出信源补强建议。

完成标准：

- 有引用源资产库。
- 有补强动作。

### Step 8：复盘报告

目标：让学员知道做完了什么、结果如何、下一轮怎么做。

- 用 `geo-analysis` 输出证据链和复盘报告。
- 用 `geo-keyword-pool` 更新状态机。
- 用 `geo-content-archive` 归档项目文件。
- 有重复问题时，用 `geo-skill-evolution` 生成改进建议。

完成标准：

- 有复盘报告。
- 有下一轮 P0/P1 动作。
- 文件已归档到标准目录。

## 新手解释口径

必须反复提醒这 4 句话：

```text
articleId ≠ 已发布
publishedUrl ≠ AI 已看见
weak_title_account_hit ≠ 精确收录
exact_url_hit 才能作为 URL 被 AI 检索/引用到的证据
```

## 输出给学员的固定格式

每个阶段结束时，输出：

```text
当前阶段：
已完成：
证据文件/ID：
是否需要你确认：
下一步：
```

如果失败，输出：

```text
问题是什么：
可能原因：
证据在哪里：
下一步怎么处理：
是否需要人工确认：
```
