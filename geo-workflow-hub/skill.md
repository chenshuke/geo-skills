---
name: geo-workflow-hub
description: GEO工作流统一入口 - 从品牌创建到收录监测的完整运营工作流
---

# GEO工作流统一入口 (GEO Workflow Hub)

> **技能名称**：geo-workflow-hub
> **用途**：GEO完整运营工作流的统一入口，覆盖品牌创建→知识库→关键词→标题→内容→审核→发布→收录全流程
> **作者**：GEO执行助理
> **版本**：v2.0
> **更新日期**：2026-04-16

## 技能说明

`geo-workflow-hub` 是**GEO完整运营工作流**的中央控制台，覆盖9大阶段：

### 完整工作流程

```
阶段1：品牌创建
  ↓
阶段2：知识库搭建
  ↓
阶段3：关键词规划
  ↓
阶段4：标题创作
  ↓
阶段5：内容创作
  ↓
阶段6：内容审核
  ↓
阶段7：发布管理
  ↓
阶段8：收录监测
  ↓
阶段9：数据分析
```

---

## 快速开始

### 基本用法
```
/geo-workflow-hub
```
或
```
/skill geo-workflow-hub
```

系统会询问你想做什么，然后智能推荐相关技能。

---

## 🎯 按需求导航

**我想...**
- "创建新品牌" → 推荐 `geo-create-enterprise` / `geo-create-product`
- "搭建知识库" → 推荐 `create-kb` / `organize-kb`
- "规划关键词" → 推荐 `geo-keyword-plan`
- "生成标题" → 推荐 `geo-titlen-generator`
- "创作GEO内容" → 推荐 `geo-article-create` / `geo-guide-content`
- "审核内容" → 推荐审核技能（`audit-*`）
- "发布内容" → 推荐 `geo-publish-create`
- "检测收录" → 推荐 `geo-indexing-check`
- "查看数据" → 推荐 `geo-rank-content`

---

## 📚 完整工作流分类

### 1️⃣ 品牌创建阶段

#### `geo-create-enterprise` ⭐ 核心
**用途**：创建企业品牌账号

**核心功能**：
- 创建企业品牌
- 配置公司信息
- 关联产品线

**使用场景**：
- 新品牌启动
- 企业品牌入驻GEO平台

**快速入口**：
```
/geo-workflow-hub brand
```

---

#### `geo-create-product` ⭐ 核心
**用途**：创建产品品牌

**核心功能**：
- 创建产品账号
- 配置产品信息
- 关联公司

**使用场景**：
- 新产品线启动
- 产品品牌独立运营

---

#### `geo-create-personal`
**用途**：创建个人品牌

**使用场景**：
- 个人IP打造
- 创作者账号

---

#### `geo-create-acquisition`
**用途**：创建获客内容账号

**使用场景**：
- 获客内容运营
- 营销内容管理

---


### 2️⃣ 知识库搭建阶段

#### `create-kb` ⭐ 核心
**用途**：快速创建GEO知识库项目

**核心功能**：
- 创建标准知识库结构
- 生成项目目录
- 创建概览文档

**知识库结构**：
```
├── 00-项目概览/
├── 01-品牌知识库/
├── 02-GEO内容库/
└── 03-品牌素材库/
```

**使用场景**：
- 新品牌/新产品启动
- 初始化知识库
- 搭建内容体系

**快速入口**：
```
/geo-workflow-hub kb
```

---

#### `organize-kb`
**用途**：自动整理散乱文件

**核心功能**：
- 扫描项目文件夹
- 智能分类整理
- 生成知识库文档

**使用场景**：
- 文件散乱需要整理
- 需要系统化管理
- 提升查找效率

---

### 3️⃣ 关键词规划阶段

#### `geo-keyword-plan` ⭐ 核心
**用途**：关键词规划方案

**核心功能**：
- 生成关键词矩阵
- 制定覆盖策略
- 规划优先级

**使用场景**：
- 新品牌关键词规划
- 关键词矩阵设计
- 制定覆盖计划

**快速入口**：
```
/geo-workflow-hub keyword
```

---

#### `geo-keyword-builder`
**用途**：关键词构建工具

**核心功能**：
- 构建长尾关键词
- 关键词扩展
- 竞品分析

