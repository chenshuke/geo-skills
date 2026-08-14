---
name: geo-content-to-publish-pipeline
description: "GEO 内容到发布总控流水线技能。Use when the user says 一条龙/一步到位/总控/流水线/从关键词到发布/从标题方案生成文章并发布/内容审核后上传/批量生成封面/OSS图片/文章上传审核/发布任务预览/发布确认清单. Orchestrates geo-content-production, geo-content-audit, geo-article, geo-account, and geo-publish; always dry-run/preview before creating real publication tasks."
---

# GEO 内容到发布总控流水线

用于把“关键词/标题/文章/封面/上传/审核/账号/发布预览”串成一个可恢复的交付链路，减少多技能之间来回切换。

## 安全边界

- 不要在回复、日志或 Markdown 报告里展示 Base URL；可以展示 Referer、脱敏 openKey、companyId/productId 和接口路径。
- 真实发布任务创建前必须先输出确认清单，并等待用户明确确认。
- 图片/封面默认用 `--oss-mode local`：先下载 provider 图片，再走 `/v1/oss/pre` 本地文件上传并验证 URL，避免长签名图片 URL 转存返回 `null`。
- 文章上传必须使用 `geo-article/scripts/upload_article.js`，该脚本会发送 `summaries: []` 或 `summaries: [摘要]`，不要再手写旧字段 `summary`。
- 任何上传、审核、发布写操作失败时，记录失败阶段、原因、可重试命令和已完成资产。

## 推荐流程

1. 若用户只给 openKey：先用 `../geo-config/scripts/configure_openkey.js` 自动识别平台并配置默认 companyId/productId。
2. 用 `geo-content-production` 读取知识库、关键词方案、标题方案，生成 Top N 文章草稿。
3. 用 `geo-content-audit` 审核文章；未达标先优化，不要上传。
4. 用本技能脚本统一处理封面、上传、审核、账号查询和发布预览：

```bash
node geo-content-to-publish-pipeline/scripts/pipeline.js \
  --project-dir "项目目录" \
  --keyword-plan "03_规划方案/关键词方案/关键词方案.md" \
  --title-plan "03_规划方案/标题方案/标题方案.md" \
  --article-dir "04_内容创作/2026-06-26/articles" \
  --count 3 \
  --platforms sohu_news,wechat \
  --generate-cover \
  --execute
```

### 已有文章和封面时的快速路径

如果 Markdown frontmatter 已有 `coverImageUrl`、`coverUrl` 或 `cover` 的公开 HTTPS 地址，流水线会自动识别并跳过文生图。此时不要传 `--generate-cover`，直接执行上传和审核：

```bash
node geo-content-to-publish-pipeline/scripts/pipeline.js \
  --project-dir "项目目录" \
  --article-dir "04_内容创作/文章目录" \
  --count 1 \
  --execute
```

如果封面只有本地文件，先用 `geo-oss-upload` 上传得到 URL，再写入文章 frontmatter 的 `coverImageUrl`，或在流水线中传 `--cover-url "https://..."`。不要让流水线重新生成已有封面。

每个阶段都会记录耗时到 `pipeline-state.json` 和 `pipeline-plan.md`，用于定位慢在封面、上传、审核还是发布查询。

默认会在 `06_发布记录/pipeline-runs/{timestamp}/` 生成：

- `pipeline-state.json`：机器可读状态，可用于排查/续跑
- `pipeline-plan.md`：选题、文章、封面、上传、账号与发布计划
- `confirmation-checklist.md`：正式发布前给用户确认的清单
- `retry-commands.md`：失败阶段的重试命令
- `publish-payload.json`：发布任务请求体预览（不含 Base URL / openKey）

## 脚本能力

### 只做计划和确认清单

```bash
node geo-content-to-publish-pipeline/scripts/pipeline.js \
  --project-dir "项目目录" \
  --title-plan "标题方案.md" \
  --count 5 \
  --platforms sohu_news,wechat \
  --dry-run
```

### 已有文章后执行封面、上传、审核、账号查询和发布 dry-run

```bash
node geo-content-to-publish-pipeline/scripts/pipeline.js \
  --project-dir "项目目录" \
  --article-dir "04_内容创作/2026-06-26/articles" \
  --count 3 \
  --platforms sohu_news,wechat \
  --generate-cover \
  --approve \
  --execute
```

`--execute` 允许封面生成、文章上传和文章审核；发布任务仍只生成 dry-run 清单。

### 用户确认后创建正式发布任务

只有当用户明确确认清单无误后，才运行：

```bash
node geo-content-to-publish-pipeline/scripts/pipeline.js \
  --project-dir "项目目录" \
  --state "06_发布记录/pipeline-runs/{timestamp}/pipeline-state.json" \
  --create-publish-task \
  --confirm
```

脚本创建发布任务后，以平台 POST 已接受作为本阶段完成，立即保存任务 ID 和 `accepted_pending_async_processing` 状态，不再等待异步发布结果。这样不会因为平台审核或分发延迟而卡住。需要时可额外传 `--verify-publish-task` 做一次非阻塞查询；正式发布链接和失败原因应由后续 `geo-publish` 的发布状态回查流程处理。

如果使用同一个 `pipeline-state.json` 重试，脚本会识别已有 `publishCreated`，避免重复创建发布任务。

## 输入建议

- `--knowledge-dir`：项目知识库目录，供计划报告引用。
- `--keyword-plan`：关键词方案 Markdown。
- `--title-plan`：标题方案 Markdown；脚本会提取 Top N 标题/问题。
- `--article-dir` 或 `--articles`：已通过审核的 Markdown 文章。
- `--count`：本轮处理数量。
- `--platforms`：发布平台偏好，如 `sohu_news,wechat,zhihu`。
- `--brand` / `--keywords`：生成封面时透传给封面脚本。

## 输出给用户时

- 先说清楚：已完成哪些资产、哪些阶段待确认、哪些失败可重试。
- 给出确认清单路径，不要直接创建发布任务。
- 如遇失败，给出 `retry-commands.md` 中对应命令，避免让用户重新跑全链路。
