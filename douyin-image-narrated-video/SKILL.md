---
name: douyin-image-narrated-video
description: "将按顺序排列的图文卡片生成抖音逐卡口播视频，并输出标题、简介、话题、预览图和交付清单。Use when the user asks to turn images, AI答案卡, cards, or posters into a narrated Douyin video, add per-image Chinese voiceover, mix optional background music, or package an image-to-video result. Node.js only; no Python required. Do not use for talking-head editing, cinematic AI video generation, or direct account publishing."
license: MIT
metadata:
  version: "2.0.0"
  category: video
---

# 抖音图文转口播视频（Node.js）

把已经定稿、顺序明确的图文卡片转换为逐卡口播视频。默认输出 1080×1440、30fps、H.264/AAC MP4，同时生成标题、简介、话题、接触表和可追溯清单。

本技能只要求 Node.js 18.17+ 和网络连接，不要求 Python、pip 或系统预装 FFmpeg。首次使用在技能目录运行 `npm install`，依赖会提供 Edge 在线中文语音和跨平台 FFmpeg/FFprobe。

## 工作流

### 1. 收齐输入

必须获得：

- 已定稿图片及明确顺序；
- 每张图片对应的一句口播；
- 品牌名与本篇唯一问题；
- 发布标题、简介、话题；
- 可选背景音乐。

若用户只给图片和资料，先拟定逐卡口播与发布文案。每张图只讲一个核心事实，不把整篇简介机械拆成口播。

完整阅读 [project-contract.md](references/project-contract.md) 和 [copy-rules.md](references/copy-rules.md)，再创建 `project.json`。

### 2. 安装与诊断

在技能目录执行：

```bash
npm install
node scripts/doctor.mjs
```

Windows PowerShell、macOS 和 Linux 使用相同命令。不要提示学员安装 Python。

### 3. 校验项目

```bash
node scripts/build_narrated_video.mjs \
  --project "/absolute/path/to/project.json" \
  --output-dir "/absolute/path/to/new-output" \
  --dry-run
```

`--dry-run` 只检查输入、依赖、路径和内容，不联网合成语音，不创建视频。

### 4. 生成视频

```bash
node scripts/build_narrated_video.mjs \
  --project "/absolute/path/to/project.json" \
  --output-dir "/absolute/path/to/new-output"
```

脚本会：

1. 校验标题、简介、图片、路径、口播和参数；
2. 使用 `edge-tts-universal` 逐卡生成中文 MP3；
3. 根据口播真实时长自动延长对应画面，避免截断或不自然加速；
4. 使用内置 FFmpeg 合成画面、人声和可选背景音乐；
5. 输出 H.264/AAC MP4、图片副本、语音片段、接触表、发布文案和 `manifest.json`；
6. 使用 FFprobe 验证编码、尺寸、帧率、音频和总时长。

### 5. 验收

- MP4 可播放，页面顺序与 `cards` 一致；
- 口播和对应页面同步，无串卡、截断或背景音乐压住人声；
- 默认输出 1080×1440、30fps、H.264、AAC；
- 标题、首图、口播和简介回答同一个问题；
- `manifest.json` 状态为 `generated_not_published`，不要声称已发布、收录或被 AI 引用。

## 边界

- 本技能只生成发布素材，不自动操作抖音账号。
- 未确认版权的音乐不得用于正式发布；可先生成无背景音乐版本。
- 原图有错字、错误事实或版式问题时先修图，不用视频流程掩盖问题。
- Edge 在线语音不需要 API Key，但需要可访问其服务的网络；网络不可用时应明确报告，不伪造音频。

## 输出结构

```text
<输出目录>/
├─ final/<输出名>_逐卡口播版_final_hq.mp4
├─ images/01-原图名.png ...
├─ audio/segments/01.mp3 ...
├─ previews/contact-sheet.jpg
├─ 视频发布文案.md
└─ manifest.json
```

