---
name: geo-hub
description: GEO平台API统一操作入口 - 查询和操作GEO平台数据的中央控制台
---

# GEO平台API统一操作入口 (GEO Hub)

> **技能名称**：geo-hub
> **用途**：GEO平台API数据查询和操作的统一入口
> **作者**：GEO执行助理
> **版本**：v2.1
> **更新日期**：2026-04-16

## 技能说明

`geo-hub` 是**GEO平台API数据操作的中央控制台**，专注于：
- 📊 **查询数据**：查看账号、文章、收录、排名等平台数据
- ⬆️ **上传操作**：上传文章、图片到GEO平台
- 🗑️ **删除操作**：删除文章、收录、发布任务
- 🔧 **配置管理**：管理GEO平台认证和配置

**核心定位**：平台API操作（查询、上传、删除）

**与 geo-workflow-hub 的区别**：
- **geo-hub**：查询和操作GEO平台已有数据
- **geo-workflow-hub**：规划和执行GEO运营策略（创建、创作、审核）

---

## 快速开始

### 基本用法
```
/geo-hub
```
或
```
/skill geo-hub
```

系统会询问你想做什么，然后智能推荐相关技能。

---

## 🎯 按需求导航

**我想...**
- "上传文章" → 推荐 `upload-article`
- "查看账号" → 推荐 `geo-account-list`
- "查看文章" → 推荐 `geo-article-list`
- "检测收录" → 推荐 `geo-indexing-check`
- "查看排名" → 推荐 `geo-rank-content`
- "查看配置" → 推荐 `geo-config`

---

## 📚 功能分类

### 1️⃣ 账号管理（1个技能）

#### `geo-account-list` ⭐ 核心
**用途**：查看所有账号列表

**功能**：
- 查看企业品牌账号
- 查看产品品牌账号
- 查看个人品牌账号
- 查看获客内容账号

**使用场景**：
- 查看已创建的账号
- 获取账号ID用于其他操作
- 批量查看账号状态

**API接口**：`GET /v1/geo-company`

**快速入口**：
```
/geo-hub account
```

---

### 2️⃣ 内容管理（3个技能）

#### `upload-article` ⭐ 核心
**用途**：上传文章到GEO平台

**功能**：
- 上传文章标题和正文
- 自动生成封面并上传OSS
- 关联产品和公司
- 返回文章访问链接

**使用场景**：
- 发布新文章
- 批量上传文章
- 自动封面生成

**依赖技能**：
- `generate-cover` - 生成封面
- `upload-image` - 上传图片到OSS

**快速入口**：
```
/geo-hub upload
```

---

#### `geo-article-list`
**用途**：查看文章列表

**功能**：
- 查看已发布的文章
- 按条件筛选文章
- 查看文章状态

**使用场景**：
- 查看文章库
- 文章管理

**API接口**：`GET /v1/article`

---

#### `geo-article-review`
**用途**：查看/审核文章内容

**功能**：
- 查看文章详情
- 编辑文章内容
- 更新文章状态

**使用场景**：
- 审核已发布文章
- 更新文章内容

**API接口**：`PATCH /v1/article/{id}`

---

### 3️⃣ 收录检测（3个技能）

#### `geo-indexing-list` ⭐ 核心
**用途**：查看收录检测任务列表

**功能**：
- 查看所有收录任务
- 查看任务状态
- 批量管理任务

**使用场景**：
- 收录任务管理
- 查看监测进度

**API接口**：`GET /v1/indexing`

**快速入口**：
```
/geo-hub indexing-list
```

---

#### `geo-indexing-check` ⭐ 核心
**用途**：检测关键词收录排名

**功能**：
- 检测AI搜索排名
- 多平台同时检测
- 实时排名查询

**监测平台**：
- DeepSeek、豆包、元宝
- 千问、文心一言

**使用场景**：
- 单个关键词检测
- 排名变化监测

**API接口**：`POST /v1/indexing`

**快速入口**：
```
/geo-hub check
```

---

#### `geo-indexing-delete`
**用途**：删除收录检测任务

**功能**：
- 删除单个任务
- 批量删除任务

**使用场景**：
- 清理无效关键词
- 任务管理

**API接口**：`DELETE /v1/indexing/{id}`

---

### 4️⃣ 数据查询（2个技能）

#### `geo-rank-content` ⭐ 核心
**用途**：查看内容排名数据

**功能**：
- 查看关键词排名
- 排名变化分析
- 多平台排名对比

**使用场景**：
- 效果分析
- 排名监测

**API接口**：查询相关接口

**快速入口**：
```
/geo-hub rank
```

---

#### `geo-review-content`
**用途**：查看内容数据

**功能**：
- 查看内容表现
- 数据统计分析
- 效果回顾

