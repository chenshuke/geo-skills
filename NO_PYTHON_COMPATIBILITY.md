# GEO Skills 无 Python 兼容方案（Windows / macOS）

## 目标

大量学员电脑没有 Python，因此 GEO Skills 的默认路径改为：

```text
Markdown / HTML / SVG / lark-cli / Node.js 优先
Python 仅作为旧版高级可选
```

## 新默认运行时

| 能力 | 无 Python 方案 | 说明 |
|---|---|---|
| 环境诊断 | `node geo-runtime/scripts/doctor.js` | 检查技能、配置、lark-cli、API |
| 凭证读取 | `geo-runtime/scripts/credentials.js` | Node 脚本统一读取 `~/.geo-skills/credentials/geo-config.json` |
| 品牌诊断报告渲染 | `node geo-brand-diagnosis/scripts/render_geo_brand_diagnosis.js` | MD → HTML，PNG 可选 |
| 文章封面 | `node geo-content-production/scripts/generate_cover.js` | 生成 SVG，无需 Pillow |
| AI 图片生成 | `node geo-content-production/scripts/generate_image.js` | 调 Fangxin API，无需 Python |
| 删除文章 | `node geo-article/scripts/delete_articles.js` | 使用 Node fetch 调 API |

## 学员最低要求

1. 能使用 Claudian / Codex Agent。
2. 如果要运行本地脚本，建议安装 Node.js 18+。
3. 如果要操作飞书，安装并登录 `lark-cli`。
4. 不再要求安装 Python、pip、Pillow、requests、baseopensdk。

## 兼容策略

- 课堂交付优先使用 Markdown、HTML、SVG，这些不依赖 Python。
- 不再内置自动 HTML 转 PNG：HTML/SVG 可直接查看、上传飞书，图片版建议用浏览器/系统截图或 AI 图片生成。
- 旧 Python 脚本保留给助教或高级用户，不作为学员必需步骤。
