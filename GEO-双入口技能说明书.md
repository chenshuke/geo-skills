# GEO 双入口技能说明书

更新时间：2026-05-08
版本：v3.0（模块化合并版）

---

## 1. 总体结构

GEO 技能体系从 59 个子技能精简为 **10 个功能模块**，通过两个总入口访问。

### A. `geo-hub` — 平台操作入口
- 账号查询、文章上传、收录检测、发布管理、配置管理

### B. `geo-workflow-hub` — 运营工作流入口
- 品牌创建、知识库、关键词规划、内容创作、审核优化、报表分析

---

## 2. 10 大功能模块

### geo-hub 侧（5 个模块）

| 模块 | 用途 |
|------|------|
| **① geo-config** | 平台认证、openKey 配置、默认公司/产品选择 |
| **② geo-account** | 查看账号列表、Dashboard、套餐、视频 |
| **③ geo-article** | 文章上传/创建/查看/审核/删除、图片上传、批量创作 |
| **④ geo-indexing** | 收录检测、任务管理、批量导入、发布状态 |
| **⑤ geo-publish** | 创建发布任务，多渠道分发 |

### geo-workflow-hub 侧（5 个模块）

| 模块 | 用途 |
|------|------|
| **⑥ geo-brand** | 创建企业/产品/个人/获客品牌账号 |
| **⑦ geo-knowledge** | 知识库搭建、整理、DOCX 提取、补充清单 |
| **⑧ geo-content** | 关键词→标题→图片→创作→审核→优化（最大模块，15 个子能力） |
| **⑨ geo-report** | 售后报告、售前诊断、主题拓展、报价单生成 |
| **⑩ geo-analysis** | 证据链分析、平台逆向、飞书同步、项目仪表盘 |

---

## 3. 路由口诀

### 平台执行类
**查 / 传 / 删 / 配** → `/geo-hub`

### 运营交付类
**建 / 规 / 写 / 审 / 优 / 报** → `/geo-workflow-hub`

---

## 4. 推荐工作流

```
第1步：/geo-workflow-hub brand     → 创建品牌
第2步：/geo-workflow-hub knowledge  → 搭建知识库
第3步：/geo-workflow-hub content    → 关键词→标题→创作→审核
第4步：/geo-hub article            → 上传到平台
第5步：/geo-hub indexing           → 检测收录排名
第6步：/geo-workflow-hub report     → 查看报表
```

> **geo-workflow-hub 负责"想清楚并做出来"，geo-hub 负责"落到平台并看结果"。**
