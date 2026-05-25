# GEO Skills Suite 快速开始

这份指南面向学员：不需要安装器，只需要把所有 `geo-*` 文件夹放进 Claude Code 或 Codex 的技能目录。

## 1. 安装技能

### 安装到 Codex

```bash
mkdir -p ~/.codex/skills
cp -R geo-* ~/.codex/skills/
```

### 安装到 Claude Code

```bash
mkdir -p ~/.claude/skills
cp -R geo-* ~/.claude/skills/
```

必须包含 `geo-runtime`，否则共享凭证和诊断能力会缺失。

## 2. 检查是否安装成功

对 AI 说：

```text
使用 geo-runtime 检查我的 GEO Skills 是否安装成功。
```

或者运行：

```bash
node ~/.codex/skills/geo-runtime/scripts/doctor.js
# 或
node ~/.claude/skills/geo-runtime/scripts/doctor.js
```

如需创建配置模板：

```bash
node ~/.codex/skills/geo-runtime/scripts/doctor.js --init-config
```

## 3. 配置 openKey

真实密钥统一放在：

```text
~/.geo-skills/credentials/geo-config.json
```

你可以对 AI 说：

```text
使用 geo-config 帮我初始化 GEO 平台 openKey 配置。
```

配置模板：

```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
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
| 封面生成失败 | 改用 `node geo-content-production/scripts/generate_cover.js` 生成 SVG |
| 飞书同步失败 | 优先检查 lark-cli 登录和权限；使用 lark-base skill |