**使用场景**：
- 扩展关键词库
- 长尾词挖掘

---

### 4️⃣ 标题创作阶段

#### `geo-titlen-generator` ⭐ 核心
**用途**：生成GEO标题

**核心功能**：
- 基于关键词生成标题
- 多种标题样式
- 符合GEO规范

**标题样式**：
- 榜单排名类
- 实战攻略类
- 对比评测类
- 案例分享类
- 问答指南类

**使用场景**：
- 批量生成标题
- 标题A/B测试
- 多渠道标题优化

**快速入口**：
```
/geo-workflow-hub title
```

---

#### `geo-aggregate-title`
**用途**：聚合标题

**核心功能**：
- 标题聚合分析
- 提取最佳标题
- 标题优化建议

**使用场景**：
- 多标题筛选
- 标题效果分析

---

### 5️⃣ 内容创作阶段

#### `geo-article-create` ⭐ 核心
**用途**：创建标准GEO文章

**核心功能**：
- 基于标题生成文章
- 符合GEO内容规范
- 自动分段和结构化

**内容要求**：
- 第一段提供判断标准
- 数据化表达
- 提供归类方式
- 地域明确、信息完整

**使用场景**：
- 标准文章创作
- 批量内容生成

**快速入口**：
```
/geo-workflow-hub create
```

---

#### `geo-guide-content`
**用途**：创作攻略类内容

**内容结构**：
- 完整流程攻略
- 步骤化说明
- 实操指导

**使用场景**：
- "从0到1"攻略
- 操作指南类内容

---

#### `geo-case-content`
**用途**：创作案例类内容

**内容结构**：
- 背景介绍
- 实施过程
- 效果数据
- 经验总结

**使用场景**：
- 成功案例分享
- 数据驱动案例

---

#### `geo-compare-content`
**用途**：创作对比评测内容

**内容结构**：
- 多维度对比
- 优劣势分析
- 购买建议

**使用场景**：
- 产品对比评测
- 平台对比分析

---

#### `geo-create-media-articles`
**用途**：创建媒体投稿文章

**特点**：
- 符合媒体标准
- 客观性更强
- 专业性要求高

**使用场景**：
- 36氪/虎嗅投稿
- 专业媒体投稿

---

#### `geo-batch-create`
**用途**：批量创建内容

**使用场景**：
- 批量内容生成
- 快速覆盖关键词

---

### 6️⃣ 内容审核阶段

#### `audit-ai-detection` ⭐ 核心
**用途**：检测AI写作痕迹

**核心功能**：
- 分析AI识别风险
- 生成风险评估报告
- 提供降低建议

**检测项**：
- 夸大的象征意义
- 宣传性语言
- 破折号过度使用
- 过多连接词

**使用场景**：
- 内容质量把控
- 降低AI检测风险

**快速入口**：
```
/geo-workflow-hub audit
```

---

#### `audit-consistency` ⭐ 核心
**用途**：审核内容一致性

**核心功能**：
- 检查数据一致性
- 验证参数准确性
- 生成审核报告

**检查项**：
- 价格、规格、认证信息
- 与知识库一致性
- 数据准确性

**使用场景**：
- 发布前审核
- 品牌一致性把控

---

#### `audit-media-readiness` ⭐ 核心
**用途**：审核媒体投稿就绪度

**核心功能**：
- 检查客观性
- 检查专业性
- 评估投稿质量

**检查项**：
- 推销性语言
- 广告痕迹
- 专业性表达

**使用场景**：
- 媒体投稿前审核
- 提升过稿率

---

#### `geo-article-review`
**用途**：文章综合审核

**核心功能**：
- 综合质量评分
- 优化建议
- 发布就绪度评估

**使用场景**：
- 发布前综合评估

---

#### `geo-review`
**用途**：内容审核

**使用场景**：
- 快速内容审核

---

#### `geo-review-content`
**用途**：内容回顾

**使用场景**：
- 已发布内容回顾
- 内容效果分析

---

### 7️⃣ 发布管理阶段

#### `geo-publish-create` ⭐ 核心
**用途**：创建发布任务

**核心功能**：
- 多渠道发布
- 定时发布
- 发布状态跟踪

