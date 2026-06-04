---
name: geo-content
description: "GEO 内容工作流路由技能。Use when the user asks 内容生产怎么走、先写还是先审、关键词标题文章封面审核优化的整体流程, or needs routing between writing and auditing. For writing/keyword/title/image/cover use geo-content-production; for review/gap/coverage/compliance use geo-content-audit."
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

## 内容审核

一致性审核 / 媒体就绪审核 / AI检测 / 覆盖度检查 / Gap分析 / 合规榜单 / 内容优化

→ 详见 `../geo-content-audit/SKILL.md`

## 完整工作流

```
[关键词规划] → [标题生成] → [内容创作] → [覆盖度检查]
                                                |
                                          ≥90% (A级) ──→ [审核流程]
                                                |
                                          <90% ──→ [内容优化] ──→ 重新检查
```
