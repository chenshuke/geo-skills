# GEO 双入口技能说明书

更新时间：2026-07-01
版本：v3.6（Claude Code / Codex 通用版）

---

## 1. 总体结构

GEO 技能体系以 **1 个运行时支撑技能 + 3 个总入口 + 19 个业务技能** 组织。所有 `geo-*` 文件夹应作为同级技能安装。

### 0. `geo-runtime` — 运行时与诊断
- 技能完整性检查、凭证读取、依赖诊断、API 连通性检查

### A. `geo-hub` — 平台操作入口
- 账号查询、文章上传、收录检测、发布管理、配置管理

### B. `geo-workflow-hub` — 运营工作流入口
- 品牌创建、知识库、关键词规划、内容创作、审核优化、报表分析

### C. `geo-student-workflow` — 课程一键入口
- 一句话选择三种模式：私教班快速闭环、大师班20问题上榜、持续运营飞轮

---

## 2. 功能模块

### geo-hub 侧（7 个模块）

| 模块 | 用途 |
|------|------|
| **① geo-config** | 平台认证、openKey 配置、默认公司/产品选择 |
| **② geo-account** | 查看账号列表、Dashboard、套餐、视频 |
| **③ geo-article** | 文章上传/创建/查看/审核/删除、图片上传、批量创作 |
| **④ geo-indexing** | 收录检测、任务管理、批量导入、发布状态 |
| **⑤ geo-publish** | 创建发布任务，多渠道分发 |
| **⑤a geo-media-submission** | 查询投稿媒体、筛选价格和条件、创建单篇/批量媒体投稿并回查 |
| **⑤b geo-knowledge-sync** | 本地知识库与 GEO 平台知识库双向上传、下载和备份 |

### geo-workflow-hub 侧（6 个模块 + 3 个内容子模块）

| 模块 | 用途 |
|------|------|
| **⑥ geo-brand** | 创建企业/产品/个人/获客品牌账号 |
| **⑦ geo-knowledge** | 知识库搭建、整理、补充清单 |
| **⑦a geo-keyword-pool** | 关键词池、P0-P3优先级、状态机和下一步动作 |
| **⑧ geo-content** | 内容总入口（已拆分为 production + audit 两个子模块） |
| **⑧a geo-content-production** | 关键词规划、标题创作、图片生成、封面生成 |
| **⑧b geo-content-audit** | 一致性审核、媒体就绪审核、AI检测、覆盖度检查、内容优化、合规榜单 |
| **⑧c geo-content-to-publish-pipeline** | 内容到发布总控：封面 OSS、文章上传、审核通过、账号查询、发布 dry-run、确认清单 |
| **⑧d geo-brand-action-plan** | 品牌落地方案：以原始监测数据为底座，输出用户问题、AI目标判断、证据、内容、平台、复测 |
| **⑨ geo-analysis** | 证据链分析、平台逆向、飞书同步、项目仪表盘 |
| **⑩ geo-source-assets** | 引用源资产库：从 searchedSites 沉淀我方/竞品/行业/媒体信源和补强建议 |
| **⑪ geo-content-archive** | 内容归档，按日期/AI平台/发布平台自动分类 |
| **⑫ geo-troubleshooter** | 故障排查：固定输出问题、原因、证据、下一步、人工确认 |
| **⑬ geo-skill-evolution** | 内部/助教技能自进化：客户/行业/学员问题沉淀、回归测试、发布验收 |

---


## 2.1 学员工作流顺序

为了降低新手理解成本，技能展示名称采用“序号 + 中文名称”，但技术技能名不变。

```text
00A geo-student-workflow 课程一键入口（三模式）
00 geo-runtime 环境诊断
01 geo-config 平台初始化
02 geo-account 账号资源检查
03 geo-brand 品牌定位（03A geo-brand-diagnosis 品牌AI诊断）
04 geo-knowledge 知识库搭建
04B geo-knowledge-sync 平台知识库上传/下载
04A geo-keyword-pool 关键词池/状态机
05A geo-content-production 内容生产
05B geo-content-audit 内容审核优化
06 geo-article 文章素材管理
07 geo-content-to-publish-pipeline 内容到发布流水线
08 geo-publish 发布与状态回查
08A geo-media-submission 媒体投稿
09 geo-indexing 收录检测
10 geo-source-assets 引用源资产库
11 geo-analysis 数据分析复盘
12 geo-content-archive 项目归档整理
90 geo-troubleshooter 故障排查
91 geo-skill-evolution 技能自进化（内部/助教）
```

