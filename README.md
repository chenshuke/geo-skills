# GEO Skills

面向 Claude Code、Codex 以及其他 Agent Skills 客户端的 GEO（Generative Engine Optimization，生成式引擎优化）运营技能包。

这套技能把 GEO 工作拆成可以直接调用的模块：品牌定位、知识库、问题规划、内容创作、发布、AI 收录监测、引用来源分析、品牌诊断和下一轮优化。

## 你可以用它做什么

- 让 AI 了解并准确描述你的品牌、公司或产品
- 找出 AI 为什么不推荐你、推荐了哪些竞品
- 根据真实监测回答和引用来源制定 GEO 内容方案
- 生成文章、封面、AI 答案卡和抖音图文
- 上传文章、图片和知识库到 GEO 平台
- 创建发布任务并查询发布状态
- 提交 AI 上榜监测，读取完整回答和引用 URL
- 对比优化前后的监测结果，判断内容是否有效
- 生成品牌诊断、引用源、证据链和复盘报告

## 环境要求

- Node.js 18 或更高版本
- Claude Code、Codex 或其他兼容 Agent Skills 的客户端
- GEO 平台账号和 openKey
- 不要求安装 Python、pip、Pillow 或其他 Python 依赖

图片上传、文章上传、知识库同步和 GEO API 操作均优先使用 Node.js 脚本完成。

## 安装

### 安装到 Codex

```bash
git clone https://github.com/chenshuke/geo-skills.git
cd geo-skills
mkdir -p ~/.codex/skills
cp -R geo-* ~/.codex/skills/
```

### 安装到 Claude Code

```bash
mkdir -p ~/.claude/skills
cp -R geo-* ~/.claude/skills/
```

如果你会持续修改技能，建议使用软链接。这样更新仓库后，客户端会直接使用最新文件：

```bash
mkdir -p ~/.codex/skills ~/.claude/skills
for d in geo-*; do
  [ -d "$d" ] || continue
  ln -sfn "$(pwd)/$d" ~/.codex/skills/"$d"
  ln -sfn "$(pwd)/$d" ~/.claude/skills/"$d"
done
```

Windows 用户可以把所有 `geo-*` 文件夹复制到：

```text
%USERPROFILE%\.codex\skills\
%USERPROFILE%\.claude\skills\
```

## 第一次使用

安装后，直接对 AI 说：

```text
使用 geo-runtime 检查我的 GEO Skills 是否安装成功。
```

然后初始化平台配置：

```text
使用 geo-config 帮我初始化 GEO 平台配置。
```

也可以直接运行检查脚本：

```bash
node ~/.codex/skills/geo-runtime/scripts/doctor.js
node ~/.codex/skills/geo-runtime/scripts/doctor.js --init-config
```

## 配置 GEO 平台

配置文件放在用户目录，不要放进 Git 仓库：

```text
macOS / Linux: ~/.geo-skills/credentials/geo-config.json
Windows:       %USERPROFILE%\.geo-skills\credentials\geo-config.json
```

配置格式：

```json
{
  "geo": {
    "baseUrl": "<GEO平台接口地址>",
    "openKey": "your-openKey-here",
    "referer": "<GEO平台Referer>"
  },
  "defaults": {
    "companyId": 0,
    "productId": 0
  }
}
```

`companyId` 和 `productId` 不确定时，不要猜。让 `geo-config` 读取公司和产品列表，再选择正确的项目。

## 三个总入口

不确定该调用哪个技能时，直接使用：

```text
使用 geo-hub 帮我完成 GEO 平台查询、上传或发布操作。
使用 geo-workflow-hub 帮我安排 GEO 品牌、内容和分析流程。
使用 geo-student-workflow 从零带我完成一个 GEO 项目。
```

简单记忆：

| 你想做的事 | 入口 |
|---|---|
| 查、传、删、配 | `geo-hub` |
| 建、规、写、审、优 | `geo-workflow-hub` |
| 不知道从哪一步开始 | `geo-student-workflow` |

## GEO 完整工作流

```text
品牌定位
  → 知识库和证据整理
  → 用户问题/关键词规划
  → 内容创作与审核
  → 上传和发布
  → AI 上榜监测
  → 引用来源与效果分析
  → 诊断病根
  → 下一轮内容优化和复测
```

发布后不要只看“文章已上传”。应提交新的上榜监测，再对比优化前后的同一问题、同一 AI 平台和相近测试条件。

## 技能地图

### 运行和平台操作

| 技能 | 用途 |
|---|---|
| `geo-runtime` | 环境、Node.js、配置和凭证检查 |
| `geo-config` | 初始化 openKey、接口配置、公司和产品选择 |
| `geo-hub` | GEO 平台 API 总入口和路由 |
| `geo-account` | 查询公司、产品、账号、套餐、配额和资源 |
| `geo-article` | 上传、查询、审核和删除文章/素材 |
| `geo-oss-upload` | 将本地图片上传为 GEO OSS URL，支持 Markdown 替换；Node.js 实现 |
| `geo-knowledge-sync` | 本地知识库与 GEO 平台知识库双向上传/下载 |
| `geo-publish` | 创建发布任务、查询发布状态和获取 publishedUrl |
| `geo-indexing` | 创建和查询 Scheduled Indexing 上榜监测任务 |

### 品牌和内容

| 技能 | 用途 |
|---|---|
| `geo-brand` | 企业、产品和个人品牌定位及基础介绍 |
| `geo-knowledge` | 整理企业资料，提炼优势、证据和资料缺口 |
| `geo-keyword-pool` | 管理问题、关键词和 P0-P3 优先级 |
| `geo-content-production` | 规划标题、写文章、生成封面和配图 |
| `geo-content-audit` | 审核事实、证据、覆盖度、合规和发布质量 |
| `geo-ai-answer-card` | 创作 AI 答案卡、抖音图文和答案型内容 |
| `geo-content-to-publish-pipeline` | 从已有文章到封面、上传、审核、账号和发布预览的一条龙流程 |
| `geo-media-submission` | 查询媒体投稿平台，选择媒体并提交投稿 |
| `geo-content` | 内容工作流路由入口 |

