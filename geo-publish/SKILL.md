---
name: geo-publish
description: "通过 Best GEO CLI 创建、管理和回查文章发布任务。Use when the user asks to publish articles to connected accounts, schedule publication, pause/resume/delete a task, or check published URLs and failures."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "4.0.0"
  category: api
---

# GEO 发布管理

发布平台、账号、任务和发布记录统一通过 Best GEO CLI，不读取旧凭证，不直接请求历史 HTTP 接口。

## 能力映射

- 平台：`publicationPlatforms.list`
- 账号：`publicationAccounts.list`
- 任务列表：`publicationTasks.list`
- 创建文章发布任务：`publicationTasks.createArticle`
- 创建视频发布任务：`publicationTasks.createVideo`
- 暂停/恢复/删除：`publicationTasks.pause`、`publicationTasks.resume`、`publicationTasks.delete`
- 发布记录：`publicationRecords.list`

## 发布流程

1. 用 `articles.list` 筛选审核通过且有封面的文章。
2. 用 `publicationAccounts.list` 查询可用账号，让用户确认平台和账号。
3. 组装 `publicationTasks.createArticle` 的 `items`，每项包含 `articleId`、平台和账号 ID。
4. 写操作必须 `best-geo plan` → 原样展示摘要 → 用户明确确认 → `best-geo apply`。
5. 任务提交后，先用 `publicationTasks.list` 确认任务，再用 `publicationRecords.list` 查询真实状态和 `publishedUrl`。

创建任务成功不等于平台已经发布；没有 `publishedUrl` 时只能标记为待回查、失败或需要人工处理。

## 脚本

`scripts/publication_status.js` 只负责通过 CLI 读取任务和发布记录，并生成 JSON/CSV 回查报告。

## 边界

- 媒体投稿使用 `geo-media-submission`，不是本技能。
- 文章创建、审核和删除使用 `geo-article`。
- 不保留套餐、余额、积分、配额或旧 API 认证说明。
