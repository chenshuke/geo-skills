# GEO Skills 无 Python 兼容方案（Windows / macOS）

## 目标

大量学员电脑没有 Python，因此 GEO Skills 的默认路径改为：

```text
Markdown / HTML / Best GEO CLI / lark-cli / Node.js 优先
Python 不属于 GEO Skills 学员端依赖
```

## 新默认运行时

| 能力 | 无 Python 方案 | 说明 |
|---|---|---|
| 环境诊断 | `node geo-runtime/scripts/doctor.js` | 检查技能、配置、lark-cli、API |
| 认证 | `best-geo auth status/login` | CLI 统一管理授权，不读取旧凭证文件 |
| 首次公司/产品设置 | `node geo-config/scripts/setup_defaults.js` | 获取公司/产品列表并写入默认 companyId/productId |
| 通用平台调用 | `node geo-runtime/scripts/best_geo.js` | 调用 Best GEO CLI capability；写操作先 plan，再由用户确认 apply |
| 品牌诊断报告渲染 | `node geo-brand-diagnosis/scripts/render_geo_brand_diagnosis.js` | MD → HTML，PNG 可选 |
| 中文文章上传 | `node geo-article/scripts/upload_article.js` | UTF-8 检测、疑似乱码拦截、上传后回查 |
| 收录计划创建 | `node geo-indexing/scripts/scheduled_indexing.js --action create` | 创建 Scheduled Indexing 定时收录计划，不走旧 custom 收录 |
| 搜索问题导入 | `node geo-indexing/scripts/import_questions.js --target questions` | 通过 `questions.create` 写入 GEO 项目问题 |
| 文章封面 | `node geo-content-production/scripts/generate_cover.js` | 调 Best GEO CLI `textToImages.*`，无需 Python/Pillow |
| AI 图片生成 | `node geo-content-production/scripts/generate_image.js` | 调 Best GEO CLI `textToImages.*`，结果可用 `images.create` 入库 |
| 删除文章 | `node geo-article/scripts/delete_articles.js` | 通过 CLI capability 执行预览与确认流程 |

## 学员最低要求

1. 能使用 Claudian / Codex Agent。
2. 如果要运行本地脚本，建议安装 Node.js 18+。
3. 如果要操作飞书，安装并登录 `lark-cli`。
4. 不再要求安装 Python、pip、Pillow、requests、baseopensdk。

## 兼容策略

- 课堂交付优先使用 Markdown、HTML 和 GEO 平台图片 URL，这些不依赖 Python。
- 不再内置本地 SVG 封面 fallback；封面统一走 Best GEO CLI 生图并返回可发布 URL。
- 旧 Python 脚本不作为任何 GEO 流程步骤。