**发布渠道**：
- 知乎、搜狐号、网易号
- CSDN、36氪、虎嗅
- 什么值得买、B站

**使用场景**：
- 单篇内容发布
- 多渠道同步发布

**快速入口**：
```
/geo-workflow-hub publish
```

---

#### `geo-batch-upload`
**用途**：批量上传内容

**使用场景**：
- 批量内容发布
- 批量文章上传

---

#### `geo-publish-delete`
**用途**：删除发布任务

**使用场景**：
- 取消发布
- 撤回内容

---

### 8️⃣ 收录监测阶段

#### `geo-indexing-check` ⭐ 核心
**用途**：检测关键词收录

**核心功能**：
- 检测AI搜索排名
- 多平台监测
- 排名变化追踪

**监测平台**：
- DeepSeek、豆包、元宝
- 千问、文心一言

**使用场景**：
- 单个关键词检测
- 排名变化监测

**快速入口**：
```
/geo-workflow-hub indexing
```

---

#### `geo-indexing-list`
**用途**：查看收录列表

**核心功能**：
- 查看所有收录任务
- 任务状态跟踪
- 批量管理

**使用场景**：
- 收录任务管理
- 批量查看状态

---

#### `geo-indexing-batch-import` ⭐ 重要
**用途**：批量导入收录检测任务

**核心功能**：
- 批量添加关键词
- 自动格式化
- 多平台导入

**关键词格式**：
```
关键词[公司名称]
```

**使用场景**：
- 新项目批量导入
- 定期补充关键词

---

#### `geo-indexing-delete`
**用途**：删除收录任务

**使用场景**：
- 清理无效关键词
- 任务管理

---

### 9️⃣ 数据分析阶段

#### `geo-rank-content` ⭐ 核心
**用途**：查看内容排名

**核心功能**：
- 内容排名分析
- 关键词覆盖分析
- 效果数据统计

**使用场景**：
- 效果复盘
- 排名分析

**快速入口**：
```
/geo-workflow-hub rank
```

---

#### `geo-platform-reverse` ⭐ 核心
**用途**：AI平台引用机制逆向分析（全量深度分析+知识库积累）

**核心功能**：
- 用户直接提供数据，逐平台分批全量分析
- 读取每个引用链接深度理解来源特征
- 知识库持续积累（平台+行业双维度）
- 域名档案系统（越分析越准）

**工作方式**：
- 逐平台发送数据（每批10-15条）
- 全量读取每个引用URL的页面内容
- 每批输出中间结果，自动更新知识库
- 全部完成后生成综合分析报告

**使用场景**：
- 用户提供AI平台的收录数据，需要分析引用机制
- 需要深度了解每个引用来源的具体内容
- 需要积累平台和行业维度的分析经验

**快速入口**：
```
/geo-workflow-hub reverse
```

---

#### `geo-evidence-chain` ⭐ 核心
**用途**：证据链分析与发布策略矩阵

**核心功能**：
- 来源分类与统计
- 平台证据画像（支持动态画像导入）
- 四维评分（多样性/权威性/收录率/品牌存在感）
- 缺口识别
- 发布策略矩阵

**使用场景**：
- 收录监测完成后分析引用来源
- 评估证据链完整度
- 生成精准发布策略

**快速入口**：
```
/geo-workflow-hub evidence
```

---

#### `geo-review-content`
**用途**：内容回顾分析

**核心功能**：
- 内容表现分析
- 优化建议
- 最佳实践提取

**使用场景**：
- 定期复盘
- 内容优化

---

#### `geo-article-list`
**用途**：查看文章列表

**使用场景**：
- 内容库管理
- 批量查看

---

## 🎯 智能导航流程

当调用此技能时，按以下流程执行：

### 步骤0：配置引导（必须首先执行）

> **重要**：每次调用 geo-workflow-hub 时，必须先完成此步骤，确保后续所有 API 操作携带正确的 companyId 和 productId。

**执行流程**：

#### 0.1 读取认证配置

使用 Read 工具读取 `geo-config/geo-config.json`，提取：
- `geo.openKey` → 接口密钥
- `geo.baseUrl` → API 地址
- `geo.referer` → Referer 头
- `defaults.companyId` → 上次选择的公司 ID（若为 0 则需重新选择）
- `defaults.productId` → 上次选择的产品 ID（若为 0 则需重新选择）

