# GEO Skills 快速命令卡片

> 面向学员和不同 AI 模型：优先复制这些命令，减少手写 API / curl / 编码错误。

## 诊断

```bash
node geo-runtime/scripts/doctor.js
node geo-runtime/scripts/doctor.js --check-api
node geo-runtime/scripts/doctor.js --json
```

## 查看配置（不展示真实 openKey）

```bash
node geo-runtime/scripts/credentials.js
```

## 首次设置公司和产品

```bash
node geo-config/scripts/setup_defaults.js --list
node geo-config/scripts/setup_defaults.js --company-id <公司ID> --product-id <产品ID> --force
node geo-config/scripts/setup_defaults.js --auto

# 如没有公司/产品，先预览再创建
node geo-config/scripts/setup_defaults.js --create-company --company-name "公司名" --company-description "公司描述" --dry-run
node geo-config/scripts/setup_defaults.js --create-product --company-id <公司ID> --product-name "产品名" --keywords "关键词1,关键词2" --target-words "目标词1,目标词2" --product-type 1 --dry-run
```

## 通用 API（替代 curl）

```bash
node geo-runtime/scripts/api_request.js --method GET --path /v1/article --use-defaults --query page=1 --query limit=10
node geo-runtime/scripts/api_request.js --method POST --path /v1/article --body-file payload.json --dry-run
node geo-runtime/scripts/api_request.js --method POST --path /v1/article --body-file payload.json --force
```

## 图片和封面

```bash
node geo-content-production/scripts/generate_image.js --prompt "必火AI科技感封面图，无文字" --aspect-ratio 16:9 --dry-run
node geo-content-production/scripts/generate_cover.js --title "2026年GEO优化服务商推荐TOP5" --brand "必火AI" --dry-run
```

## 中文文章上传

```bash
node geo-article/scripts/upload_article.js --file "文章.md" --dry-run
node geo-article/scripts/upload_article.js --file "文章.md" --cover-url "https://...png"
node geo-article/scripts/upload_article.js --file "文章.md" --auto-cover
```

## 删除文章

```bash
node geo-article/scripts/delete_articles.js --id 123 --dry-run
node geo-article/scripts/delete_articles.js --id 123 --force
```

## 问题导入 / 收录检测

```bash
# 创建 Scheduled Indexing 定时收录计划
node geo-indexing/scripts/scheduled_indexing.js --action create --file questions.md --name "品牌名-每日收录" --platforms deepseek,doubao,qwen,kimi --schedule-type daily --times-per-day 1 --dry-run

# 创建后立即执行一次
node geo-indexing/scripts/scheduled_indexing.js --action run-now --id 123 --dry-run
node geo-indexing/scripts/scheduled_indexing.js --action answers --id 123 --limit 50

# 本地深层用户问题导入产品主题库
node geo-indexing/scripts/import_questions.js --target product-topic --file deep_questions.md --tags "深层用户问题,手动导入" --dry-run

# 从平台主题生成任务中选择搜索问题插入
node geo-indexing/scripts/import_questions.js --target topic-task-select --task-id 123 --selected-ids 0,2,5 --dry-run
```

## 项目目录和输出路径

```bash
# 创建/补齐标准 8 目录
node geo-content-archive/scripts/project_paths.js --project-dir "项目_品牌GEO" --ensure

# 写文件前获取正确输出路径
node geo-content-archive/scripts/project_paths.js --project-dir "项目_品牌GEO" --artifact article --filename "文章标题.md" --json
node geo-content-archive/scripts/project_paths.js --project-dir "项目_品牌GEO" --artifact cover --filename "cover_01.png" --json
node geo-content-archive/scripts/project_paths.js --project-dir "项目_品牌GEO" --artifact audit-coverage --filename "覆盖度报告.md" --json
```
