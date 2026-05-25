# GEO Skills 依赖说明（无 Python 默认）

学员端默认不要求 Python。推荐依赖：

```bash
node -v
lark-cli --version
```

默认诊断：

```bash
node geo-runtime/scripts/doctor.js
```

可选高级依赖：

- Playwright/Chromium：仅用于 HTML 转 PNG 截图。没有时保留 HTML/SVG 交付。
- Python/Pillow/baseopensdk：仅旧脚本兼容，不作为课堂和学员必需依赖。
