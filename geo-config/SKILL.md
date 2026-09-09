---
name: geo-config
description: "Best GEO CLI 授权、运行检查和默认公司/项目选择。Use when the user asks to log in, check best-geo, list authorized companies or products, choose defaults, or create a company/product."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "4.0.0"
  category: api
---

# GEO CLI 配置

认证统一由 Best GEO CLI 管理，不再配置、保存或读取旧平台凭证文件。

## 认证与检查

```bash
best-geo version --check
best-geo auth status
```

未登录时运行 `best-geo auth login`。密钥只在 CLI 的本机授权流程中输入，不经过聊天消息、命令参数或技能文件。

## 默认公司和项目

使用 `scripts/setup_defaults.js`：

```bash
node geo-config/scripts/setup_defaults.js --list
node geo-config/scripts/setup_defaults.js --auto
node geo-config/scripts/setup_defaults.js --company-id 101 --product-id 93
```

默认值保存在用户级文件 `~/.best-geo/geo-skill-defaults.json`，只包含 `companyId`、`productId` 和更新时间，不包含任何密钥。

创建公司或项目属于写操作，先预览，确认后再执行：

```bash
node geo-config/scripts/setup_defaults.js --create-company --company-name "示例公司"
node geo-config/scripts/setup_defaults.js --create-product --company-id 101 --product-name "示例项目" --keywords "关键词" --target-words "目标词"
```

## 规则

- 公司/项目查询使用 `companies.list`、`products.list`。
- 公司/项目创建使用 `companies.create`、`products.create`，必须 `plan → 用户确认 → apply`。
- 不再提供套餐、余额、积分或配额配置入口。
- 遇到旧平台配置要求，直接说明已迁移到 CLI。
