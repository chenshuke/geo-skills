# GEO 双入口技能说明书

更新时间：2026-04-23
位置：`./`

---

## 1. 总体结构

你的 GEO 私有技能体系目前有两个总入口：

### A. `geo-hub`
**定位**：GEO 平台 API 统一操作入口  
**适用方向**：平台数据查询、上传、删除、配置、发布、报表、主题拓展等“系统执行类”工作。

### B. `geo-workflow-hub`
**定位**：GEO 运营工作流统一入口  
**适用方向**：品牌创建、知识库搭建、关键词规划、标题生成、内容创作、审核优化、收录监测、数据分析等“运营策划与交付类”工作。

---

## 2. 两个入口的分工

### `geo-hub` 负责什么
适合处理：
- 查账号
- 查文章
- 上传文章 / 图片
- 删除文章 / 删除收录任务
- 创建发布任务
- 主题拓展任务操作
- 查平台报表 / dashboard
- 查套餐 / 视频 / 售前售后报告
- 配置 openKey / 平台认证

一句话理解：
> **凡是偏“调 GEO 平台接口、查平台数据、改平台数据”的，优先走 `geo-hub`。**

### `geo-workflow-hub` 负责什么
适合处理：
- 创建品牌
- 搭建知识库
- 做关键词规划
- 生成标题
- 创作 GEO 内容
- 审核内容
- 做覆盖优化
- 做 GEO 方案与交付流程
- 串联发布、收录、复盘流程

一句话理解：
> **凡是偏“做 GEO 运营方案、内容生产、审核优化、完整交付流程”的，优先走 `geo-workflow-hub`。**

---

## 3. `geo-hub` 子技能地图

### 3.1 配置与认证
- `geo-config`
- `auto-login`

### 3.2 账号与平台数据
- `geo-account-list`
- `geo-dashboard`
- `geo-package`
- `geo-video`

### 3.3 内容与素材上传
- `upload-article`
- `upload-image`
- `generate-cover`
- `geo-image-generation` (v1.0) — AI 图片生成，支持文生图/图生图/多参考图合成，可选自动上传到 GEO OSS
- `geo-article-create`
- `geo-article-list`
- `geo-article-review`
- `geo-article-delete`

### 3.4 发布与状态
- `geo-publish-create`
- `check-publication-status`

### 3.5 收录与监测
- `geo-indexing-check`
- `geo-indexing-list`
- `geo-indexing-delete`
- `geo-indexing-batch-import`

### 3.6 拓展与报表
- `geo-topic-expand`
- `geo-report`
- `geo-presale-report`
- `bihuo-geo-quotation`
- `html-to-png`

---

## 4. `geo-workflow-hub` 子技能地图

### 4.1 品牌与项目启动
- `geo-create-enterprise`
- `geo-create-product`
- `geo-create-personal`
- `geo-create-acquisition`

### 4.2 知识库建设
- `create-kb`
- `organize-kb`
- `extract-docx`
- `supplement-list`

### 4.3 关键词与意图规划
- `geo-keyword-plan`
- `geo-keyword-builder`
- `build-intent-tree`

### 4.4 标题与内容生产
- `geo-title-generator`
- `geo-aggregate-title`
- `geo-batch-create`
- `geo-create-media-articles`
- `geo-image-generation` — AI 图片生成，支持文生图/图生图/多参考图合成，可选自动上传到 GEO OSS

### 4.5 内容审核与优化
- `geo-review`
- `audit-consistency`
- `audit-media-readiness`
- `audit-ai-detection`
- `check-coverage`
- `optimize-content`
- `analyze-gaps`
- `create-compliant-ranking`

### 4.6 计划同步与执行衔接
- `sync-geo-plan`

### 4.7 数据分析与逆向
- `geo-evidence-chain` — 证据链分析，评估引用来源分布与完整性，生成发布策略矩阵
- `geo-platform-reverse` — AI平台引用机制逆向分析，全量读取引用链接深度分析，积累平台和行业知识库

---

## 5. 实际使用时的路由规则

### 默认走 `geo-hub` 的指令
- 帮我查一下账号列表
- 帮我把文章上传到 GEO
- 看看最近的收录任务
- 删除这批文章
- 创建发布任务
- 跑一轮 topic expand
- 查这个 GEO 报告
- 看一下 dashboard

### 默认走 `geo-workflow-hub` 的指令
- 帮我做一个 GEO 方案
- 给这个客户搭知识库
- 先做关键词规划
- 帮我批量生成标题
- 分析AI平台引用机制 / 做平台逆向分析 → `geo-platform-reverse`
- 做证据链分析 / 分析引用来源分布 → `geo-evidence-chain`
- 产出这批 GEO 内容
- 审核一下这批文章
- 检查覆盖度并优化
- 帮我串一下完整 GEO 交付流程

---

## 6. 一句话路由口诀

### 平台执行类
**查 / 传 / 删 / 发 / 配 / 报 / 拓展** → `geo-hub`

### 运营交付类
**建 / 规 / 写 / 审 / 优 / 复盘** → `geo-workflow-hub`

---

## 7. 默认约定

后续在没有额外说明时：
- 用户提到“平台操作 / API / 数据查询 / 上传发布” → 默认按 `geo-hub` 理解
- 用户提到“GEO运营 / 工作流 / 方案 / 内容交付” → 默认按 `geo-workflow-hub` 理解
- 如果用户给的是完整交付目标，我先按 `geo-workflow-hub` 拆解，再按需要调用 `geo-hub` 完成平台执行

---

## 8. 推荐的协作方式

最优方式是：
1. 先用 `geo-workflow-hub` 做方案、规划、内容与审核
2. 再用 `geo-hub` 完成平台落地、发布、查询、监测与回收数据

即：
> **`geo-workflow-hub` 负责“想清楚并做出来”，`geo-hub` 负责“落到平台并看结果”。**
