---
name: geo-article
description: GEO平台文章全生命周期管理模块，包含文章创建、上传、列表查询、审核、删除、图片上传、媒体投稿创作、批量创作
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO 文章管理

本模块整合了 GEO 平台文章的完整生命周期管理能力，从文章创作、图片处理、文章上传、列表查询、审核、删除到批量创作和媒体投稿创作，覆盖文章运营的全部操作场景。

---

## 能力总览

- **文章创建**：创建文章（标题/内容/摘要/封面/标签）
- **文章上传**：完整上传流程（自动封面生成 + OSS 上传 + 文章提交）
- **图片上传**：OSS 上传（两步流程：获取凭证 → 上传文件）、URL 镜像转存
- **文章列表**：分页查询、按产品/公司筛选、多种输出格式
- **文章审核**：单个/批量审核通过或驳回
- **文章删除**：单个/批量删除，支持 dry-run 模拟和从文件读取 ID
- **媒体投稿创作**：基于关键词方案创作投稿文章（3 篇覆盖全关键词策略）
- **批量创作**：基于 GEO 方案批量创作，支持三档字数体系（标准/深度/旗舰）

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/article | 创建文章 |
| GET | /v1/article | 获取文章列表 |
| POST | /v1/article/status | 审核文章（通过/驳回） |
| DELETE | /v1/article/{id} | 删除文章 |
| POST | /v1/oss/pre | 获取 OSS 上传凭证 |
| POST | /v1/oss/translate-url | URL 镜像转存（参数名为 `sourceUrls`） |

---

## 一、文章创建（POST /v1/article）

### 请求体

```json
{
  "title": "文章标题",
  "productId": ${productId},
  "companyId": ${companyId},
  "coverImageUrl": "https://example.com/cover.jpg",
  "content": "文章正文（支持 Markdown）",
  "summary": "文章摘要",
  "tags": ["标签1", "标签2"]
}
```

### curl 示例

```bash
# ${productId}、${companyId} 从 geo-config.json 的 defaults 读取
curl -X POST "${baseUrl}/v1/article" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -d "{
    \"title\": \"文章标题\",
    \"productId\": ${productId},
    \"content\": \"文章内容\",
    \"summary\": \"摘要\",
    \"tags\": [\"标签1\"],
    \"companyId\": ${companyId}
  }"
```

### 成功响应

```json
{
  "statusCode": 0,
  "message": "success",
  "data": { "id": 123, "title": "文章标题" }
}
```

### 注意事项

- 标题建议 10-50 字，内容不少于 500 字，摘要建议 50-200 字
- 标签建议不超过 5 个
- 支持从 .md 文件读取内容（首个 H1 标题作为文章标题）

---

## 二、文章上传（完整流程）

上传文章支持自动封面生成，完整流程为：封面生成（可选） → OSS 上传（如需要） → 文章提交。

### 参数

| 参数 | 说明 | 必填 |
|------|------|------|
| `--title` | 文章标题 | 是* |
| `--content` | 文章正文 | 是* |
| `--file` | .md 文件路径（自动提取标题和内容） | 否 |
| `--autoCover` | 自动生成封面 | 否 |
| `--coverStyle` | 封面样式：text / rank / review / guide / compare / product | 否 |
| `--coverColor` | 封面颜色：blue / red / green / orange / purple | 否 |
| `--cover` | 本地封面路径 | 否 |
| `--coverUrl` | 已有 OSS URL | 否 |
| `--productId` | 产品 ID | 否（从配置读取） |
| `--companyId` | 公司 ID | 否（从配置读取） |
| `--tags` | 标签（逗号分隔） | 否 |
| `--summary` | 文章摘要（不提供则自动提取前 200 字） | 否 |

* 使用 `--file` 时 title 和 content 自动从文件提取。

### 封面样式选择建议

| 文章类型 | 推荐样式 | 推荐颜色 |
|---------|---------|---------|
| 排行榜 | rank | red / blue |
| 产品评测 | review | blue / purple |
| 使用攻略 | guide | green / orange |
| 对比评测 | compare | blue / red |
| 产品介绍 | product | 品牌色 |
| 资讯文章 | text | blue / green |

---

