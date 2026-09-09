---
name: geo-account
description: "查询 GEO 公司、项目、发布平台、发布账号以及图片和视频素材。用户要上传图片或视频时路由到 geo-oss-upload；文章、发布和收录分别使用对应技能。"
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "4.0.0"
  category: api
---

# GEO 账号与资源查询

平台查询统一通过 Best GEO CLI。认证由 `best-geo auth` 管理，不读取旧配置文件，也不直接请求历史 HTTP 接口。

## 能力范围

- 公司：`companies.list`、`companies.get`
- GEO 项目：`products.list`、`products.get`
- 发布平台：`publicationPlatforms.list`
- 发布账号：`publicationAccounts.list`
- 图片素材：`images.list`、`images.get`
- 视频素材：`videos.list`、`videos.get`

图片或视频上传不在本技能执行，路由到 `geo-oss-upload`（素材库上传）：

- 图片：`images.create → images.get`
- 视频：`videos.create → videos.get`

## 执行规则

1. 先执行 `best-geo version --check` 和 `best-geo capabilities`。
2. 根据 capability 的最新 schema 构造输入，不沿用旧接口字段。
3. 查询操作直接调用 `best-geo call`。
4. 如果用户需要修改素材名称、标签等写操作，必须 `plan → 展示摘要 → 用户明确确认 → apply`。
5. 列表默认先返回一页；结果较多时告诉用户总量，再按需翻页。

## 素材注意事项

- `videos.list` 的 `source` 只用于筛选现有视频来源，不表示要执行旧导入流程。
- 本地 MP4 上传需要封面图、视频时长和标题；由 `geo-oss-upload` 负责检查。
- 不把创建计划、任务排队或上传成功误写成发布成功；发布状态由 `geo-publish` 查询。
