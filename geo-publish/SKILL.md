---
name: geo-publish
description: "GEO 发布任务和分发管理技能。Use when the user says 发布文章、分发到公众号/知乎/搜狐/头条/CSDN/小红书/抖音/B站、创建发布任务、定时发布、删除发布任务、查看发布状态、发布状态回查、articleId 转 publishedUrl、发布失败/人工处理识别、投稿记录、媒体发布平台、发布统计. Do not draft/upload articles; use geo-content-production or geo-article first."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.4.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO 发布任务管理

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

本模块管理 GEO 平台的发布任务，支持将已审核通过的文章发布到多个平台账号（今日头条、搜狐号、B站、知乎、CSDN、微信公众号、小红书、抖音），支持定时发布和批量发布。

---

## 通用安全规则

## Base URL 输出规则

- Base URL 属于内部接口配置：脚本可以读取、测试和写入配置文件，但默认回复、日志、dry-run、JSON 预览中不得展示具体 Base URL。
- 用户侧可以展示 Referer、脱敏 openKey、companyId/productId、接口路径（如 `/v1/geo-company`），但不要展示接口域名。
- 用户只提供 openKey 时，先调用 `geo-config/scripts/configure_openkey.js` 自动识别平台接口与 Referer。

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。
- 有专用 Node 脚本时优先使用脚本；没有专用脚本时使用 `geo-runtime/scripts/api_request.js`，`curl` 只作为低级调试，不作为中文正文或批量写操作默认方案。

---

## 输出归位硬规则

发布任务创建、删除、状态核验、发布失败排查和媒体投稿记录必须直接写入 `06_发布记录/`，不要散落在项目根目录。写文件前可用 `geo-content-archive/scripts/project_paths.js --artifact publish-record` 获取路径。

## 能力总览

- **创建发布任务**：单篇/多篇文章发布到单个/多个平台账号，支持定时发布和 AIGC 开关
- **删除发布任务**：清理测试任务或取消已有发布任务（支持批量）
- **发布状态回查**：从 `/v1/publication-task` 和 `/v1/publication` 建立 `articleId → publishedUrl` 状态表，识别发布失败、无 URL、人工处理等情况

---


## 推荐脚本：发布状态回查 / articleId → publishedUrl

发布任务创建后，不能把“任务已创建”误判为“平台已发布”或“AI 已看见”。必须继续回查投稿记录：

```bash
node geo-publish/scripts/publication_status.js \
  --article-ids 101,102 \
  --project-dir "项目_品牌GEO"

# 只查指定发布任务
node geo-publish/scripts/publication_status.js \
  --task-ids 88,89 \
  --project-dir "项目_品牌GEO"
```


### Published URL 严格判定规则

- 只能把 `publishedUrl`、`publishUrl`、`postUrl`、`platformUrl` 这 4 类字段作为发布页 URL。
- 不得把 `coverImageUrl`、正文图片、OSS URL、`userImg`、图片 CDN URL 当成 publishedUrl。
- publication 行必须按自己的 `article.id` / `articleId` 精确绑定文章；发布任务里的 articleId 只能做辅助映射，不能把同一个 URL 套到多个 articleId 上。

输出到 `06_发布记录/发布状态回查/`：

- `发布状态回查_YYYY-MM-DD.md`：人工可读状态表
- `publication_status_YYYY-MM-DD.csv`：表格版
- `publication_status_YYYY-MM-DD.json`：给 `geo-indexing/scripts/published_url_match.js` 继续做 URL 命中检测



多 URL 说明：同一 `articleId` 可能存在多条平台发布记录。状态表会额外输出 `publicationId/sourceRecordId`、`publishAccountName`、`createdAt/updatedAt`、`isLatest`，方便区分历史 URL 和最新 URL。`isLatest=yes` 代表当前脚本按更新时间/记录 ID 判断的最新发布记录；如平台后台显示不一致，以平台后台为准。

状态判定：

