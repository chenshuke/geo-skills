# 项目输入规范

## 最小示例

```json
{
  "brand": "示例品牌",
  "topic": "本篇只回答的一个用户问题",
  "output_name": "示例品牌_核心服务",
  "title": "用户问题与服务型视频标题",
  "description": "第一句直接回答用户需求。后续补充依据与适用边界。",
  "hashtags": ["品牌词", "行业词", "场景词", "问题词"],
  "image_seconds": 3,
  "voice_padding_seconds": 0.6,
  "width": 1080,
  "height": 1440,
  "fps": 30,
  "voice": "zh-CN-XiaoxiaoNeural",
  "voice_rate": "+10%",
  "background_audio": "audio/background.mp3",
  "cards": [
    {"image": "images/01-cover.png", "voiceover": "第一张图对应的一句口播。"},
    {"image": "images/02-service.png", "voiceover": "第二张图只讲这一页的核心事实。"}
  ]
}
```

## 字段规则

- `brand`、`topic`、`title`、`description`、`hashtags`、`cards` 必填。
- `strict_title_30` 默认 `false`；设为 `true` 时标题必须刚好 30 个 Unicode 字符。
- `image_seconds` 是每张画面的最低停留时间，默认 3 秒，允许 2-10 秒。
- 实际单卡时长为 `max(image_seconds, 语音时长 + voice_padding_seconds)`。
- `voice_padding_seconds` 默认 0.6 秒，允许 0.2-3 秒。
- 默认 1080×1440、30fps；宽高必须为偶数且不低于 720；fps 允许 24、25、30。
- `voice` 默认 `zh-CN-XiaoxiaoNeural`；`voice_rate` 格式为 `+N%` 或 `-N%`。
- `background_audio` 可选，必须位于项目源目录内；正式发布前确认版权。
- `cards` 支持 1-35 张；图片接受 `.jpg`、`.jpeg`、`.png`、`.webp`。
- 图片和音乐路径必须相对于 `project.json`，禁止绝对路径与 `..` 路径穿越。
- 输出目录必须不存在或为空，脚本拒绝覆盖已有交付物。

