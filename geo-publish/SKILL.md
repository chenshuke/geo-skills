---
name: geo-publish
description: GEO发布任务管理技能。Use this skill when creating, verifying, deleting, or troubleshooting GEO platform publication tasks that send approved articles to external channels/accounts. Do not use for drafting/uploading articles or indexing checks; use geo-content-production, geo-article, or geo-indexing instead.
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.2.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO 发布任务管理

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

本模块管理 GEO 平台的发布任务，支持将已审核通过的文章发布到多个平台账号（今日头条、搜狐号、B站、知乎、CSDN、微信公众号、小红书、抖音），支持定时发布和批量发布。

---

## 通用安全规则

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。

---

## 能力总览

- **创建发布任务**：单篇/多篇文章发布到单个/多个平台账号，支持定时发布和 AIGC 开关
- **删除发布任务**：清理测试任务或取消已有发布任务（支持批量）

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/publication-task | 创建发布任务 |
| DELETE | /v1/publication-task | 删除发布任务 |

---

## 一、创建发布任务（POST /v1/publication-task）

### 参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--name` | 发布任务名称 | 是 | - |
| `--article-id` | 单个文章 ID | 否* | - |
| `--article-ids` | 多个文章 ID（逗号分隔） | 否* | - |
| `--platform` | 单个发布平台 | 否* | - |
| `--platforms` | 多个发布平台（逗号分隔） | 否* | - |
| `--account-id` | 单个发布账号 ID | 否* | - |
| `--account-ids` | 多个发布账号 ID（逗号分隔） | 否* | - |
| `--publish-time` | 定时发布时间（YYYY-MM-DD HH:MM:SS） | 否 | 立即发布 |
| `--product-id` | 产品 ID | 否 | 从配置读取 |
| `--company-id` | 公司 ID | 否 | 从配置读取 |
| `--aigc` | 是否使用 AIGC（true/false） | 否 | false |

> 文章 ID 和平台账号必须提供。

### 支持的平台

toutiao（今日头条）、sohu_news（搜狐号）、bilibili（B站）、zhihu（知乎）、csdn（CSDN）、wechat（微信公众号）、xiaohongshu（小红书）、douyin（抖音）

### 请求体结构

```json
{
  "name": "任务名称",
  "aigc": false,
  "productId": ${productId},
  "articles": [
    {
      "articleId": ${articleId},
      "platforms": [
        {
          "platform": "sohu_news",
          "publishAccountIds": [${publishAccountId}],
          "publishTime": null,
          "config": {
            "channels": [],
            "attribute": "",
            "requireLogin": false,
            "infoSource": "0",
            "sourceLink": ""
          }
        }
      ]
    }
  ],
  "companyId": ${companyId}
}
```

> **config 字段说明**：
> - `channels`：分发渠道（通常留空）
> - `attribute`：附加属性（通常留空）
> - `requireLogin`：是否需要登录才能阅读（false=公开）
> - `infoSource`：信息来源标识（`"0"`=原创，`"1"`=转载）
> - `sourceLink`：转载来源链接（原创时留空）

### curl 示例

```bash
# 以下变量从 geo-config.json 读取：${openKey}、${companyId}、${productId}
# ${articleId}、${publishAccountId} 从实际数据获取

# 单篇文章发布到单个账号
curl -s -X POST "${baseUrl}/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"任务名称\",
    \"aigc\":false,
    \"productId\":${productId},
    \"articles\":[{\"articleId\":${articleId},\"platforms\":[{\"platform\":\"sohu_news\",\"publishAccountIds\":[${publishAccountId}],\"publishTime\":null,\"config\":{\"channels\":[],\"attribute\":\"\",\"requireLogin\":false,\"infoSource\":\"0\",\"sourceLink\":\"\"}}]}],
    \"companyId\":${companyId}
  }"
```

### 成功响应

```json
{
  "statusCode": 0,
  "message": "success",
  "data": { "taskId": 123 }
}
```

---

## 二、删除发布任务（DELETE /v1/publication-task）

### 请求体

```json
{"ids": [${taskId1}, ${taskId2}]}
```

### curl 示例

```bash
# ${taskId} 为实际的发布任务 ID
curl -s -X DELETE "${baseUrl}/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json" \
  -d "{\"ids\":[${taskId}]}"
```

---

## 执行步骤

1. 从 `~/.geo-skills/credentials/geo-config.json` 读取 `openKey`、`companyId`、`productId`
2. **获取已登录账号列表**：调用 `GET /v1/publication-account`，按平台筛选出目标账号
3. **确认发布账号和额度**：
   - 展示目标平台的全部可用账号（名称、ID、平台、状态）
   - 展示每个账号的 `remainDaily`（剩余可发布数 = `maxPostOneDay - publishedTodayCount`）
   - 让用户确认使用哪些账号
   - > **注意**：每日发布限额可在 GEO 后台调整。如果额度不足，**提示用户可在后台调整**，不要直接中止流程