**使用场景**：
- 内容效果分析
- 数据复盘

---

### 5️⃣ 配置工具（1个技能）

#### `geo-config` ⭐ 重要
**用途**：管理GEO平台配置

**功能**：
- 查看当前配置
- 更新认证信息
- 管理环境变量

**配置项**：
```bash
# GEO平台配置（永久密钥）
GEO_OPEN_KEY=your_key
GEO_BASE_URL=https://nbgeo.aimusiclj.com
GEO_REFERER=https://geo.bihuoai.com/

# 默认配置
GEO_DEFAULT_PRODUCT_ID=98
GEO_DEFAULT_COMPANY_ID=36
```

**使用场景**：
- 配置管理
- 更新密钥
- 查看当前配置

**快速入口**：
```
/geo-hub config
```

**注意**：不再需要登录认证，所有技能直接从环境变量读取 openKey

---

## 🎯 智能导航流程

当调用此技能时，按以下流程执行：

### 步骤0：配置引导（必须首先执行）

> **重要**：每次调用 geo-hub 时，必须先完成此步骤，确保后续所有 API 操作携带正确的 companyId 和 productId。

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
你好！我是GEO平台API操作入口。请问你想做什么？

【数据查询】
1. 查看账号列表
2. 查看文章列表
3. 查看收录任务
4. 检测关键词排名
5. 查看排名数据

【数据操作】
6. 上传文章
7. 删除文章/收录/发布

【配置管理】
8. 查看配置
9. 更新环境变量

【其他】
- 输入功能名称（如"上传文章"）
- 输入问题（如"如何查看账号？"）
```

### 步骤2：分析意图

根据用户输入，推荐最合适的技能：

| 用户意图 | 推荐技能 | 优先级 |
|---------|---------|--------|
| 上传文章 | `upload-article` | ⭐⭐⭐⭐⭐ |
| 查看账号 | `geo-account-list` | ⭐⭐⭐⭐⭐ |
| 查看文章 | `geo-article-list` | ⭐⭐⭐⭐ |
| 查看收录 | `geo-indexing-list` | ⭐⭐⭐⭐ |
| 检测排名 | `geo-indexing-check` | ⭐⭐⭐⭐⭐ |
| 查看数据 | `geo-rank-content` | ⭐⭐⭐⭐ |
| 删除任务 | `geo-indexing-delete` | ⭐⭐⭐ |
| 查看配置 | `geo-config` | ⭐⭐⭐ |

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

## 📖 使用场景示例

### 场景1：查看已创建的账号

```
你: "我想查看所有账号"

geo-hub:
推荐使用 geo-account-list

📋 功能说明：
   查看GEO平台所有已创建的账号（企业/产品/个人/获客）

🎯 使用方法：
   /skill geo-account-list

📊 返回信息：
   - 企业品牌账号列表
   - 产品品牌账号列表
   - 个人品牌账号列表
   - 获客内容账号列表
   - 账号ID、名称、状态

需要我帮你调用吗？
```

---

### 场景2：上传文章到GEO平台

```
你: "我要上传一篇文章"

geo-hub:
推荐使用 upload-article

📋 功能说明：
   上传文章到GEO平台，支持自动生成封面

🎯 使用方法：
   /skill upload-article \
     --title="文章标题" \
     --content="文章内容..." \
     --autoCover

📊 自动执行：
   1. 生成封面图片
   2. 上传封面到OSS
   3. 上传文章到GEO平台
   4. 返回文章链接

需要我帮你调用吗？
```

---

### 场景3：检测关键词排名

```
你: "检测'壁挂炉推荐[海顿]'的排名"

geo-hub:
推荐使用 geo-indexing-check

📋 功能说明：
   检测关键词在AI搜索引擎的排名

🎯 使用方法：
   /skill geo-indexing-check \
     --keyword="壁挂炉推荐[海顿]" \
     --platform="deepseek"

📊 检测平台：
   - DeepSeek
   - 豆包
   - 元宝
   - 千问
   - 文心一言

需要我帮你调用吗？
```

---

### 场景4：查看收录任务列表

```
你: "查看所有收录任务"

geo-hub:
推荐使用 geo-indexing-list

📋 功能说明：
   查看所有收录检测任务和状态

🎯 使用方法：
   /skill geo-indexing-list

📊 返回信息：
   - 任务列表
   - 检测状态
   - 最新排名
   - 任务ID

需要我帮你调用吗？
```

---

### 场景5：查看排名数据

```
你: "查看内容排名数据"

geo-hub:
推荐使用 geo-rank-content

📋 功能说明：
   查看关键词的排名数据和分析

🎯 使用方法：
   /skill geo-rank-content \
     --keyword="壁挂炉推荐"