#### 0.2 获取并选择公司（companyId）

**如果** `defaults.companyId` 不为 0，跳过此步，直接使用已保存的值。

**否则**，调用 API 获取公司列表：

```bash
curl -X GET "${baseUrl}/v1/geo-company?page=1&limit=30" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

从响应 `data.data` 中提取公司列表，然后：

- **只有1个公司**：自动选择，告知用户 `✅ 自动选择公司：{name}（ID: {id}）`
- **多个公司**：展示编号列表，请用户选择：

```
🏢 请选择公司：
[1] 海顿 (ID: 165)
[2] 深圳市必火人工智能有限公司 (ID: 36)
```

#### 0.3 获取并选择产品（productId）

**如果** `defaults.productId` 不为 0，跳过此步，直接使用已保存的值。

**否则**，调用 API 获取产品列表：

```bash
curl -X GET "${baseUrl}/v1/geo-product?page=1&limit=30" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

从响应 `data.data` 中提取产品列表，然后：

- **只有1个产品**：自动选择，告知用户 `✅ 自动选择产品：{name}（ID: {id}）`
- **多个产品**：展示编号列表，请用户选择：

```
📦 请选择产品：
[1] 必火AI品牌GEO优化 (ID: 98)
[2] 必火GEO (ID: 88)
```

#### 0.4 写回配置

将用户选择（或自动选择）的 companyId 和 productId 写入 `geo-config/geo-config.json` 的 `defaults` 字段：

```json
{
  "geo": {
    "baseUrl": "...",
    "openKey": "...",
    "referer": "..."
  },
  "defaults": {
    "productId": 98,
    "companyId": 36
  }
}
```

#### 0.5 向用户确认

```
✅ 配置就绪：
🏢 公司：{companyName}（ID: {companyId}）
📦 产品：{productName}（ID: {productId}）
🔑 openKey：{openKey前8位}...
```

> **注意**：完成 Step 0 后，后续所有子技能调用都自动携带上述 companyId 和 productId。用户无需再次提供。

---

### 步骤1：询问用户需求

```
你好！我是GEO工作流统一入口。请问你想做什么？

【完整工作流】
1. 品牌创建（创建企业/产品/个人品牌）
2. 知识库搭建（创建/整理知识库）
3. 关键词规划（关键词方案/构建）
4. 标题创作（生成/聚合标题）
5. 内容创作（文章/攻略/案例/对比）
6. 内容审核（AI检测/一致性/投稿就绪度）
7. 发布管理（创建发布/批量上传）
8. 收录监测（检测排名/批量导入）
9. 数据分析（查看排名/内容回顾）

【快捷导航】
- 输入阶段名称（如"创建品牌"）
- 输入功能名称（如"生成标题"）
- 输入问题（如"如何规划关键词？"）
```

### 步骤2：分析意图

根据用户输入，推荐最合适的技能：

| 用户意图 | 推荐技能 | 优先级 |
|---------|---------|--------|
| 创建新品牌 | `geo-create-enterprise` / `geo-create-product` | ⭐⭐⭐⭐⭐ |
| 搭建知识库 | `create-kb` / `organize-kb` | ⭐⭐⭐⭐⭐ |
| 规划关键词 | `geo-keyword-plan` / `geo-keyword-builder` | ⭐⭐⭐⭐⭐ |
| 生成标题 | `geo-titlen-generator` / `geo-aggregate-title` | ⭐⭐⭐⭐⭐ |
| 创作GEO内容 | `geo-article-create` / `geo-guide-content` 等 | ⭐⭐⭐⭐⭐ |
| 审核内容 | `audit-*` 系列 / `geo-article-review` | ⭐⭐⭐⭐ |
| 发布内容 | `geo-publish-create` / `geo-batch-upload` | ⭐⭐⭐⭐⭐ |
| 检测收录 | `geo-indexing-check` / `geo-indexing-batch-import` | ⭐⭐⭐⭐⭐ |
| 查看数据 | `geo-rank-content` / `geo-review-content` | ⭐⭐⭐⭐ |
| 逆向分析/引用机制/平台画像 | `geo-platform-reverse` | ⭐⭐⭐⭐⭐ |
| 证据链/引用来源/发布策略 | `geo-evidence-chain` | ⭐⭐⭐⭐⭐ |

