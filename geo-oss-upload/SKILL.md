---
name: geo-oss-upload
description: "通过 Best GEO CLI 将本地图片或 MP4 视频上传到 GEO 素材库并获取 URL；支持 Markdown 本地图片映射。Use when the user asks to upload an image, video, cover, screenshot, or local media file to GEO."
---

# GEO 素材上传

本技能不使用预签名上传流程，也不读取平台认证材料。素材上传统一通过 Best GEO CLI：

- 图片：`images.create` → `images.get`
- 视频：`videos.create` → `videos.get`

写入必须遵循 CLI 的 `plan → 用户确认 → apply`。脚本中使用 `--dry-run` 预览，确认后使用 `--force` 执行。

## 图片

```bash
node geo-oss-upload/scripts/upload_geo_oss.js \
  --file ./assets/cover.png \
  --product-id 93 \
  --tags GEO,封面 \
  --dry-run
```

执行后结果中的 `url` 即可用于 Markdown、文章或网页。

## 视频

视频必须同时提供本地封面和时长：

```bash
node geo-oss-upload/scripts/upload_geo_oss.js \
  --file ./assets/video.mp4 \
  --thumbnail ./assets/video.jpg \
  --duration 45 \
  --product-id 93 \
  --dry-run
```

## Markdown 图片映射

Markdown 中的本地图片可以先提取路径，逐张调用图片上传能力，再把返回的 `url` 写回 Markdown。已有 `http://` 或 `https://` 图片不需要重复上传。

旧版凭证文件、环境变量、预签名上传和 URL 转存流程均不得再使用。