| status | 含义 | 下一步 |
|---|---|---|
| `published_url_ready` | 已拿到 publishedUrl | 交给 geo-indexing 做 searchedSites 精确 URL 命中 |
| `task_created_no_publication_url` | 有发布任务但还没拿到发布 URL | 继续回查 `/v1/publication`，不要判定为已被 AI 看见 |
| `published_no_url` | 状态像已发布但 URL 缺失 | 人工核验平台后台或稍后复查 |
| `manual_required` | 疑似需要人工处理、登录、验证码、授权 | 到平台账号处理后再回查 |
| `failed` | 发布失败/驳回/异常 | 修复账号、封面、标题或平台规则后重发 |
| `pending_or_processing` | 仍在排队或处理中 | 等待后复查 |

> 拿到 `publishedUrl` 后，下一步使用 `geo-indexing/scripts/published_url_match.js` 判断 AI answers 的 `searchedSites` 是否命中新 URL。

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/publication-task | 创建发布任务 |
| DELETE | /v1/publication-task | 删除发布任务 |
| GET | /v1/publication-task | 回查发布任务是否真实创建、任务与 articleId 是否匹配 |
| GET | /v1/publication | 回查平台投稿/发布记录，提取 articleId 对应的 publishedUrl 和失败原因 |

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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# 以下变量从 geo-config.json 读取：${openKey}、${companyId}、${productId}
# ${articleId}、${publishAccountId} 从实际数据获取

# 单篇文章发布到单个账号
curl -s -X POST "${baseUrl}/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json; charset=utf-8" \
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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# ${taskId} 为实际的发布任务 ID
curl -s -X DELETE "${baseUrl}/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -H "Content-Type: application/json; charset=utf-8" \
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
8. **Published URL 回查**：任务存在后继续调用 `GET /v1/publication`，用 `articleId` 提取 `publishedUrl`、失败原因或人工处理状态

---

## 完整工作流

```text
1. 使用 geo-article 创建或上传文章，并记录 articleId。
2. 使用 geo-article 审核文章，确认文章状态允许发布。
3. 使用 geo-account 查询目标平台可用账号和每日额度。
4. 如需测试发布，使用 geo-publish 创建测试任务；测试后必须立即删除并回查。
5. 使用 geo-publish 创建正式发布任务；执行前必须展示文章 ID、账号 ID、平台、额度和发布时间并等待确认。
6. 发布任务创建后运行 `geo-publish/scripts/publication_status.js` 生成发布状态表；拿到 publishedUrl 后再交给 `geo-indexing/scripts/published_url_match.js` 检测 AI searchedSites 是否命中新 URL。
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
| **创建发布任务** | 立即调用 `GET /v1/publication-task`，随后调用 `GET /v1/publication` | 确认任务存在；再用 articleId 提取 publishedUrl、失败原因或人工处理状态 |
| **删除发布任务** | 立即调用 `GET /v1/publication-task` | 确认被删除的任务已不在列表中 |

### 执行原则

1. **写后必读**：每次创建/删除任务完成后，**必须立即**调用 `GET /v1/publication-task` 回查
2. **以列表为准**：GET 返回的任务列表是唯一真实状态，POST/DELETE 返回的 `statusCode: 0` 不可信
3. **批量操作分批校验**：批量创建/删除时，每批完成后立即回查，不要等全部完成再查
4. **发现异常立即停止**：回查发现数据不符时，**停止后续操作**，先排查原因
5. **注意响应结构**：`GET /v1/publication-task` 返回数据在 `data.data`（嵌套数组），不是 `data.list`
6. **不要混淆状态**：有 `articleId` 只说明文章进入发布任务；有 `publishedUrl` 才说明平台发布 URL 已生成；是否被 AI 看见还要用 `geo-indexing` 检查 `searchedSites` 命中

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
- 统一请求头：Authorization: Bearer ${openKey} + Referer（可展示 Referer，不展示 Base URL）
- Base URL：内部自动识别，不对用户展示