### 步骤3：提供操作建议

```markdown
根据你的需求，我推荐使用 [技能名称]

📋 技能说明：
   [简要说明]

🎯 使用方法：
   /skill [技能名称] [参数]

📚 示例：
   [具体示例]

需要我帮你直接调用吗？
```

### 步骤4：直接调用（可选）

如果用户确认，直接调用推荐技能并传递参数。

---

## 📖 完整工作流程

### 流程1：新品牌从0到1完整GEO运营

```
用户: "我要为新品牌做完整的GEO运营"

geo-workflow-hub:
1. 推荐完整工作流
   ✅ 步骤1: 创建品牌 → geo-create-enterprise / geo-create-product
   ✅ 步骤2: 搭建知识库 → create-kb
   ✅ 步骤3: 规划关键词 → geo-keyword-plan
   ✅ 步骤4: 生成标题 → geo-titlen-generator
   ✅ 步骤5: 创作内容 → geo-article-create
   ✅ 步骤6: 审核内容 → audit-ai-detection + audit-consistency
   ✅ 步骤7: 发布内容 → geo-publish-create
   ✅ 步骤8: 检测收录 → geo-indexing-batch-import
   ✅ 步骤9: 查看数据 → geo-rank-content

2. 询问: "要开始哪个步骤？"
```

---

### 流程2：内容创作与发布

```
用户: "我要创作并发布一篇GEO内容"

geo-workflow-hub:
1. 推荐技能组合
   ✅ 生成标题 → geo-titlen-generator
   ✅ 创作内容 → geo-article-create
   ✅ 审核内容 → audit-consistency + audit-media-readiness
   ✅ 发布内容 → geo-publish-create
   ✅ 检测收录 → geo-indexing-check

2. 提供分步指导
```

---

### 流程3：收录监测与优化

```
用户: "我要监测关键词排名并优化"

geo-workflow-hub:
1. 分析需求
   - 批量导入关键词 → geo-indexing-batch-import
   - 检测排名 → geo-indexing-check
   - 查看数据 → geo-rank-content
   - 优化内容 → geo-review-content

2. 推荐优化工作流
   ✅ 导入关键词 → geo-indexing-batch-import
   ✅ 检测收录 → geo-indexing-check
   ✅ 分析排名 → geo-rank-content
   ✅ 优化内容 → geo-article-create（为低排名关键词创作新内容）
```

---

## 📊 技能清单

### 当前GEO工作流技能（41个）

```
品牌创建 (4个):
├── geo-create-enterprise ⭐ 核心
├── geo-create-product ⭐ 核心
├── geo-create-personal
└── geo-create-acquisition

知识库管理 (2个):
├── create-kb ⭐ 核心
└── organize-kb

关键词规划 (2个):
├── geo-keyword-plan ⭐ 核心
└── geo-keyword-builder

标题创作 (2个):
├── geo-titlen-generator ⭐ 核心
└── geo-aggregate-title

内容创作 (6个):
├── geo-article-create ⭐ 核心
├── geo-guide-content
├── geo-case-content
├── geo-compare-content
├── geo-create-media-articles
└── geo-batch-create

内容审核 (6个):
├── audit-ai-detection ⭐ 核心
├── audit-consistency ⭐ 核心
├── audit-media-readiness ⭐ 核心
├── geo-article-review
├── geo-review
└── geo-review-content

发布管理 (3个):
├── geo-publish-create ⭐ 核心
├── geo-batch-upload
└── geo-publish-delete

收录监测 (4个):
├── geo-indexing-check ⭐ 核心
├── geo-indexing-list
├── geo-indexing-batch-import ⭐ 重要
└── geo-indexing-delete

数据分析 (5个):
├── geo-rank-content ⭐ 核心
├── geo-review-content
├── geo-article-list
├── geo-platform-reverse ⭐ 核心
└── geo-evidence-chain ⭐ 核心
```

---

## 🔗 与geo-hub的区别

