---
name: geo-hub
description: GEO平台 API 路由技能。Use this skill when the user needs help choosing or orchestrating GEO API operations across config, account, article, indexing, and publication modules. For a specific operation, prefer the concrete skill such as geo-config, geo-account, geo-article, geo-indexing, or geo-publish.
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.2.0"
  category: router
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO平台API统一操作入口 (GEO Hub)

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

> **版本**：v3.0 | **更新日期**：2026-05-08
> **定位**：GEO平台API数据操作的中央控制台

## 通用安全规则

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。

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

## 📚 5 大功能模块

### ① geo-config — 配置管理
> 管理API openKey、默认公司和产品ID

**适用场景**：首次配置、密钥失效、切换公司/产品

**推荐说法**：`使用 geo-config 帮我检查或更新配置`

---

### ② geo-account — 账号与资源
> 查看企业/产品/个人品牌账号列表、平台套餐、视频等

**API接口**：`GET /v1/geo-company`、`GET /v1/dashboard`、`GET /v1/package`、`GET /v1/video`

**推荐说法**：`使用 geo-account 帮我查询账号或资源`

---

### ③ geo-article — 文章与素材
> 文章全生命周期：上传、创建、查看、审核、删除、批量创作

**API接口**：`POST/GET/DELETE /v1/article`、`POST /v1/oss/pre`

**推荐说法**：`使用 geo-article 帮我上传或管理文章`

---

### ④ geo-indexing — 收录检测
> 检测AI搜索排名、管理收录任务、批量导入关键词

**API接口**：`POST/GET/DELETE /v1/ai-indexing-task/custom`、`GET /v1/ai-indexing/custom`

**推荐说法**：`使用 geo-indexing 帮我管理收录检测`

---

### ⑤ geo-publish — 发布管理
> 创建发布任务，分发到知乎/搜狐/CSDN等渠道

**API接口**：`POST /v1/publication-task`

**推荐说法**：`使用 geo-publish 帮我创建或管理发布任务`

---

## 🎯 智能路由

| 用户说 | 推荐模块 |
|--------|---------|
| "上传文章" / "发布" | ③ geo-article |
| "查看账号" / "套餐" | ② geo-account |
| "检测收录" / "排名" | ④ geo-indexing |
| "查看配置" / "密钥" | ① geo-config |
| "发布到渠道" | ⑤ geo-publish |

---

## 🔄 配置引导（首次使用必须执行）

每次调用 geo-hub 时，自动执行：

1. 读取 `~/.geo-skills/credentials/geo-config.json` 获取 openKey
2. 检查 `defaults.companyId` 和 `defaults.productId`，若为 0 则引导选择
3. 后续操作自动携带 companyId 和 productId

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

> **最佳实践**：先用 geo-workflow-hub 做方案、规划、创作，再用 geo-hub 落地到平台。
