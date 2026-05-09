# GEO 双入口技能说明书

更新时间：2026-05-09
版本：v3.1（开放优化版）

---

## 1. 总体结构

GEO 技能体系从 59 个子技能精简为 **11 个功能模块**（9 个核心 + 2 个子拆分），通过两个总入口访问。

### A. `geo-hub` — 平台操作入口
- 账号查询、文章上传、收录检测、发布管理、配置管理

### B. `geo-workflow-hub` — 运营工作流入口
- 品牌创建、知识库、关键词规划、内容创作、审核优化、报表分析

---

## 2. 功能模块

### geo-hub 侧（5 个模块）

| 模块 | 用途 |
|------|------|
| **① geo-config** | 平台认证、openKey 配置、默认公司/产品选择 |
| **② geo-account** | 查看账号列表、Dashboard、套餐、视频 |
| **③ geo-article** | 文章上传/创建/查看/审核/删除、图片上传、批量创作 |
| **④ geo-indexing** | 收录检测、任务管理、批量导入、发布状态 |
| **⑤ geo-publish** | 创建发布任务，多渠道分发 |

### geo-workflow-hub 侧（4 个模块 + 2 个子模块）

| 模块 | 用途 |
|------|------|
| **⑥ geo-brand** | 创建企业/产品/个人/获客品牌账号 |
| **⑦ geo-knowledge** | 知识库搭建、整理、补充清单 |
| **⑧ geo-content** | 内容总入口（已拆分为 production + audit 两个子模块） |
| **⑧a geo-content-production** | 关键词规划、标题创作、图片生成、封面生成 |
| **⑧b geo-content-audit** | 一致性审核、媒体就绪审核、AI检测、覆盖度检查、内容优化、合规榜单 |
| **⑨ geo-analysis** | 证据链分析、平台逆向、飞书同步、项目仪表盘 |
| **⑩ geo-content-archive** | 内容归档，按日期/AI平台/发布平台自动分类 |

---

## 3. 路由口诀

### 平台执行类
**查 / 传 / 删 / 配** → `/geo-hub`

### 运营交付类
**建 / 规 / 写 / 审 / 优** → `/geo-workflow-hub`

---

## 4. 推荐工作流

```
第1步：/geo-workflow-hub brand           → 创建品牌
第2步：/geo-workflow-hub knowledge      → 搭建知识库（建立标准目录结构）
第3步：/geo-workflow-hub content production → 关键词→标题→图片→创作
第4步：/geo-workflow-hub content audit     → 审核→覆盖度→优化
第5步：/geo-workflow-hub archive          → 文件归位整理
第6步：/geo-hub article                   → 上传到平台
第7步：/geo-hub indexing                  → 检测收录排名
第8步：/geo-workflow-hub analysis         → 证据链分析→策略优化
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
| `requirements.txt` | Python 依赖清单 |
| `shared/credentials.py` | 统一凭证管理模块 |

---

## 6. 外部依赖一览

| 依赖 | 必要性 | 用途 |
|------|--------|------|
| GEO 平台 openKey | ✅ 必需 | API 认证（config/account/article/indexing/publish） |
| Python 3.8+ | ✅ 必需 | 脚本运行环境 |
| requests / python-dotenv | ✅ 必需 | HTTP 请求和环境变量加载 |
| baseopensdk | ⬜ 可选 | 飞书多维表格同步 |
| Fangxin API Key | ⬜ 可选 | AI 图片生成 |
| puppeteer-core | ⬜ 可选 | HTML → PDF/PNG 转换 |
| Obsidian + Dataview | ⬜ 可选 | 项目仪表盘可视化 |
