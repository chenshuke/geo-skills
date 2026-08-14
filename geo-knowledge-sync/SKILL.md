---
name: geo-knowledge-sync
description: "GEO 平台知识库双向同步技能。支持列出和查看平台知识库，把本地 Markdown、TXT、JSON、CSV、HTML、YAML、XML 文件或整个知识库目录上传为新知识库/追加到已有知识库，以及把平台知识库元数据和可下载文件保存到本地。Use when the user says 上传知识库、同步知识库、把本地知识库传到GEO平台、下载平台知识库、备份知识库、知识库列表、追加知识库文件。所有运行脚本使用 Node.js；写入平台前必须预览并经用户确认。"
---

# GEO 知识库同步

在本地项目知识库与 GEO 平台 `/v1/knowledge-base` 之间双向同步。继续使用 `geo-knowledge` 整理和提炼本地资料；本技能只负责平台传输和备份。

## 前置规则

1. 按 `../geo-config/SKILL.md` 读取 openKey、companyId、productId；默认 ID 为 0 时先让用户选择。
2. 不显示 Base URL 和完整 openKey。
3. 上传是平台写操作：先运行预览，不带 `--force` 不得提交。
4. 上传后必须 GET 详情回查知识库名称、文件数和状态。
5. 不编造平台没有返回的文档内容。下载时没有 `fileUrl` 的文档只记录元数据和缺失原因。

## 脚本

```bash
node geo-knowledge-sync/scripts/knowledge_sync.js --help
```

### 列出平台知识库

```bash
node geo-knowledge-sync/scripts/knowledge_sync.js --action list --limit 30
```

### 上传本地目录为新知识库

先预览：

```bash
node geo-knowledge-sync/scripts/knowledge_sync.js \
  --action upload \
  --source "项目_品牌GEO/02_知识库" \
  --name "品牌完整知识库" \
  --tags "品牌,产品,案例"
```

用户确认后加 `--force` 执行。默认递归读取 `.md/.txt/.json/.csv/.html/.htm/.yaml/.yml/.xml`。

PDF、Word、图片等二进制文件不能作为文本直接发送；先转成平台可访问 URL，再用 `--source-url URL`，或先整理为 Markdown。

### 追加到已有知识库

```bash
node geo-knowledge-sync/scripts/knowledge_sync.js \
  --action upload --knowledge-base-id 127 \
  --source "新增资料" --force
```

### 下载平台知识库

```bash
node geo-knowledge-sync/scripts/knowledge_sync.js \
  --action download --knowledge-base-id 127 \
  --output-dir "项目_品牌GEO/02_知识库/平台备份"
```

输出 `knowledge-base.json`、`manifest.md` 和平台实际提供下载地址的文档文件。

需要核对字段时读取 `references/api.md`。