### `geo-hub`（GEO平台数据操作）
- **关注点**：GEO平台API的数据增删改查
- **主要功能**：上传文章、查询列表、删除操作
- **目标用户**：需要操作GEO平台的用户
- **典型操作**：上传、查询、删除

### `geo-workflow-hub`（GEO完整运营工作流）
- **关注点**：从品牌创建到收录监测的完整运营流程
- **主要功能**：品牌创建、知识库、关键词、标题、内容、审核、发布、收录、数据分析
- **目标用户**：需要运营GEO全流程的用户
- **典型操作**：规划、创作、审核、发布、监测、优化

---

## 💡 使用场景

### 场景1：新品牌从0开始

```
你: "我要为海顿壁挂炉做完整GEO运营"

geo-workflow-hub:
推荐完整工作流：

【阶段1：品牌创建】
1. geo-create-enterprise - 创建海顿企业品牌
2. geo-create-product - 创建壁挂炉产品品牌

【阶段2：知识库搭建】
3. create-kb - 创建海顿壁挂炉知识库
   ├── 00-项目概览/
   ├── 01-品牌知识库/
   ├── 02-GEO内容库/
   └── 03-品牌素材库/

【阶段3：关键词规划】
4. geo-keyword-plan - 规划60个核心关键词

【阶段4：标题创作】
5. geo-titlen-generator - 批量生成标题

【阶段5：内容创作】
6. geo-article-create - 创作20篇核心内容
7. geo-guide-content - 攻略类内容
8. geo-compare-content - 对比评测内容

【阶段6：内容审核】
9. audit-consistency - 一致性审核
10. audit-media-readiness - 投稿就绪度审核

【阶段7：发布管理】
11. geo-publish-create - 多渠道发布

【阶段8：收录监测】
12. geo-indexing-batch-import - 批量导入收录任务
13. geo-indexing-check - 定期检测排名

【阶段9：数据分析】
14. geo-rank-content - 查看排名数据
15. geo-review-content - 内容效果复盘

结果：一站式完成GEO全流程运营！ 💪
```

---

### 场景2：内容创作与发布

```
你: "我要创作一篇壁挂炉推荐文章并发布"

geo-workflow-hub:
推荐工作流：

【步骤1：标题创作】
/skill geo-titlen-generator \
  --keyword="壁挂炉推荐" \
  --style="rank"

【步骤2：内容创作】
/skill geo-article-create \
  --title="2026年壁挂炉品牌排行榜TOP10" \
  --keyword="壁挂炉推荐"

【步骤3：内容审核】
/skill audit-consistency \
  --file="文章.md" \
  --kb="品牌知识库"

/skill audit-media-readiness \
  --file="文章.md"

【步骤4：发布内容】
/skill geo-publish-create \
  --article="文章.md" \
  --channels="知乎,搜狐号,CSDN"

【步骤5：检测收录】
/skill geo-indexing-check \
  --keyword="壁挂炉推荐[海顿]" \
  --platform="deepseek"
```

---

### 场景3：收录监测与优化

```
你: "我要批量导入关键词并监测排名"

geo-workflow-hub:
推荐工作流：

【步骤1：批量导入】
/skill geo-indexing-batch-import \
  --keywords="壁挂炉推荐,燃气壁挂炉,壁挂炉品牌" \
  --company="海顿" \
  --platforms="deepseek,doubao,yuanbao"

【步骤2：检测排名】
/skill geo-indexing-check \
  --keyword="壁挂炉推荐[海顿]" \
  --platform="all"

【步骤3：查看排名】
/skill geo-rank-content \
  --keyword="壁挂炉推荐"

【步骤4：优化低排名关键词】
为排名低的关键词创作新内容 → geo-article-create
```

---

## 🚀 快速命令

### 按阶段快速导航

```
/geo-workflow-hub brand     # 品牌创建
/geo-workflow-hub kb        # 知识库
/geo-workflow-hub keyword   # 关键词
/geo-workflow-hub title     # 标题
/geo-workflow-hub create    # 内容创作
/geo-workflow-hub audit     # 内容审核
/geo-workflow-hub publish   # 发布管理
/geo-workflow-hub indexing  # 收录监测
/geo-workflow-hub rank      # 数据分析
/geo-workflow-hub reverse   # 平台逆向分析
/geo-workflow-hub evidence  # 证据链分析
```