## 三、图片上传

### 两步上传流程

**第一步**：获取 OSS 上传凭证（需要 Authorization）

```bash
curl -X POST "${baseUrl}/v1/oss/pre" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -d '{"fileName":"xxx.png", "businessType":2, "groupId":1, "from":1, "url":""}'
```

**第二步**：上传文件到 OSS（不需要 Authorization，使用第一步返回的签名凭证）

```bash
curl -X POST "${host}" \
  -F "expire=${expire}" \
  -F "policy=${policy}" \
  -F "signature=${signature}" \
  -F "OSSAccessKeyId=${OSSAccessKeyId}" \
  -F "host=${host}" \
  -F "callback=${callback}" \
  -F "dir=${dir}" \
  -F "key=${key}" \
  -F "uploadUrl=${uploadUrl}" \
  -F "Content-Disposition=${Content-Disposition}" \
  -F "file=@local_file.png"
```

### URL 镜像转存（POST /v1/oss/translate-url）

将第三方图片 URL 批量转存为 OSS 镜像：

```bash
# 注意：参数名为 sourceUrls（不是 urls）
curl -X POST "${baseUrl}/v1/oss/translate-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -d '{"sourceUrls":["https://example.com/img1.png","https://example.com/img2.jpg"]}'
```

### 文件名安全处理（关键）

上传前必须清理文件名：
- 只保留 `[a-zA-Z0-9._-]`，禁止中文和特殊字符
- 文件名（不含扩展名）不超过 70 字符
- 文件名冲突时自动添加时间戳后缀重试

---

## 四、文章列表（GET /v1/article）

### 查询参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--page` | 页码 | 1 |
| `--limit` | 每页数量 | 30 |
| `--product-id` | 产品 ID 筛选 | 从配置读取 |
| `--company-id` | 公司 ID 筛选 | 从配置读取 |
| `--format` | 输出格式：table / json / detail | table |

### curl 示例

