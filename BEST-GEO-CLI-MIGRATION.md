# Best GEO CLI 执行说明

所有平台型 GEO 技能都通过 `best-geo` CLI capability 执行。认证由 `best-geo auth login/status` 在本机管理；技能文件只传递业务输入，不保存或展示认证材料。

## 覆盖范围

- 公司与项目：`companies.*`、`products.*`
- 文章与文件夹：`articles.*`、`folders.*`
- 知识库：`knowledge.*`
- 收录监测：`scheduledIndexing.*`、`scheduledSentiment.*`
- 发布与投稿：`publication*`、`media*`
- 图片、视频与生图：`images.*`、`videos.*`、`textToImages.*`
- 搜索问题、关键词与文章任务：`questionTasks.*`、`keywordTasks.*`、`articleTasks.*`

素材上传已统一为 `images.create` 和 `videos.create`；搜索问题由 `questions.*` 管理；收录监测由 `scheduledIndexing.*` 管理。

## 技能层边界

技能负责本地文件处理、内容生产、策略与分析、报告生成和用户确认。所有平台读写通过 CLI capability 完成；写操作始终遵循 `plan` → 用户确认 → `apply`。

当前若需要统计文件导出、媒体枚举或知识库原始文件导出，应作为 CLI 产品能力补充后再接入，技能层不提供旁路实现。

## 旧版学员升级

学员升级时使用仓库根目录的 `upgrade-geo-skills.js`，不要手工把新目录复制到旧目录上：

```bash
node upgrade-geo-skills.js       # 预演
node upgrade-geo-skills.js --apply
```

升级器的顺序是：校验源目录 → 检测 `best-geo`（缺失时自动执行 `npm install --global best-geo@latest`）→ 备份现有 `geo-*` 技能和已知旧版技能路径 → 清理旧目录 → 安装当前技能 → 校验失败时恢复备份。默认目标是 `~/.codex/skills` 和 `~/.claude/skills`，可用 `--targets` 或 `--target-dir` 扩展。旧 CLI 配置不会被复制；CLI 登录态独立保留在本机，由 `best-geo auth status` 检查。离线环境可用 `--no-cli-install`，但检测不到 CLI 时升级会停止，不会安装不完整的技能。
