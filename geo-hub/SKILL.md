---
name: geo-hub
description: "GEO 平台 API 总入口和路由技能。Use when the user does not know which GEO platform skill to use, or says 查平台数据、上传到平台、删除平台数据、配置账号、文章管理、知识库上传下载、收录任务、发布任务、媒体投稿、公司产品账号查询. For a clear task, route to geo-config, geo-account, geo-article, geo-knowledge-sync, geo-indexing, geo-publish, or geo-media-submission."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: router
---

> **外部依赖**: Best GEO CLI（需先完成 `best-geo auth login`；不需要在技能中另配认证材料）

# GEO平台统一操作入口 (GEO Hub)

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

> **版本**：v3.0 | **更新日期**：2026-05-08
> **定位**：通过 Best GEO CLI 操作 GEO 平台数据的中央控制台

## 执行后端

本技能及其子技能不得直接读取旧凭证或请求历史 HTTP 接口。平台操作统一调用：

```bash
best-geo call <capability> --input '<json>'
```

写操作统一使用 `best-geo plan` → 用户确认 → `best-geo apply`。只有 Best GEO CLI 适配层可以接触认证状态。

> **强制规则**：本文只使用 CLI capability，不提供任何直接 HTTP 调用示例。

## 通用安全规则

## 认证与安全

- 认证只由 `best-geo auth login/status` 管理；技能层不得读取、保存或展示认证材料或内部服务地址。
- 用户只需要完成 CLI 授权并选择默认 companyId/productId。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除平台数据后，必须通过对应 list/get capability 回查确认，不只相信写入返回值。
- 有专用 Node 脚本时优先使用脚本；没有专用脚本时使用 `geo-runtime/scripts/best_geo.js` 的 capability 调用。

---

## 技能说明

`geo-hub` 是**GEO平台API操作**的统一入口，专注于：
- 📊 **查询数据**：查看账号、文章、收录等平台数据
- ⬆️ **上传操作**：上传文章、图片到GEO平台
- 🗑️ **删除操作**：删除文章、收录任务
- 🔧 **配置管理**：管理GEO平台认证和配置

---

## 快速开始

直接对 Claude Code 或 Codex 说：

```text
使用 geo-hub 帮我判断应该用哪个 GEO API 技能。
```

系统会询问你想做什么，然后智能推荐相关模块。

---

## 📚 7 大功能模块

### ① geo-config — 配置管理
> 管理 CLI 授权、默认公司和产品ID

**适用场景**：首次配置、密钥失效、切换公司/产品

**推荐说法**：`使用 geo-config 帮我检查或更新配置`

---

### ② geo-account — 账号与资源
> 查看企业、项目、发布账号、图片和视频素材

**CLI capability**：`companies.*`、`products.*`、`publicationAccounts.list`、`images.list/get`、`videos.list/get`

**推荐说法**：`使用 geo-account 帮我查询账号或资源`

---

### ③ geo-article — 文章与素材
> 文章全生命周期：上传、创建、查看、审核、删除、批量创作

**CLI capability**：`articles.*`、`images.*`、`videos.*`

**推荐说法**：`使用 geo-article 帮我上传或管理文章`

---

### ④ geo-indexing — 收录检测
> 使用 Scheduled Indexing 检测 AI 搜索排名、创建/管理定时收录计划、查询 answers/matrix、publishedUrl 命中检测

**CLI capability**：`scheduledIndexing.*`、`indexing.suggestCompetitors`

**推荐说法**：`使用 geo-indexing 帮我创建 Scheduled Indexing 收录计划或查询收录结果`

---

### ⑤ geo-publish — 发布管理
> 创建发布任务，分发到知乎/搜狐/CSDN等渠道

**CLI capability**：`publicationTasks.*`、`publicationRecords.list`

**推荐说法**：`使用 geo-publish 帮我创建或管理发布任务`

---

### ⑥ geo-knowledge-sync — 平台知识库同步
> 把本地知识库目录上传到 GEO 平台，或把平台知识库下载到本地备份

**CLI capability**：`knowledge.*`

**推荐说法**：`使用 geo-knowledge-sync 把本地知识库上传到平台`

---

### ⑦ geo-media-submission — 媒体投稿
> 查询真实投稿媒体、筛选价格和条件、预览费用、创建单篇或批量投稿并回查记录

**CLI capability**：`mediaPlatforms.*`、`mediaPublications.*`

**推荐说法**：`使用 geo-media-submission 查询媒体并创建投稿`

---

## 🎯 智能路由

| 用户说 | 推荐模块 |
|--------|---------|
| "上传文章" / "发布" | ③ geo-article |
| "查看账号" / "查看素材" | ② geo-account |
| "检测收录" / "排名" | ④ geo-indexing |
| "查看配置" / "密钥" | ① geo-config |
| "发布到渠道" | ⑤ geo-publish |
| "上传知识库" / "下载知识库" / "同步知识库" | ⑥ geo-knowledge-sync |
| "媒体投稿" / "有哪些投稿平台" / "新闻稿投放" | ⑦ geo-media-submission |

---

## 🔄 配置引导（首次使用必须执行）

每次调用 geo-hub 时，自动执行：

1. 执行 `best-geo auth status` 检查 CLI 授权
2. 通过 `companies.list` 和 `products.list` 获取可用范围；需要时引导用户选择
3. 后续操作通过 CLI schema 传递 companyId/productId

---

## 🔗 与 geo-workflow-hub 的区别

| 需求 | geo-hub | geo-workflow-hub |
|------|---------|-----------------|
| 创建品牌账号 | ❌ | ✅ |
| 规划关键词/标题 | ❌ | ✅ |
| 创作内容 | ❌ | ✅ |
| 审核内容 | ❌ | ✅ |
| **上传文章到平台** | ✅ | ❌ |
| **查看文章/账号** | ✅ | ❌ |
| **检测收录排名** | ✅ | ❌ |
| **管理配置** | ✅ | ❌ |
| **知识库上传/下载** | ✅ | ❌ |
| **媒体投稿** | ✅ | ❌ |

> **最佳实践**：先用 geo-workflow-hub 做方案、规划、创作，再用 geo-hub 落地到平台。
