# GEO 技能包常见问题

---

### Q1: 如何获取 openKey？

登录 GEO 管理平台（[geo.bihuoai.com](https://geo.bihuoai.com)），进入 **密钥管理** 页面，点击 **创建新密钥**，复制生成的 openKey 并填入 `~/.geo-skills/credentials/geo-config.json`。

---

### Q2: 首次使用提示 companyId 为 0？

这是正常现象。`companyId` 和 `productId` 的初始值均为 0，首次使用 `geo-hub` 或 `geo-workflow-hub` 时，系统会自动调用 API 获取公司列表和产品列表，引导你进行选择。选择结果会自动写入配置文件。

---

### Q3: 出现 401 或 403 错误怎么办？

| 错误码 | 原因 | 解决方案 |
|--------|------|---------|
| **401** | openKey 无效或已过期 | 登录 GEO 管理平台重新获取 openKey，更新 `~/.geo-skills/credentials/geo-config.json` |
| **403** | 权限不足或套餐已到期 | 检查当前账号的套餐状态和权限配置 |

---

### Q4: 图片上传失败？

检查以下几点：
1. OSS 预签名 URL 是否成功获取（可在 API 日志中查看）
2. 文件名是否合规：仅允许英文、数字、`.`、`_`、`-`，不允许中文和特殊字符
3. 图片大小是否超出限制
4. 网络连接是否正常

---

### Q5: 飞书同步不工作？

飞书同步功能需要额外配置：

1. 安装依赖：`pip install baseopensdk`
2. 在 `.env` 文件中配置以下环境变量：
   - `APP_TOKEN` - 飞书应用 Token
   - `PERSONAL_BASE_TOKEN` - 个人基础 Token
   - `TABLE_KEYWORDS` - 多维表格关键词
3. 确认飞书应用已获得相应权限

---

### Q6: AI 图片生成失败？

AI 图片生成功能需要芳信 API Key：

1. 将 API Key 存放于 `~/.geo-skills/credentials/fangxin_image_api_key`
2. 确保文件权限设置正确（建议 600）
3. 确认 API Key 额度充足

---

### Q7: 技能在哪里运行？

GEO 技能包支持以下运行环境：
- **Claude Code**：将所有 `geo-*` 文件夹放入 `~/.claude/skills/`
- **Codex**：将所有 `geo-*` 文件夹放入 `~/.codex/skills/`
- **其他兼容 Agent Skills 目录结构的客户端**：按客户端要求安装同级 `geo-*` 文件夹

其中 `geo-runtime/scripts/doctor.py`、图片生成、封面生成等脚本可在普通 Python 环境中运行；业务 API 操作建议由 Claude Code 或 Codex 根据技能说明执行。

---

### Q8: 支持哪些 AI 平台的收录检测？

目前支持以下 **9 个** AI 平台的收录检测：

| 平台 | 检测方式 |
|------|---------|
| DeepSeek | API 检测 |
| 豆包 | API 检测 |
| 元宝 | API 检测 |
| 千问 | API 检测 |
| 文心一言 | API 检测 |
| Kimi | API 检测 |
| 智谱 | API 检测 |
| ChatGPT | API 检测 |
| Gemini | API 检测 |

---

### Q9: 如何更新技能包？

从 GitHub 仓库拉取最新代码，然后重新复制所有 `geo-*` 文件夹到技能目录：

```bash
git clone https://github.com/chenshuke/geo-skills.git
cd geo-skills
cp -R geo-* ~/.claude/skills/   # Claude Code
cp -R geo-* ~/.codex/skills/    # Codex
```

开发者也可以使用软链接模式，让仓库更新后工具侧自动同步：

```bash
for d in geo-*; do
  [ -d "$d" ] && ln -sfn "$(pwd)/$d" ~/.claude/skills/"$d"
  [ -d "$d" ] && ln -sfn "$(pwd)/$d" ~/.codex/skills/"$d"
done
```

---

### Q10: 发布文章到哪些平台？

目前支持将文章发布到以下 **8 个**外部媒体平台：

| 平台 | 类型 |
|------|------|
| 知乎 | 问答社区 |
| 搜狐 | 新闻门户 |
| 今日头条 | 资讯平台 |
| B站 | 视频平台 |
| CSDN | 技术社区 |
| 微信 | 社交平台 |
| 小红书 | 生活社区 |
| 抖音 | 短视频平台 |