### 分析和改进

| 技能 | 用途 |
|---|---|
| `geo-brand-diagnosis` | 判断 AI 是否认识品牌、如何描述品牌、为什么推荐或不推荐、竞品为何占位 |
| `geo-brand-action-plan` | 根据监测回答、竞品、引用来源和知识库制定 GEO 落地方案 |
| `geo-analysis` | 分析 AI 回答、收录效果、证据链、平台偏好、竞品和优化前后变化 |
| `geo-source-assets` | 从一个或多个监测任务提取真实 searchedSites 和引用 URL |
| `geo-troubleshooter` | 排查配置、接口、上传、发布和收录问题 |
| `geo-content-archive` | 按项目、日期和阶段整理 GEO 文件 |
| `geo-skill-evolution` | 内部团队沉淀行业经验、问题和技能改进 |

## 最常用的提问方式

### 做品牌诊断

```text
请调用品牌诊断技能，读取 GEO 平台已有监测任务，判断 AI 是否清晰认识我的品牌、为什么不推荐、竞品有哪些，并找出最重要的病根。
```

### 制定落地方案

```text
请调用 GEO 落地方案技能，基于刚刚的品牌诊断、AI 回答、竞品、引用来源和知识库，告诉我：
1. 优先解决哪个用户问题；
2. 希望 AI 形成什么判断；
3. 已有和缺少哪些知识证据；
4. 应创作哪些文章、视频或答案卡；
5. 每个内容应发布到哪些真实可引用的平台；
6. 何时用什么指标复测。
```

### 创建上榜监测

```text
请调用 GEO 收录监测技能，只提交我刚刚最终确认的这个问题，使用豆包，创建一次性监测任务。先给我 dry-run 预览，等我确认后再创建。
```

### 分析优化前后效果

```text
请调用 GEO 分析技能，列出可选的上榜监测任务，让我选择优化前和优化后的两次任务。保持相同问题和 AI 平台，对比品牌提及、明确推荐、优先推荐、竞品占位、我方 URL 精确引用和引用来源变化，判断本次内容发布是否有效，找出仍未解决的病根，并给出下一步内容、平台和复测建议。
```

### 提取真实引用来源

```text
请调用 GEO 引用源资产技能，让我选择一个或多个上榜监测任务，分别提取每个问题、每个 AI 平台实际引用的来源标题和 URL，并按平台给出信源补强建议。
```

### 内容到发布

```text
请用 geo-content-to-publish-pipeline 处理这篇已经有文章和封面的内容。不要重新生成封面，先上传和审核，生成发布预览，等我确认后再创建发布任务。
```

## 重要行为说明

### 发布任务是异步的

创建发布任务成功，只代表 GEO 平台已经接受任务，不代表文章已经审核完成或已经拿到发布链接。

流水线会保存任务 ID 并结束，不会因为平台暂时还没有返回链接而卡住。发布链接和失败原因需要后续通过 `geo-publish` 查询。

### 监测前后必须保持可比

比较优化效果时，尽量保持：

- 同一个用户问题
- 同一个 AI 平台
- 相近的监测时间和执行条件
- 清楚区分一次回答和多次稳定结果

不同问题或不同平台的结果不能直接当作优化前后对比。

### 引用来源不等于品牌事实

`searchedSites` 只能说明 AI 检索或引用过哪些网页，不代表网页支持回答中的全部事实。企业优势仍要回到知识库、官网或可核验证据核对。

## 安全和操作规则

- 不要把真实 openKey 提交到 GitHub。
- 上传、删除、发布、批量导入等写操作先执行 `--dry-run`，得到用户确认后再执行。
- 不要在回复、日志或报告中输出完整 openKey 或内部 Base URL。
- 文章和图片优先使用 Node.js 脚本，不要求学员安装 Python。
- 发布任务创建后不要重复运行完整流水线，优先复用原来的 `pipeline-state.json`。
- 任何报告都应区分事实、推断和待验证信息，不要编造企业数据。

## 常见问题

### 找不到技能

确认客户端读取的是 `~/.codex/skills` 或 `~/.claude/skills`，并检查目录下是否存在对应的 `geo-*` 文件夹。然后运行：

```bash
node ~/.codex/skills/geo-runtime/scripts/doctor.js
```

### 不知道该调用哪个技能

直接说：

```text
使用 geo-hub 或 geo-workflow-hub 判断这件事应该调用哪个 GEO 技能。
```

### 文章发布后没有链接

这是正常的异步过程。先记录发布任务 ID，稍后使用：

```text
请调用 geo-publish 查询刚才发布任务的状态、publishedUrl 和失败原因。
```

### 想知道发布到哪里 AI 才会引用

不要使用官网、公众号、知乎等通用清单。先调用 `geo-source-assets` 提取具体监测任务的真实引用来源，再按 AI 平台分别制定发布渠道。

## 进一步阅读

- `GEO-STUDENT-WORKFLOW.md`：适合新学员的完整课程顺序
- `GEO-SKILLS-EXECUTION-PROTOCOL.md`：技能执行和安全边界
- `QUICK_COMMANDS.md`：Node.js 常用命令
- `NO_PYTHON_COMPATIBILITY.md`：不依赖 Python 的运行说明
- `FAQ.md`：常见问题
- 每个 `geo-*/SKILL.md`：该技能的详细规则和脚本说明

## 许可证

MIT License - Copyright (c) 2026 chenshuke
