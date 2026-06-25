# GEO Skills 默认执行协议（稳定版）

更新时间：2026-06-04

这份协议用于减少不同用户、不同系统、不同 AI 模型执行 GEO 技能时的不确定性。所有 `geo-*` 技能在没有更具体说明时，默认按这里执行。

## 1. 默认运行时

- 默认使用 **Node.js 18+**。
- 学员端不要求 Python、pip、Pillow、requests、baseopensdk。
- `.py` 文件只作为历史兼容入口，不作为教学/学员默认命令。
- 凭证统一从 `~/.geo-skills/credentials/geo-config.json` 或环境变量读取。

## 2. 写操作安全顺序

涉及上传、删除、审核、发布、批量导入时，必须遵守：

1. 先读取配置并确认 `companyId/productId` 非 0。
2. 优先运行脚本自带 `--dry-run` / preview。
3. 向用户展示将要写入/删除的关键对象，不展示真实 openKey。
4. 真实执行必须得到用户明确确认。
5. 执行后必须用 GET/list 回查验证，不能只相信 POST/DELETE 返回值。

首次安装时如果没有可用公司或产品，可以通过 `geo-config/scripts/setup_defaults.js` 创建，但这属于平台写操作，必须先 `--dry-run`，不得静默创建。

## 3. API 调用优先级

1. 有专用 Node 脚本时，优先使用专用脚本：
   - 文章上传：`geo-article/scripts/upload_article.js`
   - 文章删除：`geo-article/scripts/delete_articles.js`
   - 首次配置公司/产品：`geo-config/scripts/setup_defaults.js`
   - 问题导入/收录检测：`geo-indexing/scripts/import_questions.js`
   - 图片生成：`geo-content-production/scripts/generate_image.js`
   - 封面生成：`geo-content-production/scripts/generate_cover.js`
2. 没有专用脚本时，用通用 Node API 工具：`geo-runtime/scripts/api_request.js`。
3. `curl` 只作为低级调试方式，不作为中文正文、Windows PowerShell、批量写操作的默认方案。

## 4. 中文内容与编码

- 本地 Markdown 必须按 UTF-8 读取。
- 上传中文文章默认使用：

```bash
node geo-article/scripts/upload_article.js --file "文章.md" --dry-run
```

- 不要把中文正文直接塞进 `curl -d`、PowerShell 单行 JSON 或手写 shell 字符串。
- JSON 请求必须使用 `Content-Type: application/json; charset=utf-8`。
- dry-run 检测到 `ä¸­æ–‡`、`锟斤拷`、`�` 等疑似乱码时，先修复源文件编码。

## 5. 图片与封面

- GEO 图片/封面统一走 GEO 平台 `/v1/text-to-img`。
- 默认模型：`v2`。
- 返回优先使用 GEO OSS URL；不要把临时外部供应商 URL 当作最终发布素材。
- 不再使用本地 SVG 封面 fallback，因为真实发布链路兼容性不足。

## 6. 速度策略

- 普通诊断默认不访问业务写接口。
- 图片生成采用较短初始轮询 + 逐步退避，避免等太久也避免过度请求。
- 上传文章默认不自动生成封面；只有用户明确需要封面时才加 `--auto-cover`，否则优先使用已有 `--cover-url`。
- 能一次读取列表就不要逐条请求；批量删除/发布前先汇总预览。

## 6.1 项目文件输出硬规则

只要用户在 GEO 项目目录中工作，**每个技能产出文件时必须直接写入标准目录**，不要先散落到根目录再事后整理。

统一使用 8 目录结构：

```text
项目_{品牌名}GEO/
├── 00_项目概览/
├── 01_项目资料/
├── 02_知识库/
├── 03_规划方案/
├── 04_内容创作/
├── 05_质量审核/
├── 06_发布记录/
└── 07_监测分析/
```

写文件前，优先用共享路径工具确认输出位置：

```bash
node geo-content-archive/scripts/project_paths.js --project-dir "项目_品牌GEO" --artifact article --filename "文章标题.md" --json
```

常见 artifact：

| 产物 | artifact | 默认目录 |
|---|---|---|
| 知识库 | `knowledge` | `02_知识库/` |
| 关键词方案 | `keyword-plan` | `03_规划方案/关键词方案/` |
| 标题方案 | `title-plan` | `03_规划方案/标题方案/` |
| 文章 | `article` | `04_内容创作/{日期}/articles/` |
| 优化版文章 | `optimized-article` | `04_内容创作/{日期}/optimized/` |
| 封面图 | `cover` | `04_内容创作/{日期}/covers/` |
| 配图 | `image` | `04_内容创作/{日期}/images/` |
| 审核报告 | `audit-*` | `05_质量审核/` |
| 发布记录 | `publish-record` | `06_发布记录/` |
| 收录/分析报告 | `indexing-report` / `evidence-report` | `07_监测分析/` |

如果无法判断类型，写入 `00_项目概览/_待分类/`，并提示用户后续用 `geo-content-archive` 归位。

## 7. 推荐固定命令

```bash
# 安装/配置诊断
node geo-runtime/scripts/doctor.js
node geo-runtime/scripts/doctor.js --check-api

# 首次获取并设置 companyId/productId
node geo-config/scripts/setup_defaults.js --list
node geo-config/scripts/setup_defaults.js --company-id <公司ID> --product-id <产品ID> --force

# 没有公司/产品时，先预览再创建
node geo-config/scripts/setup_defaults.js --create-company --company-name "公司名" --company-description "公司描述" --dry-run
node geo-config/scripts/setup_defaults.js --create-product --company-id <公司ID> --product-name "产品名" --keywords "关键词1,关键词2" --target-words "目标词1,目标词2" --product-type 1 --dry-run

# 通用 API GET（替代 curl）
node geo-runtime/scripts/api_request.js --method GET --path /v1/article --use-defaults --query page=1 --query limit=10

# 通用 API 写操作预览（真实执行再加 --force）
node geo-runtime/scripts/api_request.js --method POST --path /v1/example --body-file payload.json --dry-run

# 图片/封面
node geo-content-production/scripts/generate_image.js --prompt "图片描述" --dry-run
node geo-content-production/scripts/generate_cover.js --title "文章标题" --dry-run

# 中文文章上传
node geo-article/scripts/upload_article.js --file "文章.md" --dry-run
node geo-article/scripts/upload_article.js --file "文章.md" --cover-url "https://...png"

# 本地问题导入 GEO 平台
node geo-indexing/scripts/import_questions.js --target indexing-custom --file "questions.md" --brand "品牌名" --dry-run
node geo-indexing/scripts/import_questions.js --target product-topic --file "deep_questions.md" --tags "深层用户问题,手动导入" --dry-run
```

## 公开技能包脱敏规则

- 公开仓库、课堂安装包和技能示例中不得出现真实客户名称、客户案例、客户项目路径或客户品牌别名。
- 示例统一使用 `示例品牌A / 示例品牌B / 示例品牌C`、`竞品A / 竞品B`、`某某科技有限公司` 等占位。
- 如果需要说明客户案例方法论，只描述结构和字段，不写真实客户名、真实数据或可反查项目线索。
