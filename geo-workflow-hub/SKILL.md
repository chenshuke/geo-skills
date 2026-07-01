---
name: geo-workflow-hub
description: "GEO 运营工作流总入口技能。Use when the user says 我想做 GEO 但不知道步骤、从 0 到 1 做项目、我是新学员、从0跑一个GEO项目、一步一步带我做GEO、私教班、快速跑通GEO闭环、大师班、20个问题上榜、持续运营飞轮、品牌搭建、资料整理、关键词池、关键词状态机、先优化哪个关键词、每个关键词推进到哪一步、写文章、审核优化、归档分析、完整运营流程、线下课练习流程、引用源资产库、信源资产、AI引用来源沉淀、故障排查、失败原因、下一步怎么处理、技能自进化、把客户问题沉淀成技能. For platform API actions like upload/indexing/publish/config, route to geo-hub or concrete API skill."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.6.0"
  category: router
---

> **外部依赖**: 部分子技能需要 GEO 平台 openKey

# GEO工作流统一入口 (GEO Workflow Hub)

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

> **版本**：v3.4 | **更新日期**：2026-07-01
> **定位**：GEO完整运营工作流的中央控制台


## 🧭 学员顺序

当用户是完全新手、课程学员或说“从0跑项目/私教班/大师班/持续运营”时，先路由到 `geo-student-workflow` 选择三种模式；当用户已有明确目标时，再按这个顺序解释，不要一上来堆模块名：

```text
00 环境诊断 → 01 平台初始化 → 02 账号资源检查 → 03 品牌定位 → 04 知识库搭建
→ 04A 关键词池/状态机 → 05 内容生产/审核 → 06 文章素材管理 → 07 内容到发布流水线 → 08 发布状态回查
→ 09 收录检测 → 10 引用源资产库 → 11 数据分析复盘 → 12 项目归档
```

出问题随时用 `90 geo-troubleshooter`；重复问题或行业差异由助教/内部团队用 `91 geo-skill-evolution` 沉淀。

## 技能说明

`geo-workflow-hub` 是**GEO运营工作流**的统一入口，覆盖全流程：

```
品牌创建 → 知识库搭建 → 关键词池/状态机 → 标题创作 → 内容创作 → 内容审核 → 上传发布预览 → 内容归档 → 收录监测 → 引用源资产沉淀
```

---

## 快速开始

完全新手优先说：

```text
我是新学员，帮我从 0 跑一个 GEO 项目。
```

这类请求路由到 `geo-student-workflow`，先判断快速闭环、20问题上榜战役、持续运营飞轮三种模式，再逐步陪跑。

也可以直接对 Claude Code 或 Codex 说：

```text
使用 geo-workflow-hub，帮我规划一个完整 GEO 运营工作流。
```

系统会询问你想做什么，然后智能推荐相关模块。

---

## 📚 9 大功能模块

### ⑥ geo-brand — 品牌创建
> 创建企业品牌、产品品牌、个人品牌、获客内容账号

**适用场景**：新品牌入驻GEO平台、新产品线启动、个人IP打造

**推荐说法**：`使用 geo-brand 帮我创建品牌内容`

---

### ⑦ geo-knowledge — 知识库管理
> 创建知识库结构、整理散乱资料、生成补充清单

**适用场景**：新项目启动、资料整理、内容体系搭建

**推荐说法**：`使用 geo-knowledge 帮我搭建知识库`

---

### ⑦a geo-keyword-pool — 关键词池 / 状态机
> 批量导入问题，给关键词分 P0/P1/P2/P3，维护 planned/baseline_done/need_content/published/postpublish_monitoring/source_gap/stable/regression/blocked 状态，并输出下一步动作。

**适用场景**：学员不知道先优化哪个关键词，或不知道每个关键词推进到哪一步。

**推荐说法**：`使用 geo-keyword-pool 帮我创建关键词池并输出下一步动作`

---

### ⑧ geo-content — 内容全流程（总入口）
> 关键词规划 → 标题创作 → 图片生成 → 内容审核 → 覆盖分析 → 内容优化 → 上传发布预览

**本模块已拆分为两个子模块**：

| 子模块 | 覆盖范围 | 快速入口 |
|--------|---------|---------|
| **⑧a geo-content-production** | 关键词规划、标题创作、图片生成、封面生成 | `使用 geo-content-production ...` |
| **⑧b geo-content-audit** | 一致性审核、媒体就绪审核、AI检测、覆盖度检查、内容优化、合规榜单 | `使用 geo-content-audit ...` |
| **⑧c geo-content-to-publish-pipeline** | 封面 OSS、文章上传、文章审核、账号查询、发布 dry-run、确认清单 | `使用 geo-content-to-publish-pipeline ...` |

---

### ⑧c geo-content-to-publish-pipeline — 内容到发布总控流水线
> 关键词方案/标题方案/文章 → 审核 → 封面 OSS → 文章上传 → 审核通过 → 账号查询 → 发布 dry-run → 用户确认

**适用场景**：学员希望一步到位完成“内容创作到发布预览”，或跨多个 GEO 技能时需要统一编排、失败记录和可重试命令。

**推荐说法**：`使用 geo-content-to-publish-pipeline 帮我把这批文章上传并生成发布确认清单`

---

### ⑩ geo-content-archive — 内容归档
> 按创作日期 + AI平台 + 发布平台自动归类内容文件

