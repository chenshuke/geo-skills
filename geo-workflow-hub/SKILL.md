---
name: geo-workflow-hub
description: GEO运营工作流路由技能。Use this skill when the user needs an end-to-end GEO workflow from brand setup, knowledge base, content production, audit, archive, and analysis. For platform API actions such as upload, indexing, or publication tasks, use geo-hub or the concrete API skill instead.
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.2.0"
  category: router
---

> **外部依赖**: 部分子技能需要 GEO 平台 openKey

# GEO工作流统一入口 (GEO Workflow Hub)

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

> **版本**：v3.1 | **更新日期**：2026-05-09
> **定位**：GEO完整运营工作流的中央控制台

## 技能说明

`geo-workflow-hub` 是**GEO运营工作流**的统一入口，覆盖全流程：

```
品牌创建 → 知识库搭建 → 关键词规划 → 标题创作 → 内容创作 → 内容审核 → 内容归档
```

---

## 快速开始

直接对 Claude Code 或 Codex 说：

```text
使用 geo-workflow-hub，帮我规划一个完整 GEO 运营工作流。
```

系统会询问你想做什么，然后智能推荐相关模块。

---

## 📚 6 大功能模块

### ⑥ geo-brand — 品牌创建
> 创建企业品牌、产品品牌、个人品牌、获客内容账号

**适用场景**：新品牌入驻GEO平台、新产品线启动、个人IP打造

**推荐说法**：`使用 geo-brand 帮我创建品牌内容`

---

### ⑦ geo-knowledge — 知识库管理
> 创建知识库结构、整理散乱资料、生成补充清单

**适用场景**：新项目启动、资料整理、内容体系搭建

**推荐说法**：`使用 geo-knowledge 帮我搭建知识库`

---

### ⑧ geo-content — 内容全流程（总入口）
> 关键词规划 → 标题创作 → 图片生成 → 内容审核 → 覆盖分析 → 内容优化

**本模块已拆分为两个子模块**：

| 子模块 | 覆盖范围 | 快速入口 |
|--------|---------|---------|
| **⑧a geo-content-production** | 关键词规划、标题创作、图片生成、封面生成 | `使用 geo-content-production ...` |
| **⑧b geo-content-audit** | 一致性审核、媒体就绪审核、AI检测、覆盖度检查、内容优化、合规榜单 | `使用 geo-content-audit ...` |

---

### ⑩ geo-content-archive — 内容归档
> 按创作日期 + AI平台 + 发布平台自动归类内容文件

**适用场景**：项目运营中内容文件散乱需要整理

**推荐说法**：`使用 geo-content-archive 帮我整理项目文件`

---

### ⑨ geo-analysis — 数据分析
> 证据链分析、AI平台逆向分析、飞书方案同步、项目仪表盘

**适用场景**：收录数据分析、平台引用机制研究、项目管理

**推荐说法**：`使用 geo-analysis 帮我分析收录和证据链`

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
1. 读取 `~/.geo-skills/credentials/geo-config.json` 获取 openKey
2. 检查并引导选择 companyId 和 productId

---

## 🚀 推荐工作流

```text
第1步：使用 geo-brand 创建品牌
第2步：使用 geo-knowledge 搭建知识库
第3步：使用 geo-content-production 完成关键词、标题和内容创作
第4步：使用 geo-content-audit 审核、覆盖度检查和优化
第5步：使用 geo-content-archive 归档整理
第6步：使用 geo-article 上传到平台
第7步：使用 geo-indexing 检测收录排名
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
