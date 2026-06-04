# GEO Skills 无 Python 兼容方案（Windows / macOS）

## 目标

大量学员电脑没有 Python，因此 GEO Skills 的默认路径改为：

```text
Markdown / HTML / GEO 平台图片 URL / lark-cli / Node.js 优先
Python 仅作为旧版高级可选
```

## 新默认运行时

| 能力 | 无 Python 方案 | 说明 |
|---|---|---|
| 环境诊断 | `node geo-runtime/scripts/doctor.js` | 检查技能、配置、lark-cli、API |
| 凭证读取 | `geo-runtime/scripts/credentials.js` | Node 脚本统一读取 `~/.geo-skills/credentials/geo-config.json` |
| 首次公司/产品设置 | `node geo-config/scripts/setup_defaults.js` | 获取公司/产品列表并写入默认 companyId/productId |
| 通用 API 调用 | `node geo-runtime/scripts/api_request.js` | 替代 curl，自动带凭证/Referer/UTF-8，写操作需 `--force` |
| 品牌诊断报告渲染 | `node geo-brand-diagnosis/scripts/render_geo_brand_diagnosis.js` | MD → HTML，PNG 可选 |
| 中文文章上传 | `node geo-article/scripts/upload_article.js` | UTF-8 检测、疑似乱码拦截、上传后回查 |
| 问题导入 | `node geo-indexing/scripts/import_questions.js` | 本地问题导入自定义 AI 收录任务或产品主题库 |
| 文章封面 | `node geo-content-production/scripts/generate_cover.js` | 调 GEO 平台 `/v1/text-to-img`，默认 model=v2，无需 Python/Pillow |
| AI 图片生成 | `node geo-content-production/scripts/generate_image.js` | 调 GEO 平台 `/v1/text-to-img`，无需 Python，默认 model=v2 |
| 删除文章 | `node geo-article/scripts/delete_articles.js` | 使用 Node fetch 调 API |

## 学员最低要求

1. 能使用 Claudian / Codex Agent。
2. 如果要运行本地脚本，建议安装 Node.js 18+。
3. 如果要操作飞书，安装并登录 `lark-cli`。
4. 不再要求安装 Python、pip、Pillow、requests、baseopensdk。

## 兼容策略

- 课堂交付优先使用 Markdown、HTML 和 GEO 平台图片 URL，这些不依赖 Python。
- 不再内置本地 SVG 封面 fallback；封面统一走 GEO 平台生图，返回可发布的图片 URL。
- 旧 Python 脚本保留给助教或高级用户，不作为学员必需步骤。
