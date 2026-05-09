# GEO 技能包

> 版本：v2.1 | 更新日期：2026-05-08

## 概述

本技能包包含 **GEO（Generative Engine Optimization）运营技能体系**，共 58 个子技能，覆盖 GEO 运营全流程。

## 两大入口

| 入口 | 用途 | 调用方式 |
|------|------|---------|
| **geo-hub** | GEO 平台 API 操作（查询/上传/删除/配置） | `/geo-hub` |
| **geo-workflow-hub** | GEO 运营工作流（品牌/关键词/内容/审核/发布/收录） | `/geo-workflow-hub` |

## 路由口诀

- **查 / 传 / 删 / 发 / 配 / 报 / 拓展** → `/geo-hub`
- **建 / 规 / 写 / 审 / 优 / 复盘** → `/geo-workflow-hub`

## 快速开始

### 1. 安装技能

将 `geo-topic-expand` 文件夹复制到你的 `.claude/skills/` 目录下：

```bash
cp -r geo-topic-expand ~/.claude/skills/
```

或在项目根目录下：

```bash
cp -r geo-topic-expand .claude/skills/
```

### 2. 配置 API 密钥

编辑 `geo-topic-expand/geo-config/geo-config.json`，填入你自己的 openKey：

```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "你的openKey",
    "referer": "https://geo.bihuoai.com/"
  },
  "defaults": {
    "productId": 0,
    "companyId": 0
  }
}
```

> **openKey 获取方式**：登录 GEO 管理平台 → 密钥管理 → 创建新密钥

### 3. 开始使用

```
/geo-hub              # 平台操作入口
/geo-workflow-hub     # 运营工作流入口
```

## 技能分类

### geo-hub 子技能（平台 API 操作）

| 分类 | 技能 | 说明 |
|------|------|------|
| 配置与认证 | `geo-config` | 管理API配置 |
| | `auto-login` | 认证管理 |
| 账号与数据 | `geo-account-list` | 查看账号列表 |
| | `geo-dashboard` | 查看Dashboard |
| | `geo-package` | 查看套餐 |
| | `geo-video` | 查看视频 |
| 内容与上传 | `upload-article` | 上传文章 |
| | `upload-image` | 上传图片 |
| | `generate-cover` | 生成封面 |
| | `geo-image-generation` | AI图片生成 |
| | `geo-article-create` | 创建文章 |
| | `geo-article-list` | 查看文章列表 |
| | `geo-article-review` | 审核文章 |
| | `geo-article-delete` | 删除文章 |
| 发布与状态 | `geo-publish-create` | 创建发布任务 |
| | `check-publication-status` | 查看发布状态 |
| 收录与监测 | `geo-indexing-check` | 检测收录排名 |
| | `geo-indexing-list` | 查看收录列表 |
| | `geo-indexing-delete` | 删除收录任务 |
| | `geo-indexing-batch-import` | 批量导入收录 |
| 拓展与报表 | `geo-topic-expand` | 主题拓展 |
| | `geo-report` | 查看报表 |
| | `geo-presale-report` | 售前报告 |
| | `bihuo-geo-quotation` | GEO报价单生成 |
| | `html-to-png` | HTML转PNG |

### geo-workflow-hub 子技能（运营工作流）

| 分类 | 技能 | 说明 |
|------|------|------|
| 品牌创建 | `geo-create-enterprise` | 创建企业品牌 |
| | `geo-create-product` | 创建产品品牌 |
| | `geo-create-personal` | 创建个人品牌 |
| | `geo-create-acquisition` | 创建获客账号 |
| 知识库 | `create-kb` | 创建知识库 |
| | `organize-kb` | 整理知识库 |
| | `extract-docx` | 提取DOCX内容 |
| | `supplement-list` | 补充清单 |
| 关键词 | `geo-keyword-plan` | 关键词规划 |
| | `geo-keyword-builder` | 关键词构建 |
| | `build-intent-tree` | 意图树构建 |
| 标题与内容 | `geo-title-generator` | 标题生成 |
| | `geo-aggregate-title` | 聚合标题 |
| | `geo-batch-create` | 批量创建 |
| | `geo-create-media-articles` | 媒体文章创建 |
| 审核 | `geo-review` | 内容审核 |
| | `audit-consistency` | 一致性审核 |
| | `audit-media-readiness` | 媒体就绪度审核 |
| | `audit-ai-detection` | AI检测 |
| | `check-coverage` | 覆盖度检查 |
| | `optimize-content` | 内容优化 |
| | `analyze-gaps` | 缺口分析 |
| | `create-compliant-ranking` | 合规排名 |
| 数据分析 | `geo-evidence-chain` | 证据链分析 |
| | `geo-platform-reverse` | 平台逆向分析 |
| | `sync-geo-plan` | 方案同步 |

## 外部依赖

部分技能需要额外安装依赖：

### Python 依赖

```bash
pip install requests python-dotenv
```

### 飞书同步（可选）

```bash
pip install baseopensdk
```

### 图片生成（可选）

需要配置 Fangxin API Key，存放在 `~/.geo-skills/credentials/fangxin_image_api_key`

### 报价单 PDF 生成（可选）

```bash
npm install puppeteer-core
```

## 目录结构

```
geo-topic-expand/
├── GEO-双入口技能说明书.md          # 总览文档
├── geo-hub/                         # 平台操作入口
│   └── skill.md
├── geo-workflow-hub/                # 工作流入口
│   └── skill.md
├── geo-config/                      # 配置管理
│   ├── SKILL.md
│   └── geo-config.json              # API配置（需自行填写openKey）
├── [58个子技能目录]/
│   └── SKILL.md
├── bihuo-geo-quotation/             # 报价单生成
│   ├── SKILL.md
│   ├── scripts/                     # JS脚本
│   └── templates/                   # HTML模板
└── geo-image-generation/            # 图片生成
    ├── SKILL.md
    └── scripts/
        └── generate_image.py
```

## 注意事项

1. **openKey 安全**：请勿将包含真实 openKey 的 `geo-config.json` 分享给他人
2. **API 地址**：所有技能使用 `https://nbgeo.aimusiclj.com` 作为 API 基地址
3. **配置引导**：首次使用 `/geo-hub` 或 `/geo-workflow-hub` 时会自动引导配置
4. **品牌示例**：技能文档中可能包含示例品牌名称（如"海顿"），使用时替换为你自己的品牌
