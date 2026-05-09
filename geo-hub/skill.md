---
name: geo-hub
description: GEO平台API统一操作入口 - 查询和操作GEO平台数据的中央控制台
---

# GEO平台API统一操作入口 (GEO Hub)

> **版本**：v3.0 | **更新日期**：2026-05-08
> **定位**：GEO平台API数据操作的中央控制台

## 技能说明

`geo-hub` 是**GEO平台API操作**的统一入口，专注于：
- 📊 **查询数据**：查看账号、文章、收录等平台数据
- ⬆️ **上传操作**：上传文章、图片到GEO平台
- 🗑️ **删除操作**：删除文章、收录任务
- 🔧 **配置管理**：管理GEO平台认证和配置

---

## 快速开始

```
/geo-hub
```

系统会询问你想做什么，然后智能推荐相关模块。

---

## 📚 5 大功能模块

### ① geo-config — 配置管理
> 管理API openKey、默认公司和产品ID

**适用场景**：首次配置、密钥失效、切换公司/产品

**快速入口**：`/geo-hub config`

---

### ② geo-account — 账号与资源
> 查看企业/产品/个人品牌账号列表、平台套餐、视频等

**API接口**：`GET /v1/geo-company`、`GET /v1/dashboard`、`GET /v1/package`、`GET /v1/video`

**快速入口**：`/geo-hub account`

---

### ③ geo-article — 文章与素材
> 文章全生命周期：上传、创建、查看、审核、删除、批量创作

**API接口**：`POST/GET/DELETE /v1/article`、`POST /v1/oss/pre`

**快速入口**：`/geo-hub article`

---

### ④ geo-indexing — 收录检测
> 检测AI搜索排名、管理收录任务、批量导入关键词

**API接口**：`POST/GET/DELETE /v1/indexing`

**快速入口**：`/geo-hub indexing`

---

### ⑤ geo-publish — 发布管理
> 创建发布任务，分发到知乎/搜狐/CSDN等渠道

**API接口**：`POST /v1/publication`

**快速入口**：`/geo-hub publish`

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

1. 读取 `geo-config/geo-config.json` 获取 openKey
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
