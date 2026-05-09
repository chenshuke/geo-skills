---
name: geo-workflow-hub
description: GEO工作流统一入口 - 从品牌创建到收录监测的完整运营工作流
---

> **外部依赖**: 部分子技能需要 GEO 平台 openKey

# GEO工作流统一入口 (GEO Workflow Hub)

> **版本**：v3.1 | **更新日期**：2026-05-09
> **定位**：GEO完整运营工作流的中央控制台

## 技能说明

`geo-workflow-hub` 是**GEO运营工作流**的统一入口，覆盖全流程：

```
品牌创建 → 知识库搭建 → 关键词规划 → 标题创作 → 内容创作 → 内容审核 → 内容归档
```

---

## 快速开始

```
/geo-workflow-hub
```

系统会询问你想做什么，然后智能推荐相关模块。

---

## 📚 6 大功能模块

### ⑥ geo-brand — 品牌创建
> 创建企业品牌、产品品牌、个人品牌、获客内容账号

**适用场景**：新品牌入驻GEO平台、新产品线启动、个人IP打造

**快速入口**：`/geo-workflow-hub brand`

---

### ⑦ geo-knowledge — 知识库管理
> 创建知识库结构、整理散乱资料、生成补充清单

**适用场景**：新项目启动、资料整理、内容体系搭建

**快速入口**：`/geo-workflow-hub knowledge`

---

### ⑧ geo-content — 内容全流程（总入口）
> 关键词规划 → 标题创作 → 图片生成 → 内容审核 → 覆盖分析 → 内容优化

**本模块已拆分为两个子模块**：

| 子模块 | 覆盖范围 | 快速入口 |
|--------|---------|---------|
| **⑧a geo-content-production** | 关键词规划、标题创作、图片生成、封面生成 | `/geo-workflow-hub content production` |
| **⑧b geo-content-audit** | 一致性审核、媒体就绪审核、AI检测、覆盖度检查、内容优化、合规榜单 | `/geo-workflow-hub content audit` |

---

### ⑩ geo-content-archive — 内容归档
> 按创作日期 + AI平台 + 发布平台自动归类内容文件

**适用场景**：项目运营中内容文件散乱需要整理

**快速入口**：`/geo-workflow-hub archive`

---

### ⑨ geo-analysis — 数据分析
> 证据链分析、AI平台逆向分析、飞书方案同步、项目仪表盘

**适用场景**：收录数据分析、平台引用机制研究、项目管理

**快速入口**：`/geo-workflow-hub analysis`

---

## 🎯 智能路由

| 用户说 | 推荐模块 |
|--------|---------|
| "创建品牌" / "企业入驻" | ⑥ geo-brand |
| "搭建知识库" / "整理资料" | ⑦ geo-knowledge |
| "规划关键词" / "生成标题" / "写内容" | ⑧a geo-content-production |
| "审核" / "覆盖度" / "优化内容" | ⑧b geo-content-audit |
| "归档内容" / "整理创作文件" | ⑩ geo-content-archive |
| "证据链" / "逆向分析" / "仪表盘" | ⑨ geo-analysis |

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
第3步：/geo-workflow-hub content production → 关键词→标题→创作
第4步：/geo-workflow-hub content audit     → 审核→覆盖度检查→优化
第5步：/geo-workflow-hub archive           → 归档整理
第6步：/geo-hub article                    → 上传到平台
第7步：/geo-hub indexing                   → 检测收录排名
```

> **geo-workflow-hub 负责"想清楚并做出来"，geo-hub 负责"落到平台并看结果"。**

---

## 🔗 与 geo-hub 的区别

| 需求 | geo-workflow-hub | geo-hub |
|------|-----------------|---------|
| 创建品牌账号 | ✅ | ❌ |
| 规划关键词/标题 | ✅ | ❌ |
| 创作内容 | ✅ | ❌ |
| 审核内容 | ✅ | ❌ |
| 归档内容 | ✅ | ❌ |
| **上传文章到平台** | ❌ | ✅ |
| **查看文章/账号** | ❌ | ✅ |
| **检测收录排名** | ❌ | ✅ |
| **管理配置** | ❌ | ✅ |
