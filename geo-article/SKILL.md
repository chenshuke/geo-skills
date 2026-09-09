---
name: geo-article
description: "通过 Best GEO CLI 管理 GEO 文章、图片和视频素材。"
license: MIT
metadata:
  suite: geo-skills
  version: "4.0.0"
  category: api
---

# GEO 文章与素材

所有平台读写只通过 Best GEO CLI capability 完成。认证由 `best-geo auth` 管理；本技能不读取认证材料或内部配置文件，也不直接发 HTTP 请求。

## 可用 capability

- 文章：`articles.create`、`articles.list`、`articles.get`、`articles.setStatus`、`articles.update`、`articles.delete`
- 素材：`images.create`、`images.get`、`videos.create`、`videos.get`、`folders.*`

写操作必须走 `best-geo plan` → 用户确认 → `best-geo apply`；删除和发布尤其需要明确确认。

## 推荐流程

1. `best-geo auth status`
2. 确认 companyId/productId
3. 本地检查 Markdown UTF-8、标题、正文、封面 URL
4. 使用 `geo-article/scripts/upload_article.js --dry-run` 预览
5. 用户确认后执行上传，并使用 `articles.get/list` 回查

```bash
node geo-article/scripts/upload_article.js --file "文章.md" --dry-run
node geo-article/scripts/upload_article.js --file "文章.md" --cover-url "https://example.com/cover.png" --force
node geo-article/scripts/delete_articles.js --id 123 --dry-run
```

封面由 `geo-content-production/scripts/generate_cover.js` 调用 `textToImages.*` 生成；图片和视频入库分别使用 `images.create` / `videos.create`，返回素材库 URL 后再写入文章。

## 输出与安全

- 文章放入项目 `04_内容创作/{日期}/articles/`
- 图片/封面放入 `04_内容创作/{日期}/images/` 或 `covers/`
- 上传和审核记录放入 `06_发布记录/`
- 不输出内部认证信息，不保留旧 API、OSS 预签名或手工 curl 上传流程
- 中文正文始终从 UTF-8 文件读取，不在 shell 中拼接大段 JSON
