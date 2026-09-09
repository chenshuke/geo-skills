# GEO Skills 常见问题

### Q1：第一次使用如何授权？

运行 `best-geo auth status` 检查状态；未授权时运行 `best-geo auth login`。授权在本机完成，密钥不会写入技能目录、聊天消息或命令参数。

### Q2：如何选择公司和项目？

运行：

```bash
node geo-config/scripts/setup_defaults.js --list
node geo-config/scripts/setup_defaults.js --company-id <公司ID> --product-id <项目ID>
```

默认值保存到 `~/.best-geo/geo-skill-defaults.json`，不保存任何密钥。

### Q3：CLI 报认证错误怎么办？

先运行 `best-geo version --check` 和 `best-geo auth status`。如果授权失效，重新运行 `best-geo auth login`；不需要在技能中另行配置认证材料。

### Q4：图片或视频如何上传？

使用 `geo-oss-upload`：图片调用 `images.create`，视频调用 `videos.create`。视频需要 MP4、封面图、时长和标题，返回 URL 后可用于文章或网页。

### Q5：搜索问题如何上传？

直接使用 `geo-indexing/scripts/import_questions.js --target questions`，底层 capability 是 `questions.create`。如果要同时创建监测计划，使用 `--target scheduled-indexing`。

### Q6：发布任务创建后为什么没有 URL？

任务排队成功不等于平台已发布。使用 `geo-publish/scripts/publication_status.js`，底层通过 `publicationTasks.list` 和 `publicationRecords.list` 回查真实状态与 `publishedUrl`。

### Q7：哪些旧功能已经移除？

套餐、余额、积分、配额、OEM 视频导入、产品主题库、主题任务和旧自定义收录均已移除。对应请求不会回退到旧 API。

### Q8：Python 是必需的吗？

不是。核心 GEO Skills 使用 Node.js 和 Best GEO CLI；旧 Python 文件仅作为历史兼容材料，不是学员运行要求。