4. 解析参数（文章 ID、平台列表、账号列表、发布时间）
5. 参数验证：任务名称非空、文章 ID 与平台账号数量匹配、平台名称有效
6. 构造请求体并发送请求
7. **Write-then-Read 校验**：创建完成后立即调用 `GET /v1/publication-task` 回查确认（见下方强制校验规则）

---

## 完整工作流

```text
1. 使用 geo-article 创建或上传文章，并记录 articleId。
2. 使用 geo-article 审核文章，确认文章状态允许发布。
3. 使用 geo-account 查询目标平台可用账号和每日额度。
4. 如需测试发布，使用 geo-publish 创建测试任务；测试后必须立即删除并回查。
5. 使用 geo-publish 创建正式发布任务；执行前必须展示文章 ID、账号 ID、平台、额度和发布时间并等待确认。
```

---

## 注意事项

1. **先查账号再创建（重要）**：创建发布任务前，**必须先调用 `GET /v1/publication-account` 获取已登录账号列表**，让用户确认使用哪些账号，不要自行猜测或硬编码账号 ID
2. **额度不足时提示用户调整**：每个账号有 `maxPostOneDay`（每日发布上限）和 `publishedTodayCount`（今日已发布数）。如果 `remainDaily` 不足，**告知用户可在 GEO 后台调高限额**，不要直接放弃操作
3. **测试任务清理（重要）**：调试创建的发布任务**必须立即删除**，避免文章重复发布。正式发布前检查任务列表确认无残留测试任务
4. **productId 匹配**：发布任务的 productId 必须与文章关联的产品 ID 一致，否则返回 `statusCode: 10108`
5. **封面图必填**：文章必须设置封面图（coverImageUrl）才能创建发布任务，否则返回 `statusCode: 10104`
6. **定时发布**：时间格式必须为 `YYYY-MM-DD HH:MM:SS`
7. **文章状态**：文章必须先审核通过（status=1）才能发布
8. **多平台发布**：platforms 和 accountIds 数组长度必须一致，一一对应

---

## 强制校验规则（Write-then-Read）

> ⚠️ **此规则为最高优先级，任何写入/删除操作都必须遵守。**

GEO API 在参数错误（如 Referer 不匹配、账号额度不足）时可能返回 `statusCode: 0` 和假 ID（数据实际未写入）。因此**不要信任 POST/DELETE 的返回值，必须以 GET 列表接口的实际数据为准。**

### 校验流程

| 操作 | 必须执行的校验 | 校验内容 |
|------|---------------|---------|
| **创建发布任务** | 立即调用 `GET /v1/publication-task` | 确认任务存在于列表中、关联的文章 ID 和账号 ID 正确、任务状态符合预期 |
| **删除发布任务** | 立即调用 `GET /v1/publication-task` | 确认被删除的任务已不在列表中 |

### 执行原则

1. **写后必读**：每次创建/删除任务完成后，**必须立即**调用 `GET /v1/publication-task` 回查
2. **以列表为准**：GET 返回的任务列表是唯一真实状态，POST/DELETE 返回的 `statusCode: 0` 不可信
3. **批量操作分批校验**：批量创建/删除时，每批完成后立即回查，不要等全部完成再查
4. **发现异常立即停止**：回查发现数据不符时，**停止后续操作**，先排查原因
5. **注意响应结构**：`GET /v1/publication-task` 返回数据在 `data.data`（嵌套数组），不是 `data.list`

### 示例

```bash
# 1. 创建发布任务
curl -s -X POST "${baseUrl}/v1/publication-task" ... -d '{"name":"推广任务",...}'

# 2. 立即回查确认（Write-then-Read）
curl -s -X GET "${baseUrl}/v1/publication-task?companyId=${companyId}&productId=${productId}&page=1&limit=50" \
  -H "Authorization: Bearer ${openKey}" -H "Referer: ${referer}"
# → 检查返回列表中是否包含刚创建的任务，关联文章和账号是否正确

# 3. 删除发布任务
curl -s -X DELETE "${baseUrl}/v1/publication-task" ... -d '{"ids":[taskId]}'

# 4. 立即回查确认（Write-then-Read）
curl -s -X GET "${baseUrl}/v1/publication-task?companyId=${companyId}&productId=${productId}&page=1&limit=50" \
  -H "Authorization: Bearer ${openKey}" -H "Referer: ${referer}"
# → 确认该任务已不在列表中
```

---

## 配置

所有技能统一从 `~/.geo-skills/credentials/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：https://nbgeo.aimusiclj.com
