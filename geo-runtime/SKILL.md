---
name: geo-runtime
description: "GEO Skills 安装与运行时诊断技能。Use when the user says 安装技能、检查是否安装成功、doctor、环境检测、Node/Windows/Mac 兼容、初始化配置模板、检查 ~/.geo-skills、no-Python 诊断、技能缺失、配置文件找不到、认证/companyId/productId 状态检查. This support skill does not perform business writes."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: runtime
---

# GEO Runtime

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能。
> **定位**：共享运行时、Best GEO CLI 检查和安装完整性检查；不读取或要求平台认证材料。

## Best GEO CLI 迁移规则

`best-geo` CLI 是平台数据操作的唯一执行后端。所有平台读写必须通过 `best-geo call <capability> --input '<json>'`；写操作使用 CLI 的 `plan` → 用户确认 → `apply` 流程。旧版 HTTP 脚本不得作为新流程调用。

## 何时使用

使用本技能处理以下情况：

- 学员刚安装 GEO Skills，需要检查是否完整可用
- 任一 `geo-*` 技能提示缺少配置、依赖、脚本或运行时文件
- 需要确认 Node.js / lark-cli / Best GEO CLI / 技能文件是否可用
- 需要检查 `best-geo auth status`

不要用本技能执行文章上传、发布任务、收录导入等业务操作；这些应交给对应业务技能。

## 默认执行协议

- 默认运行时是 Node.js 18+；学员端不需要 Python。
- 平台操作统一使用 `scripts/best_geo.js` 调用 Best GEO CLI。
- 写操作必须先 dry-run/preview，真实执行后必须用 GET/list 回查验证。
- 中文正文不要通过 `curl -d` 或 PowerShell 单行 JSON 上传，使用 `geo-article/scripts/upload_article.js`。
- 图片/封面统一走 Best GEO CLI `textToImages.*`，素材入库使用 `images.create`。

完整协议见套件根目录 `GEO-SKILLS-EXECUTION-PROTOCOL.md`，常用命令见 `QUICK_COMMANDS.md`。

## 目录约定

GEO Skills Suite 应以同级技能文件夹形式安装：

```text
skills/
├── geo-runtime/
├── geo-hub/
├── geo-workflow-hub/
├── geo-student-workflow/
├── geo-config/
├── geo-account/
├── geo-article/
├── geo-indexing/
├── geo-publish/
├── geo-media-submission/
├── geo-brand/
├── geo-brand-diagnosis/        # 可选
├── geo-knowledge/
├── geo-knowledge-sync/
├── geo-keyword-pool/
├── geo-content/
├── geo-content-production/
├── geo-content-audit/
├── geo-content-to-publish-pipeline/
├── geo-content-archive/
├── geo-analysis/
├── geo-source-assets/
├── geo-troubleshooter/
└── geo-skill-evolution/
```

认证由 Best GEO CLI 管理，用户无需在技能中配置认证材料。CLI 配置位于 `~/.best-geo/config.json`，技能层不得复制或打印其中的凭证。

## 快速诊断

如果当前环境支持 shell，优先运行 Best GEO CLI 诊断：

```bash
best-geo version --check
best-geo auth status
best-geo capabilities
```

相对于 `geo-runtime` 技能目录：

```bash
node scripts/doctor.js
```

相对于 GEO Skills Suite 根目录：

```bash
node geo-runtime/scripts/doctor.js
```

如果需要首次创建用户级配置模板：

```bash
node geo-runtime/scripts/doctor.js --init-config
```

如果需要验证 CLI 授权与 capability 连通性：

```bash
node geo-runtime/scripts/doctor.js --check-api
```

## 诊断结果解读

| 状态 | 含义 | 处理方式 |
|------|------|----------|
| OK | 已就绪 | 可继续使用对应技能 |
| WARN | 可继续，但需要配置或可选依赖 | 按提示补充配置/依赖 |
| FAIL | 阻断问题 | 先修复缺失技能、Node/lark-cli 或配置问题；Python 仅在运行旧脚本时才需要 |
| SKIP | 未执行某项检查 | 通常是未启用可选检查 |

## 凭证与安全

- 永远不要把 CLI 凭证写入技能仓库或发给他人。
- 删除、发布、批量导入等写操作不在 runtime 中执行，必须交给业务技能并要求用户明确确认。

## 共享脚本

| 文件 | 用途 |
|------|------|
| `scripts/best_geo.js` | Best GEO CLI 统一桥接（唯一推荐的平台执行入口） |
| `scripts/doctor.js` | 无 Python 检查技能完整性、Node/lark-cli、配置和 API 连通性 |
| `../geo-keyword-pool/scripts/keyword_pool.js` | 关键词池、P0-P3 优先级、状态机和下一步动作 |
| `../geo-config/scripts/setup_defaults.js` | 首次安装后获取公司/产品列表，并写入默认 companyId/productId |
| `references/requirements.md` | 依赖说明与排障 |

业务脚本不得读取认证材料；统一调用 `geo-runtime/scripts/best_geo.js`。
