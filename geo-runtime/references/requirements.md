# GEO Runtime Requirements

## Required

```bash
python3 -m pip install requests python-dotenv
```

- `requests`: GEO API 调用、图片脚本下载/上传
- `python-dotenv`: 读取 `.env` 或 `~/.geo-skills/credentials/*.env`

## Optional

```bash
python3 -m pip install Pillow
python3 -m pip install baseopensdk
```

- `Pillow`: 本地封面图生成脚本 `geo-content-production/scripts/generate_cover.py`
- `baseopensdk`: `geo-analysis` 飞书多维表格同步

## Credential files

```text
~/.geo-skills/credentials/geo-config.json
~/.geo-skills/credentials/fangxin_image_api_key
~/.geo-skills/credentials/feishu.env
```

Do not store real credentials inside any `geo-*` skill folder.
