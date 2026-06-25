# GEO Skills Suite 快速开始

这份指南面向学员：不需要安装器，只需要把所有 `geo-*` 文件夹放进 Claude Code 或 Codex 的技能目录。

> 推荐先看 `QUICK_COMMANDS.md` 复制固定命令；完整稳定执行规则见 `GEO-SKILLS-EXECUTION-PROTOCOL.md`。

## 0. 课前最低要求

- 安装 Node.js 18 或更高版本，并确认命令行能运行：

```bash
node -v
```

- 不需要安装 Python、pip、Pillow、requests 或 baseopensdk。
- 如需飞书同步，再单独安装并登录 `lark-cli`；普通 GEO 平台上传、收录、图片生成不依赖飞书。

## 1. 安装技能

### macOS / Linux：安装到 Codex

```bash
mkdir -p ~/.codex/skills
cp -R geo-* ~/.codex/skills/
```

### macOS / Linux：安装到 Claude Code

```bash
mkdir -p ~/.claude/skills
cp -R geo-* ~/.claude/skills/
```

### Windows PowerShell：安装到 Codex

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Get-ChildItem -Directory -Filter "geo-*" | ForEach-Object {
  Copy-Item $_.FullName -Destination "$env:USERPROFILE\.codex\skills" -Recurse -Force
}
```

### Windows PowerShell：安装到 Claude Code

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Get-ChildItem -Directory -Filter "geo-*" | ForEach-Object {
  Copy-Item $_.FullName -Destination "$env:USERPROFILE\.claude\skills" -Recurse -Force
}
```

必须包含 `geo-runtime`，否则共享凭证和诊断能力会缺失。

## 2. 检查是否安装成功

对 AI 说：

```text
使用 geo-runtime 检查我的 GEO Skills 是否安装成功。
```

或者运行：

macOS / Linux：

```bash
node ~/.codex/skills/geo-runtime/scripts/doctor.js
# 或
node ~/.claude/skills/geo-runtime/scripts/doctor.js
```

Windows PowerShell：

```powershell
node "$env:USERPROFILE\.codex\skills\geo-runtime\scripts\doctor.js"
# 或
node "$env:USERPROFILE\.claude\skills\geo-runtime\scripts\doctor.js"
```

如需创建配置模板：

macOS / Linux：

```bash
node ~/.codex/skills/geo-runtime/scripts/doctor.js --init-config
```

Windows PowerShell：

```powershell
node "$env:USERPROFILE\.codex\skills\geo-runtime\scripts\doctor.js" --init-config
```

如果诊断提示 `defaults.companyId` 或 `defaults.productId` 为 0，需要让 AI 主动帮你获取公司/产品列表，不要手猜 ID：

macOS / Linux：

```bash
node ~/.codex/skills/geo-config/scripts/setup_defaults.js --list
```

Windows PowerShell：

```powershell
node "$env:USERPROFILE\.codex\skills\geo-config\scripts\setup_defaults.js" --list
```

## 3. 配置 openKey

真实密钥统一放在：

```text
macOS / Linux: ~/.geo-skills/credentials/geo-config.json
Windows: %USERPROFILE%\.geo-skills\credentials\geo-config.json
```

你可以对 AI 说：

```text
使用 geo-config 帮我初始化 GEO 平台 openKey 配置。
```

配置好 openKey 后，再对 AI 说：

```text
使用 geo-config 帮我获取公司和产品列表，并设置默认 companyId/productId。
```

如果列表里没有公司或产品，对 AI 说：

```text
使用 geo-config 帮我创建公司和产品；先 dry-run 给我确认，不要直接写入。
```

配置模板：

```json
{
  "geo": {
    "baseUrl": "<内部接口地址>",
    "openKey": "your-openKey-here",
    "referer": "https://geo.bihuoai.com/"
  },
  "defaults": {
    "companyId": 0,
    "productId": 0
  }
}
```

## 4. 常用提问

```text
我不知道应该用哪个 GEO 技能，帮我选择。
帮我创建一个新的 GEO 品牌项目。
帮我整理这些资料成 GEO 知识库。
帮我规划关键词和标题。
帮我写一篇 GEO 文章并生成封面。
帮我审核这篇文章的覆盖度和媒体发布准备度。
帮我上传文章到 GEO 平台。
帮我创建发布任务，但发布前先让我确认。
帮我导入收录检测任务。
帮我分析收录结果和引用来源。
```

## 4.1 学员不懂 GEO 时也可以这样说

| 学员想做的事 | 可以直接对 AI 说 |
|---|---|
| 检查安装 | “检查一下我的 GEO 技能能不能用” |
| 首次配置账号 | “帮我配置 GEO 密钥，并获取公司和产品列表” |
| 不知道下一步 | “我想做 GEO 项目，但不知道流程，你带我一步步做” |
| 整理资料 | “把这些客户资料整理成后面能写文章的知识库” |
| 写文章 | “根据这些资料写一篇适合 AI 收录的公众号文章” |
| 生成封面/配图 | “帮这篇文章生成封面图” / “帮我生一张配图” |
| 审核文章 | “帮我检查这篇文章哪里还不适合发布或收录” |
| 上传文章 | “把这篇 Markdown 文章上传到 GEO 平台” |
| 导入问题 | “把这些用户问题导入收录检测” / “把这些深层问题放进产品主题库” |
| 查收录 | “看看这些问题在 DeepSeek/豆包/Kimi 里有没有收录” |
| 发布文章 | “创建发布任务，发到公众号/知乎/搜狐，发布前先让我确认” |
| 分析结果 | “分析 AI 引用了哪些来源，为什么没推荐我们品牌” |
| 归档文件 | “把这个项目的草稿、审核稿、发布记录整理归档” |

原则：学员不需要记技能名，只要说清楚“想做什么”，AI 应该自动触发对应技能。

## 4.2 文件必须直接写到正确目录

课堂项目统一要求：每个技能产出文件时，必须直接写入标准目录，不要先放在根目录或桌面再事后整理。

如果 AI 不确定路径，让它先运行：

```bash
node geo-content-archive/scripts/project_paths.js --project-dir "项目_品牌GEO" --artifact article --filename "文章标题.md" --json
```

常见目录：

- 知识库：`02_知识库/`
- 关键词/标题方案：`03_规划方案/`
- 文章/封面/配图：`04_内容创作/{日期}/`
- 审核报告：`05_质量审核/`
- 发布记录：`06_发布记录/`
- 收录和分析报告：`07_监测分析/`

## 5. 安全提醒

- 不要把真实 openKey 写入任何 `geo-*` 技能目录。
- 删除、发布、批量导入前，必须让 AI 先预览并等待你确认。
- 如果 AI 输出了完整 openKey，请立即停止并重新生成密钥。

## 6. 排障

| 问题 | 处理方式 |
|------|----------|
| 找不到 GEO 技能 | 确认所有 `geo-*` 文件夹都在技能目录第一层 |
| 缺少 `geo-runtime` | 重新复制 `geo-runtime/` |
| 401 / 403 | 重新获取 openKey 并更新 `~/.geo-skills/credentials/geo-config.json` |
| Python 模块缺失 | `无需安装 Python；优先使用 node geo-runtime/scripts/doctor.js` |
| 封面生成失败 | 先用 `--dry-run` 检查配置；再确认 GEO 文生图额度和 defaults.productId |
| 中文文章上传乱码 | 使用 `node geo-article/scripts/upload_article.js --file "文章.md" --dry-run` 检查 UTF-8，不要用 `curl -d` 上传中文正文 |
| 飞书同步失败 | 优先检查 lark-cli 登录和权限；使用 lark-base skill |