```bash
# ${productId}、${companyId} 从 geo-config.json 的 defaults 读取
curl -X GET "${baseUrl}/v1/article?page=1&limit=30&productId=${productId}&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

---

## 五、文章审核（POST /v1/article/status）

### 请求体

```json
{
  "ids": [${articleId1}, ${articleId2}, ${articleId3}],
  "status": 1
}
```

| status 值 | 说明 |
|-----------|------|
| 0 | 驳回（退回草稿） |
| 1 | 审核通过（发布） |
| 2 | 审核中 |

### curl 示例

```bash
# ${articleId} 为实际文章 ID
curl -X POST "${baseUrl}/v1/article/status" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Content-Type: application/json" \
  -H "Referer: ${referer}" \
  -d "{\"ids\":[${articleId}],\"status\":1}"
```

### 快捷用法

- 审核通过：`--approve=${articleId}`
- 审核驳回：`--reject=${articleId}`
- 批量：`--ids=${articleId1},${articleId2},${articleId3} --status=1`

---

## 六、文章删除（DELETE /v1/article/{id}）

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--id` | 单个文章 ID | - |
| `--ids` | 多个文章 ID（逗号分隔） | - |
| `--file` | 包含文章 ID 的文件路径（每行一个） | - |
| `--force` | 强制删除（不二次确认） | false |
| `--dry-run` | 模拟运行，不实际删除 | false |

### curl 示例

```bash
# ${articleId} 为实际文章 ID
curl -X DELETE "${baseUrl}/v1/article/${articleId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

> 注意：删除操作不可撤销。批量删除建议每批不超过 50 篇，推荐先使用 `--dry-run` 预览。

---

## 七、媒体投稿创作（geo-create-media-articles）

基于关键词方案创作 3 篇投稿文章，实现全部关键词的交叉验证覆盖。

### 核心策略

将关键词按搜索意图分为 A-E 五类（身份认知/故事情感/经验权威/行业洞察/商业转化），通过 3 篇不同类型文章（故事叙事类/观点洞察类/经验分享类）交叉覆盖。

### 三档字数体系

| 档位 | 字数范围 | 适用场景 |
|------|---------|---------|
| 标准档 | 1000-2000 字 | 长尾词、价格/简介/安装类 |
| 深度档 | 2000-3000 字 | 推荐类、评测类、选购指南类 |
| 旗舰档 | 4000-5000 字 | 核心词/高竞争词、榜单排名类 |

### 质量标准

- 原创性 >= 85%、有明确观点
- 数据密度：每 200-300 字至少 1 个具体数据
- 权威背书：深度档/旗舰档须引用权威来源（协会/报告/政府）
- 完全去除联系方式
- 自动适配投稿平台（知乎/36氪/虎嗅/搜狐号/今日头条）

---

## 八、批量创作（geo-batch-create）

基于 GEO 标题方案批量创作高质量文章，支持分批创作和质量检查，自动更新内容布局跟踪表。

### 核心参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--type` | 是 | 品牌类型：个人/企业/产品 |
| `--plan` | 否 | 标题方案文件路径 |
| `--priority` | 否 | 优先级：P0/P1/P2 |
| `--batch` | 否 | 每批数量（默认 3） |
| `--tier` | 否 | 字数档位：标准/深度/旗舰（默认自动匹配） |
| `--sequential` | 否 | 逐篇创作模式（最高质量） |
| `--keyword` | 否 | 单个拓展词创作 |
| `--kb` | 否 | 知识库文件路径 |
| `--no-search` | 否 | 禁用联网搜索 |

### 质量检查项

字数、结构完整性、关键词密度、数据密度（评分制）、权威背书、时效性（含 2026 年份）。

### 输出

- 文章文件保存到 `04_内容创作/`（文件名含档位标记）
- 自动更新 `03_规划方案/内容布局跟踪表.md`
- 质量报告保存到 `05_质量审核/内容质量报告/`

---

## 强制校验规则（Write-then-Read）

> ⚠️ **此规则为最高优先级，任何写入/删除操作都必须遵守。**

GEO API 在参数错误（如 Referer 不匹配）时可能返回 `statusCode: 0` 和假 ID（数据实际未写入）。因此**不要信任 POST/DELETE 的返回值，必须以 GET 列表接口的实际数据为准。**

### 校验流程

| 操作 | 必须执行的校验 | 校验内容 |
|------|---------------|---------|
| **创建文章** | 立即调用 `GET /v1/article` | 确认文章存在于列表中、`coverImageUrl` 非空且可访问、标题/内容正确 |
| **删除文章** | 立即调用 `GET /v1/article` | 确认被删除的文章已不在列表中 |
| **审核文章** | 立即调用 `GET /v1/article` | 确认文章 `status` 已变更（0=驳回、1=通过、2=审核中） |
| **上传封面** | 调用 `GET /v1/article` 查看封面字段 | 确认 `coverImageUrl` 已更新为正确的 OSS 地址 |

### 执行原则

1. **写后必读**：每次写入/删除操作完成后，**必须立即**调用对应的 GET 接口回查
2. **以列表为准**：GET 返回的文章列表是唯一真实状态，POST/DELETE 返回的 `statusCode: 0` 不可信
3. **批量操作分批校验**：批量创建/删除时，每批完成后立即回查，不要等全部完成再查
4. **发现异常立即停止**：回查发现数据不符时，**停止后续操作**，先排查原因
5. **注意响应结构**：`GET /v1/article` 返回数据在 `data.data`（嵌套数组），不是 `data.list`

### 示例

```bash
# 1. 创建文章
curl -s -X POST "${baseUrl}/v1/article" ... -d '{"title":"测试文章",...}'

# 2. 立即回查确认（Write-then-Read）
curl -s -X GET "${baseUrl}/v1/article?page=1&limit=5&productId=${productId}&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" -H "Referer: ${referer}"
# → 检查返回列表中是否包含刚创建的文章，封面 URL 是否正确

# 3. 删除文章
curl -s -X DELETE "${baseUrl}/v1/article/${articleId}" ...

# 4. 立即回查确认（Write-then-Read）
curl -s -X GET "${baseUrl}/v1/article?page=1&limit=30&productId=${productId}&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" -H "Referer: ${referer}"
# → 确认该文章已不在列表中
```

---

## 配置

所有技能统一从 `geo-config/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：https://nbgeo.aimusiclj.com