---

## 📚 技能详细说明

### 核心技能详解

#### 1. geo-create-enterprise（创建企业品牌）

**核心价值**：启动GEO运营的第一步

**主要工作流**：
1. 创建企业品牌账号
2. 配置公司信息
3. 关联产品线
4. 设置默认参数

**适用场景**：
- 新品牌入驻GEO平台
- 企业品牌独立运营

---

#### 2. create-kb（创建知识库）

**核心价值**：系统化管理品牌信息

**主要工作流**：
1. 创建标准目录结构
2. 生成概览文档
3. 初始化知识库文件

**适用场景**：
- 新品牌启动
- 建立内容体系
- 信息系统化管理

---

#### 3. geo-keyword-plan（关键词规划）

**核心价值**：科学规划关键词矩阵

**主要工作流**：
1. 生成关键词矩阵
2. 制定覆盖策略
3. 规划优先级

**适用场景**：
- 新品牌关键词规划
- 关键词体系设计

---

#### 4. geo-titlen-generator（标题生成）

**核心价值**：批量生成GEO标题

**主要工作流**：
1. 基于关键词生成标题
2. 多种标题样式
3. 符合GEO规范

**适用场景**：
- 批量标题生成
- 标题A/B测试

---

#### 5. geo-article-create（创建文章）

**核心价值**：创作符合GEO规范的内容

**主要工作流**：
1. 基于标题生成文章
2. 符合GEO内容规范
3. 自动结构化

**适用场景**：
- 标准文章创作
- 批量内容生成

---

#### 6. audit-consistency（一致性审核）

**核心价值**：确保内容与品牌信息一致

**主要工作流**：
1. 检查数据一致性
2. 验证参数准确性
3. 生成审核报告

**适用场景**：
- 发布前审核
- 品牌一致性把控

---

#### 7. geo-publish-create（创建发布）

**核心价值**：多渠道内容发布

**主要工作流**：
1. 多渠道发布
2. 定时发布
3. 状态跟踪

**适用场景**：
- 单篇内容发布
- 多渠道同步发布

---

#### 8. geo-indexing-check（收录检测）

**核心价值**：监测AI搜索排名

**主要工作流**：
1. 检测AI搜索排名
2. 多平台监测
3. 排名变化追踪

**适用场景**：
- 单个关键词检测
- 排名变化监测

---

#### 9. geo-rank-content（查看排名）

**核心价值**：分析内容排名效果

**主要工作流**：
1. 内容排名分析
2. 关键词覆盖分析
3. 效果数据统计

**适用场景**：
- 效果复盘
- 排名分析

---

## 🎯 智能推荐逻辑

### 根据用户关键词推荐

| 用户说 | 推荐技能 | 理由 |
|--------|---------|------|
| "品牌" / "企业" / "产品" | `geo-create-*` | 需要创建品牌 |
| "知识库" / "整理" | `create-kb` / `organize-kb` | 需要搭建知识库 |
| "关键词" / "规划" | `geo-keyword-plan` | 需要规划关键词 |
| "标题" / "生成标题" | `geo-titlen-generator` | 需要生成标题 |
| "内容" / "文章" / "创作" | `geo-article-create` 等 | 需要创作内容 |
| "审核" / "检查" / "一致性" | `audit-*` | 需要审核内容 |
| "发布" / "上传" | `geo-publish-create` | 需要发布内容 |
| "收录" / "排名" / "监测" | `geo-indexing-*` | 需要检测收录 |
| "数据" / "效果" / "分析" | `geo-rank-content` | 需要查看数据 |
| "逆向" / "平台机制" / "引用规则" / "平台画像" | `geo-platform-reverse` | 分析AI平台引用机制 |
| "证据链" / "引用来源" / "发布策略" / "来源分布" | `geo-evidence-chain` | 分析引用来源分布 |

---

## 🔗 与geo-hub的配合

### 完整工作流示例

