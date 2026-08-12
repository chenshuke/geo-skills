---
name: geo-content
description: "GEO 内容工作流路由技能。Use when the user asks 内容生产怎么走、先写还是先审、关键词标题文章封面审核优化的整体流程, or needs routing between writing and auditing. For writing/keyword/title/image/cover use geo-content-production; for review/gap/coverage/compliance use geo-content-audit; for one-click cover/upload/approve/account-query/publish-preview orchestration use geo-content-to-publish-pipeline."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: router
---

# GEO 内容创作（总入口）

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

> 本模块已拆分为两个独立模块，请直接使用：

## 内容生产

关键词规划 / 标题创作 / 图片生成 / 封面生成

→ 详见 `../geo-content-production/SKILL.md`

AI答案卡 / 抖音图文 / 问题导向的分页答案内容

→ 详见 `../geo-ai-answer-card/SKILL.md`

## 内容审核

一致性审核 / 媒体就绪审核 / AI检测 / 覆盖度检查 / Gap分析 / 合规榜单 / 内容优化

→ 详见 `../geo-content-audit/SKILL.md`

## 内容到发布流水线

封面生成与 OSS、本地 Markdown 上传、文章审核通过、发布账号查询、发布任务 dry-run、用户确认清单、失败重试记录

→ 详见 `../geo-content-to-publish-pipeline/SKILL.md`

## 完整工作流

```
[关键词规划] → [标题生成] → [内容创作] → [覆盖度检查]
                                                |
                                          ≥90% (A级) ──→ [内容到发布流水线]
                                                |
                                          <90% ──→ [内容优化] ──→ 重新检查
```
