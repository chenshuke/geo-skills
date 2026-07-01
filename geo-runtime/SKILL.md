---
name: geo-runtime
description: "GEO Skills 安装与运行时诊断技能。Use when the user says 安装技能、检查是否安装成功、doctor、环境检测、Node/Windows/Mac 兼容、初始化配置模板、检查 ~/.geo-skills、no-Python 诊断、技能缺失、配置文件找不到、openKey/companyId/productId 状态检查. This support skill does not perform business writes."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: runtime
---

# GEO Runtime

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能。
> **定位**：共享运行时、凭证加载、依赖诊断和安装完整性检查；不执行业务写入操作。

## 何时使用

使用本技能处理以下情况：

- 学员刚安装 GEO Skills，需要检查是否完整可用
- 任一 `geo-*` 技能提示缺少配置、依赖、脚本或运行时文件
- 需要初始化或检查 `~/.geo-skills/credentials/geo-config.json`
- 需要确认 Node.js / lark-cli / GEO Skills / 配置文件是否可用；Python 只作为高级可选依赖
- 需要在 Claude Code 与 Codex 之间共用同一套 GEO 凭证

不要用本技能执行文章上传、发布任务、收录导入等业务操作；这些应交给对应业务技能。

## 默认执行协议

- 默认运行时是 Node.js 18+，Python 只作为旧脚本兼容。
- 有专用 Node 脚本时优先使用专用脚本；没有专用脚本时使用 `scripts/api_request.js` 替代手写 curl。
- 写操作必须先 dry-run/preview，真实执行后必须用 GET/list 回查验证。
- 中文正文不要通过 `curl -d` 或 PowerShell 单行 JSON 上传，使用 `geo-article/scripts/upload_article.js`。
- 图片/封面统一走 GEO `/v1/text-to-img`，默认 `model=v2`，不使用本地 SVG fallback。

完整协议见套件根目录 `GEO-SKILLS-EXECUTION-PROTOCOL.md`，常用命令见 `QUICK_COMMANDS.md`。

## 目录约定

GEO Skills Suite 应以同级技能文件夹形式安装：

```text
skills/
├── geo-runtime/
├── geo-hub/
├── geo-workflow-hub/
├── geo-config/
├── geo-account/
├── geo-article/
├── geo-indexing/
├── geo-publish/
├── geo-brand/
├── geo-brand-diagnosis/        # 可选
├── geo-knowledge/
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

共享配置不应放在技能目录中，而应放在用户级目录：

```text
~/.geo-skills/credentials/geo-config.json
```

优先级：环境变量 > 用户级配置 > 技能包模板。

## 快速诊断

如果当前环境支持 shell，优先运行 **Node.js 无 Python 诊断脚本**。

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

如果已配置 openKey，并需要验证 API 连通性：

```bash
node geo-runtime/scripts/doctor.js --check-api
```

兼容旧环境时仍可运行 `python3 geo-runtime/scripts/doctor.py`，但 Python 不再是学员必需依赖。

## 诊断结果解读

| 状态 | 含义 | 处理方式 |
|------|------|----------|
| OK | 已就绪 | 可继续使用对应技能 |
| WARN | 可继续，但需要配置或可选依赖 | 按提示补充配置/依赖 |
| FAIL | 阻断问题 | 先修复缺失技能、Node/lark-cli 或配置问题；Python 仅在运行旧脚本时才需要 |
| SKIP | 未执行某项检查 | 通常是缺少 openKey 或未启用 API 检查 |

## 凭证与安全

- 永远不要把真实 openKey 写入技能仓库或发给他人。
- 展示 openKey 时必须脱敏，例如 `abcd****wxyz`。
- 删除、发布、批量导入等写操作不在 runtime 中执行，必须交给业务技能并要求用户明确确认。

## 共享脚本

| 文件 | 用途 |
|------|------|
| `scripts/credentials.js` | 无 Python 跨技能读取 GEO 凭证 |
| `scripts/api_request.js` | 无 Python 通用 GEO API 调用工具，替代 curl，写操作需 `--force` |
| `scripts/doctor.js` | 无 Python 检查技能完整性、Node/lark-cli、配置和 API 连通性 |
| `../geo-keyword-pool/scripts/keyword_pool.js` | 关键词池、P0-P3 优先级、状态机和下一步动作 |
| `../geo-config/scripts/setup_defaults.js` | 首次安装后获取公司/产品列表，并写入默认 companyId/productId |
| `scripts/credentials.py` | 旧版 Python 凭证读取，保留兼容 |
| `scripts/doctor.py` | 旧版 Python 诊断，保留兼容 |
| `references/requirements.md` | 依赖说明与排障 |

业务脚本需要读取凭证时，优先使用 `geo-runtime/scripts/credentials.js`；只有维护旧 Python 脚本时才使用 `credentials.py`。
