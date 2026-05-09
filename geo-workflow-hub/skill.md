---
name: geo-workflow-hub
description: GEO工作流统一入口 - 从品牌创建到收录监测的完整运营工作流
---

# GEO工作流统一入口 (GEO Workflow Hub)

> **版本**：v3.0 | **更新日期**：2026-05-08
> **定位**：GEO完整运营工作流的中央控制台

## 技能说明

`geo-workflow-hub` 是**GEO运营工作流**的统一入口，覆盖全流程：

```
品牌创建 → 知识库搭建 → 关键词规划 → 标题创作 → 内容创作 → 内容审核 → 报表分析
```

---

## 快速开始

```
/geo-workflow-hub
```

系统会询问你想做什么，然后智能推荐相关模块。

---

## 📚 5 大功能模块

### ⑥ geo-brand — 品牌创建
> 创建企业品牌、产品品牌、个人品牌、获客内容账号

**适用场景**：新品牌入驻GEO平台、新产品线启动、个人IP打造

**快速入口**：`/geo-workflow-hub brand`

---

### ⑦ geo-knowledge — 知识库管理
> 创建知识库结构、整理散乱资料、提取DOCX文档、生成补充清单

**适用场景**：新项目启动、资料整理、内容体系搭建

**快速入口**：`/geo-workflow-hub knowledge`

---

### ⑧ geo-content — 内容全流程生产（最大模块）
> 关键词规划 → 标题创作 → 图片生成 → 内容审核 → 覆盖分析 → 内容优化 → 内容归档

**包含 16 个子能力**：
- **关键词规划**：拓展词方案、三级问题生成、意图树构建
- **标题创作**：标题生成、聚合标题
- **图片生成**：AI图片生成、封面生成
- **深度审核**：一致性审核、媒体就绪度、AI检测
- **覆盖分析**：覆盖度检查、缺口分析
- **内容优化**：合规排名、内容优化
- **内容归档**：按日期+AI平台+发布平台自动归档（独立技能 `geo-content-archive`）

**快速入口**：`/geo-workflow-hub content`

---

### ⑨ geo-report — 报表与报价
> 售后报告、售前诊断、主题拓展、报价单生成

**API接口**：`GET/POST /v1/report`、`GET/POST /v1/presale`、拓展词相关接口

**快速入口**：`/geo-workflow-hub report`

---

### ⑩ geo-analysis — 数据分析
> 证据链分析、AI平台逆向分析、飞书方案同步、项目仪表盘

**适用场景**：收录数据分析、平台引用机制研究、项目管理

**快速入口**：`/geo-workflow-hub analysis`

---

## 🎯 智能路由

| 用户说 | 推荐模块 |
|--------|---------|
| "创建品牌" / "企业入驻" | ⑥ geo-brand |
| "搭建知识库" / "整理资料" | ⑦ geo-knowledge |
| "规划关键词" / "生成标题" / "写内容" / "审核" | ⑧ geo-content |
| "看报告" / "报价单" / "拓展词" | ⑨ geo-report |
| "证据链" / "逆向分析" / "仪表盘" | ⑩ geo-analysis |

---

## 🔄 配置引导（首次使用必须执行）

与 geo-hub 共享配置流程，自动执行：
1. 读取 `geo-config/geo-config.json` 获取 openKey
2. 检查并引导选择 companyId 和 productId

---

## 🚀 推荐工作流

```
第1步：/geo-workflow-hub brand     → 创建品牌
第2步：/geo-workflow-hub knowledge  → 搭建知识库
第3步：/geo-workflow-hub content    → 关键词→标题→创作→审核
第4步：/geo-hub article            → 上传到平台
第5步：/geo-hub indexing           → 检测收录排名
第6步：/geo-workflow-hub report     → 查看报表
```

> **geo-workflow-hub 负责"想清楚并做出来"，geo-hub 负责"落到平台并看结果"。**