📊 返回信息：
   - 多平台排名
   - 排名变化趋势
   - 竞品分析

需要我帮你调用吗？
```

---

## 🚀 快速命令

### 按功能快速导航

```
/geo-hub account   # 查看账号
/geo-hub upload   # 上传文章
/geo-hub list     # 查看文章
/geo-hub check    # 检测收录
/geo-hub rank     # 查看排名
/geo-hub config   # 查看配置
```

---

## 📊 技能清单

### 当前GEO平台API技能（10个）

```
账号管理 (1个):
└── geo-account-list ⭐ 核心

内容管理 (3个):
├── upload-article ⭐ 核心
├── geo-article-list
└── geo-article-review

收录检测 (3个):
├── geo-indexing-list ⭐ 核心
├── geo-indexing-check ⭐ 核心
└── geo-indexing-delete

数据查询 (2个):
├── geo-rank-content ⭐ 核心
└── geo-review-content

配置工具 (1个):
└── geo-config ⭐ 重要
```

---

## 🔗 与geo-workflow-hub的配合

### 完整工作流示例

```
用户: "我要完成从创建品牌到查看排名的完整流程"

【运营阶段】(geo-workflow-hub)
1. geo-create-enterprise → 创建品牌
2. create-kb → 搭建知识库
3. geo-keyword-plan → 规划关键词
4. geo-titlen-generator → 生成标题
5. geo-article-create → 创作内容
6. audit-consistency → 审核内容

【平台操作】(geo-hub)
7. upload-article --autoCover → 上传文章到GEO平台
8. geo-indexing-batch-import → 批量导入收录任务

【数据监测】(geo-hub)
9. geo-rank-content → 查看排名数据
10. geo-review-content → 内容效果复盘

结果：一站式完成GEO全流程！
```

---

## 📊 职责对比

### 什么时候用哪个？

| 需求 | 用workflow-hub | 用geo-hub |
|------|---------------|----------|
| 创建品牌账号 | ✅ 创建 | ❌ |
| 规划关键词 | ✅ 规划 | ❌ |
| 生成标题 | ✅ 创作 | ❌ |
| 创作内容 | ✅ 创作 | ❌ |
| 审核内容 | ✅ 审核 | ❌ |
| **查看账号列表** | ❌ | ✅ **查询** |
| **上传文章** | ❌ | ✅ **上传** |
| **查看文章列表** | ❌ | ✅ **查询** |
| **检测收录排名** | ❌ | ✅ **查询** |
| **查看排名数据** | ❌ | ✅ **查询** |
| 删除任务 | ❌ | ✅ 删除 |
| 查看配置 | ❌ | ✅ 配置 |

---

## 💡 最佳实践

### 1. 先规划后操作

```
正确流程：
1. geo-workflow-hub → 创建品牌、规划关键词、创作内容
2. geo-hub → 上传文章、检测收录、查看数据
```

### 2. 账号管理分离

```
创建账号：geo-workflow-hub（geo-create-enterprise）
查看账号：geo-hub（geo-account-list）
```

### 3. 内容管理分离

```
创作内容：geo-workflow-hub（geo-article-create）
上传内容：geo-hub（upload-article）
查看内容：geo-hub（geo-article-list）
```

### 4. 收录管理分离

```
规划监测：geo-workflow-hub（geo-indexing-batch-import）
检测排名：geo-hub（geo-indexing-check）
查看列表：geo-hub（geo-indexing-list）
```

---

## 🎉 总结

### 核心价值

**geo-hub** 是GEO平台API操作的**一站式入口**：
- 📊 查询平台数据（账号、文章、收录、排名）
- ⬆️ 上传内容到平台（文章、图片）
- 🗑️ 删除平台数据（文章、收录任务）
- 🔧 管理平台配置（认证、密钥）

### 两大入口

1. **geo-hub**（平台API操作）
   - 关注：查询、上传、删除、配置
   - 技能：11个平台操作技能
   - 用途：操作GEO平台已有数据

2. **geo-workflow-hub**（完整运营工作流）
   - 关注：创建、规划、创作、审核
   - 技能：40个工作流技能
   - 用途：执行GEO运营策略

### 推荐用法

```
# 运营规划阶段
/geo-workflow-hub

# 平台操作阶段
/geo-hub
```

---

## 🔗 相关技能

- **geo-workflow-hub** - GEO完整运营工作流
- **upload-article** - 上传文章到GEO平台
- **geo-account-list** - 查看账号列表
- **geo-indexing-check** - 检测收录排名

---

## 技能版本

- **版本**：v2.1
- **创建日期**：2026-04-16
- **最后更新**：2026-04-16
- **技能数量**：10个平台API技能
- **核心定位**：查询、上传、删除、配置
- **认证方式**：永久 openKey（环境变量）