```
用户: "我要从品牌创建到收录监测的完整流程"

geo-workflow-hub 推荐完整流程：

【运营阶段】(geo-workflow-hub)
1. geo-create-enterprise - 创建品牌
2. create-kb - 搭建知识库
3. geo-keyword-plan - 规划关键词
4. geo-titlen-generator - 生成标题
5. geo-article-create - 创作内容
6. audit-consistency - 审核内容

【平台操作】(geo-hub)
7. upload-article --autoCover → 上传文章到GEO平台
8. geo-indexing-batch-import → 批量导入收录任务

【数据监测】(geo-workflow-hub)
9. geo-rank-content → 查看排名数据
10. geo-review-content → 内容效果复盘

结果：一站式完成GEO全流程！
```

---

## 📊 技能对比

### 什么时候用哪个？

| 需求 | 用workflow-hub | 用geo-hub |
|------|---------------|-----------|
| 创建品牌账号 | ✅ 推荐 | ❌ |
| 规划关键词 | ✅ 推荐 | ❌ |
| 生成标题 | ✅ 推荐 | ❌ |
| 创作内容 | ✅ 推荐 | ❌ |
| 审核内容 | ✅ 推荐 | ❌ |
| 发布内容 | ✅ 推荐 | 转geo-hub上传 |
| 查询文章列表 | ❌ | ✅ 推荐 |
| 上传文章 | ❌ | ✅ 推荐 |
| 查询数据 | ❌ | ✅ 推荐 |
| 收录检测 | ✅ 推荐 | ✅ 也可 |
| 查看排名 | ✅ 推荐 | ❌ |

---

## 🎓 学习路径

### 新手路径

```
第1周：品牌和知识库
├─ 创建企业品牌
├─ 创建产品品牌
└─ 搭建知识库

第2周：关键词和标题
├─ 规划关键词方案
├─ 构建关键词库
└─ 生成标题

第3周：内容创作
├─ 创作标准文章
├─ 创作攻略内容
└─ 创作对比评测

第4周：审核发布
├─ 内容审核
├─ 多渠道发布
└─ 收录监测
```

---

## 💡 最佳实践

### 1. 品牌创建优先

```
先创建品牌账号：
├─ geo-create-enterprise（企业）
├─ geo-create-product（产品）
└─ geo-create-personal（个人）
```

### 2. 知识库为基础

```
搭建完整知识库：
├─ create-kb（创建结构）
├─ 品牌信息库
├─ 产品信息库
└─ 素材资源库
```

### 3. 关键词科学规划

```
规划关键词矩阵：
├─ A类-产品选择类（20个）
├─ B类-品牌词问题（15个）
├─ C类-场景需求类（15个）
└─ D类-对比评测类（10个）
```

### 4. 内容符合规范

```
创作GEO内容：
├─ 第一段提供判断标准
├─ 数据化表达
├─ 提供归类方式
└─ 地域明确、信息完整
```

### 5. 审核严格把关

```
三层审核机制：
├─ audit-ai-detection（AI检测）
├─ audit-consistency（一致性）
└─ audit-media-readiness（投稿就绪度）
```

### 6. 持续监测优化

```
定期监测排名：
├─ geo-indexing-check（检测收录）
├─ geo-rank-content（查看排名）
└─ geo-review-content（内容复盘）
```

---

## 🎉 总结

### 核心价值

**geo-workflow-hub** 是GEO完整运营工作流的**一站式入口**：
- 🎯 覆盖9大阶段的完整流程
- 📚 集成41个GEO工作流技能
- 🚀 从品牌创建到数据分析全链路

### 两大入口

1. **geo-workflow-hub**（完整运营工作流）
   - 关注：品牌创建、内容规划、运营管理
   - 技能：品牌、知识库、关键词、标题、内容、审核、发布、收录、分析

2. **geo-hub**（GEO平台数据操作）
   - 关注：API操作、数据管理
   - 技能：上传、查询、检测

### 推荐用法

```
# 运营阶段
/geo-workflow-hub

# 平台操作
/geo-hub
```

---

## 🔗 相关技能

- **geo-hub** - GEO平台统一操作入口
- **upload-article** - 上传文章到GEO平台
- **create-kb** - 创建知识库项目
- **audit-consistency** - 内容一致性审核

---

## 技能版本

- **版本**：v2.0
- **创建日期**：2026-04-16
- **最后更新**：2026-04-16
- **技能数量**：43个工作流技能
- **覆盖阶段**：9个完整阶段