**适用场景**：项目运营中内容文件散乱需要整理

**推荐说法**：`使用 geo-content-archive 帮我整理项目文件`

---

### ⑪ geo-source-assets — 引用源资产库
> 从 Scheduled Indexing answers 的 searchedSites 沉淀我方、竞品、行业、媒体信源资产，并输出补强建议

**适用场景**：学员要把 AI 引用来源资产化，判断哪些来源可控、可复用、需补强、是否稳定引用。

**推荐说法**：`使用 geo-source-assets 帮我从收录结果生成引用源资产库`

---

### ⑨ geo-analysis — 数据分析
> 证据链分析、AI平台逆向分析、飞书方案同步、项目仪表盘

**适用场景**：收录数据分析、平台引用机制研究、项目管理

**推荐说法**：`使用 geo-analysis 帮我分析收录和证据链`


---

### ⑫ geo-troubleshooter — 故障排查
> 把 openKey、公司产品、文章上传、发布、收录、引用源等失败场景诊断成“问题/原因/证据/下一步/人工确认”

**适用场景**：学员不知道哪里错了、任务失败、接口有数据但结果不符合预期、需要下一步处理建议。

**推荐说法**：`使用 geo-troubleshooter 帮我排查这次 GEO 流程哪里出问题了`


---

### ⑬ geo-skill-evolution — 技能自进化（内部/助教）
> 把不同行业、客户和学员遇到的新问题沉淀为技能改进方案、回归测试和发布验收清单

**适用场景**：客户行业差异明显、同类问题反复出现、修复 P0/P1 后需要固化回归测试；主要给助教/内部交付团队使用，不作为普通学员主入口。

**推荐说法**：`使用 geo-skill-evolution，把这次客户问题沉淀成技能改进方案`

---

## 🎯 智能路由

| 用户说 | 推荐模块 |
|--------|---------|
| "我是新学员" / "从0跑一个GEO项目" / "私教班快速闭环" / "大师班20个问题上榜" / "持续运营飞轮" | 00A geo-student-workflow |
| "创建品牌" / "企业入驻" | ⑥ geo-brand |
| "搭建知识库" / "整理资料" | ⑦ geo-knowledge |
| "关键词池" / "状态机" / "先优化哪个关键词" / "推进到哪一步" | ⑦a geo-keyword-pool |
| "规划关键词" / "生成标题" / "写内容" | ⑧a geo-content-production |
| "审核" / "覆盖度" / "优化内容" | ⑧b geo-content-audit |
| "归档内容" / "整理创作文件" | ⑩ geo-content-archive |
| "一条龙发布" / "上传并发布预览" / "从标题到发布" | ⑧c geo-content-to-publish-pipeline |
| "证据链" / "逆向分析" / "仪表盘" | ⑨ geo-analysis |
| "引用源资产库" / "信源资产" / "searchedSites" / "补强建议" | ⑪ geo-source-assets |
| "失败" / "报错" / "排查" / "下一步怎么办" / "人工处理" | ⑫ geo-troubleshooter |
| "技能自进化" / "沉淀成技能" / "客户问题复盘" / "生成回归测试" | ⑬ geo-skill-evolution |

---

## 🔄 配置引导（首次使用必须执行）

与 geo-hub 共享配置流程，自动执行：
1. 读取 `~/.geo-skills/credentials/geo-config.json` 获取 openKey
2. 检查并引导选择 companyId 和 productId

---

## 🚀 推荐工作流

```text
第1步：使用 geo-brand 创建品牌
第2步：使用 geo-knowledge 搭建知识库
第2.5步：使用 geo-keyword-pool 建立关键词池、分级和下一步动作
第3步：使用 geo-content-production 完成标题和内容创作
第4步：使用 geo-content-audit 审核、覆盖度检查和优化
第5步：使用 geo-content-to-publish-pipeline 生成封面、上传文章、审核通过并输出发布确认清单
第6步：用户确认后使用 geo-content-to-publish-pipeline / geo-publish 创建发布任务
第7步：使用 geo-content-archive 归档整理
第8步：使用 geo-indexing 检测收录排名
第9步：使用 geo-source-assets 沉淀引用源资产库和补强动作
第10步：使用 geo-analysis 做证据链和平台偏好复盘
遇到失败或结果不符合预期：随时使用 geo-troubleshooter 输出原因、证据和下一步
同类问题重复出现或行业差异明显：由助教/内部团队使用 geo-skill-evolution 沉淀为技能改进和回归测试
```

> **geo-workflow-hub 负责"想清楚并做出来"，geo-hub 负责"落到平台并看结果"。**

---

## 🔗 与 geo-hub 的区别

| 需求 | geo-workflow-hub | geo-hub |
|------|-----------------|---------|
| 创建品牌账号 | ✅ | ❌ |
| 规划关键词/标题 | ✅ | ❌ |
| 创作内容 | ✅ | ❌ |
| 审核内容 | ✅ | ❌ |
| 归档内容 | ✅ | ❌ |
| 上传并生成发布确认清单 | ✅ | ✅（通过 geo-article/geo-publish） |
| **上传文章到平台** | ❌ | ✅ |
| **查看文章/账号** | ❌ | ✅ |
| **检测收录排名** | ❌ | ✅ |
| 引用源资产沉淀与补强建议 | ✅ | ❌ |
| **管理配置** | ❌ | ✅ |
