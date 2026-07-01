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




## 故障排查

```bash
# 不知道哪里失败时，先用固定格式输出：问题/原因/证据/下一步/是否人工确认
node geo-troubleshooter/scripts/troubleshoot.js --symptom "发布任务创建成功但没有 publishedUrl" --project-dir "项目_品牌GEO"

# 带证据文件诊断
node geo-troubleshooter/scripts/troubleshoot.js --symptom "answers 有数据但 matrix 没数据" --answers-json answers.json --matrix-json matrix.json --project-dir "项目_品牌GEO"
```

## 发布状态回查 / URL 精确命中

```bash
# 发布任务创建后：articleId -> publishedUrl 状态表
node geo-publish/scripts/publication_status.js --article-ids 101,102 --project-dir "项目_品牌GEO"

# 判断 publishedUrl 是否被 AI answers.searchedSites 精确命中
node geo-indexing/scripts/published_url_match.js --publication-json "项目_品牌GEO/06_发布记录/发布状态回查/publication_status_YYYY-MM-DD.json" --schedule-id 123 --project-dir "项目_品牌GEO"

# 本地 answers JSON 模式
node geo-indexing/scripts/scheduled_indexing.js --action answers --id 123 --limit 200 --json-out answers.json
node geo-indexing/scripts/published_url_match.js --published-url "https://..." --answers-json answers.json --title "文章标题" --account "账号名" --project-dir "项目_品牌GEO"
```

## 引用源资产库 / 信源补强

```bash
# 先导出 Scheduled Indexing answers，再沉淀 searchedSites 为资产库
node geo-indexing/scripts/scheduled_indexing.js --action answers --id 123 --limit 200 --json-out answers.json
node geo-source-assets/scripts/source_assets.js --action import --project-dir "项目_品牌GEO" --answers-json answers.json --owned-domains "example.com" --owned-brands "示例品牌A" --competitor-brands "竞品A,竞品B"

# 直接从计划拉取并生成资产库
node geo-source-assets/scripts/source_assets.js --action fetch --project-dir "项目_品牌GEO" --schedule-id 123 --limit 200 --owned-domains "example.com" --owned-brands "示例品牌A"

# 更新下一步补强建议
node geo-source-assets/scripts/source_assets.js --action next --project-dir "项目_品牌GEO"
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
