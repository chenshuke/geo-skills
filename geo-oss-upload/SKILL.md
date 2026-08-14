---
name: geo-oss-upload
description: "GEO OSS 图片上传技能。Use when the user says 上传图片到 GEO OSS、把本地图片变成 URL、批量上传截图/素材、替换 Markdown 里的本地图片链接、生成图片 URL 映射、飞书/文章/网页发布前处理图片素材. Reads GEO credentials from local config or environment; never hardcode or print openKey."
---

# GEO OSS Upload

Use this skill to upload local images to the GEO platform OSS and get public URLs, especially before moving Markdown content into Feishu/Lark where local Obsidian image links will not render.

The bundled uploader requires Node.js 18 or newer and has no Python or third-party package dependency.

## Security rules

- Do not ask the user to paste `openKey` into a note or final answer.
- Prefer credentials from one of these locations:
  1. `--config <path>` argument
  2. `GEO_OSS_CONFIG` or `GEO_CONFIG` environment variable
  3. `~/.geo-skills/credentials/geo-config.json`
  4. nearest `geo-config/geo-config.json` found from the current directory upward
  5. environment variables `GEO_BASE_URL`, `GEO_OPENKEY`, `GEO_REFERER`
- If the user provides an openKey, save it only to a local config file with restricted permissions, or use it in an environment variable for the current command. Never print it.
- Keep a backup before replacing Markdown image references.

## Quick commands

Upload one or more images:

```bash
node ~/.codex/skills/geo-oss-upload/scripts/upload_geo_oss.js --file image1.png --file image2.jpg
```

Upload all images matched by a glob:

```bash
node ~/.codex/skills/geo-oss-upload/scripts/upload_geo_oss.js --glob 'assets/*.png'
```

Replace local image references in a Markdown file with OSS URLs:

```bash
node ~/.codex/skills/geo-oss-upload/scripts/upload_geo_oss.js \
  --markdown 'path/to/article.md' \
  --replace \
  --output 'path/to/oss-image-mapping.json'
```

Use an explicit config file:

```bash
node ~/.codex/skills/geo-oss-upload/scripts/upload_geo_oss.js \
  --config 'geo-config/geo-config.json' \
  --markdown 'path/to/article.md' \
  --replace
```

## Config format

The script accepts either nested GEO Skills config:

```json
{
  "geo": {
    "baseUrl": "https://example.com",
    "openKey": "...",
    "referer": "https://geo.example.com/"
  }
}
```

or flat config:

```json
{
  "baseUrl": "https://example.com",
  "openKey": "...",
  "referer": "https://geo.example.com/"
}
```

## Markdown replacement behavior

- Supports Markdown images: `![alt](local/path.png)`.
- Supports Obsidian embeds: `![[image.png]]` and `![[image.png|300]]`.
- Resolves paths relative to the Markdown file directory first, then current working directory.
- Replaces local image references with `![alt](https://...oss...)`.
- Leaves existing `http://` and `https://` image URLs unchanged unless explicitly uploaded as files.
- Writes a backup named `<file>.bak_before_oss` by default.

## Typical Feishu workflow

1. Run the Markdown replacement command.
2. Verify the generated Markdown has no local image refs.
3. Upload/import the Markdown to Feishu/Lark. Feishu can render the OSS image URLs because they are public HTTPS links.

## Troubleshooting

- If credentials are missing, ask the user to either:
  - create `~/.geo-skills/credentials/geo-config.json`, or
  - provide a local config path, or
  - run with `GEO_BASE_URL`, `GEO_OPENKEY`, and `GEO_REFERER` environment variables.
- If upload fails after `/v1/oss/pre`, check whether the returned `host`, `policy`, `signature`, `OSSAccessKeyId`, `key`, and `callback` fields exist.
- If filenames contain Chinese characters or spaces, the script sanitizes the uploaded object filename automatically.