`geo-student-workflow` 是课程/新手的一句话入口，负责三模式选择；`geo-hub` 是平台操作入口，`geo-workflow-hub` 是运营工作流入口。

## 3. 路由口诀

### 平台执行类
**查 / 传 / 删 / 配** → 使用 `geo-hub` 或具体 API 技能

### 运营交付类
**建 / 规 / 写 / 审 / 优** → 使用 `geo-workflow-hub` 或具体工作流技能

### 内容发布流水线
**从标题到发布 / 一条龙 / 上传并发布预览** → 使用 `geo-content-to-publish-pipeline`，真实发布前必须输出确认清单

---

## 3.1 默认执行协议（减少模型差异）

- **运行时**：默认 Node.js 18+，Python 仅为旧脚本兼容，不作为学员必需依赖。
- **写操作**：上传/删除/发布/批量导入必须先 dry-run/preview，真实执行后必须 GET/list 回查。
- **API 调用**：有专用 Node 脚本优先用专用脚本；没有专用脚本时用 `geo-runtime/scripts/api_request.js`；`curl` 仅作为低级调试。
- **中文上传**：文章统一用 `geo-article/scripts/upload_article.js`，避免 `curl -d`、PowerShell 单行 JSON 和手写转义。
- **图片封面**：统一走 GEO `/v1/text-to-img`，默认 `model=v2`，不使用本地 SVG fallback。

详见：`GEO-SKILLS-EXECUTION-PROTOCOL.md`；固定命令卡片见：`QUICK_COMMANDS.md`。

---

## 4. 推荐工作流

```text
课程推荐入口：先说“我是新学员，帮我选择合适模式并跑一个 GEO 项目”，由 `geo-student-workflow` 在快速闭环、20问题上榜、持续运营飞轮之间选择并陪跑。

第1步：使用 geo-brand 创建品牌
第2步：使用 geo-knowledge 搭建知识库（建立标准目录结构）
第2.1步：需要同步平台时，使用 geo-knowledge-sync 上传本地知识库或下载平台备份
第2.5步：使用 geo-keyword-pool 建立关键词池、分级并输出下一步动作
第3步：使用 geo-brand-action-plan 把诊断问题转成落地执行方案
第4步：使用 geo-content-production 完成标题、图片与内容创作
第5步：使用 geo-content-audit 审核、覆盖度检查与优化
第6步：使用 geo-content-to-publish-pipeline 完成封面 OSS、文章上传、审核通过、账号查询和发布 dry-run
第7步：用户确认后创建发布任务，并用 GET/list 回查确认
媒体投稿：需要付费媒体投放时，使用 geo-media-submission 查询平台、预览费用并在确认后投稿
第8步：使用 geo-content-archive 完成文件归位整理
第9步：使用 geo-indexing 导入深层用户问题、检测收录排名
第10步：使用 geo-source-assets 沉淀引用源资产库和信源补强动作
第11步：使用 geo-analysis 完成证据链分析与策略优化
异常处理：任何环节失败时使用 geo-troubleshooter 输出新手可执行的处理清单
持续进化：重复出现的新问题由助教/内部团队使用 geo-skill-evolution 沉淀为技能改进方案和回归测试
```

> **geo-workflow-hub 负责"想清楚并做出来"，geo-hub 负责"落到平台并看结果"。**

---

## 5. 配套文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目概览、安装说明、目录结构 |
| `QUICK_START.md` | 5 分钟快速上手指南 |
| `GEOSSARY.md` | GEO 术语表 |
| `FAQ.md` | 常见问题解答 |
| `CHANGELOG.md` | 版本变更日志 |
| `LICENSE` | MIT 开源许可证 |
| `NO_PYTHON_COMPATIBILITY.md` | 无 Python 默认运行说明 |
| `geo-runtime/scripts/credentials.js` | 无 Python 统一凭证管理模块 |

---

## 6. 外部依赖一览

| 依赖 | 必要性 | 用途 |
|------|--------|------|
| GEO 平台 openKey | ✅ 必需 | API 认证（config/account/article/indexing/publish） |
| Node.js 18+ | ✅ 必需 | 无 Python 默认脚本运行环境 |
| Python / requests / python-dotenv | ⬜ 旧版可选 | 仅维护旧 Python 兼容脚本时使用，学员默认不需要 |
| baseopensdk | ⬜ 可选 | 飞书多维表格同步 |
| GEO 平台文生图额度 | ✅ 按需 | 使用 `/v1/text-to-img` 生图，默认 model=v2 |
| puppeteer-core | ⬜ 可选 | HTML → PDF/PNG 转换 |
| Obsidian + Dataview | ⬜ 可选 | 项目仪表盘可视化 |
