---
name: geo-project-dashboard
description: GEO项目仪表盘管理技能，支持创建/更新项目仪表盘、全局管理视图、PDCA排名追踪，实现多项目全链路闭环监控
version: v1.0
date: 2026-04-29
---

# GEO 项目仪表盘管理（geo-project-dashboard）

> **技能名称**：geo-project-dashboard
> **用途**：为任意 GEO 项目创建/更新 Obsidian 原生仪表盘，支持全局管理视图和 PDCA 排名迭代追踪
> **版本**：v1.0
> **更新日期**：2026-04-29
> **归属入口**：`geo-workflow-hub` > 9. 数据分析

---

## 技能说明

该技能为 GEO 多项目管理提供**仪表盘自动化**能力。通过读取项目文件夹中的跟踪表、映射表、收录监测等数据源，自动生成 Obsidian DataviewJS 仪表盘，实现：

- **单项目仪表盘**：展示完整 GEO 链路（核心词→拓展词→用户问题→文章标题→内容创作→平台发布→AI收录）
- **全局管理视图**：跨项目对比，一目了然掌握所有项目的进度和收录表现
- **PDCA 排名追踪**：对比不同日期的收录数据，识别进步/退步问题，驱动内容迭代优化

### 全链路流水线（7 个环节）

```
核心关键词 → 拓展关键词 → 用户问题 → 文章标题 → 内容创作 → 平台发布 → AI 收录
```

### 项目成熟度分级

| 级别 | 条件 | 仪表盘内容 |
|------|------|-----------|
| **早期** | 无跟踪表 | 仅显示基础信息（品牌、知识库状态） |
| **中期** | 有跟踪表，无收录监测 | 流水线前5环节 + 树状视图（无收录） |
| **成熟** | 跟踪表 + 收录监测 | 全部7环节 + 树状视图 + AI平台率 + 断点分析 |

---

## 使用方法

### 1. 为项目创建仪表盘

```
/geo-project-dashboard --project 多耐 --action create
```

自动检测项目数据源，生成仪表盘到 `GEO多项目管理系统/项目_多耐减振GEO/仪表盘.md`。

### 2. 生成全局管理视图

```
/geo-project-dashboard --action global
```

扫描所有项目，生成跨项目对比视图到 `GEO多项目管理系统/GEO全局管理视图.md`。

### 3. 更新项目仪表盘

```
/geo-project-dashboard --project 多耐 --action update
```

当有新的收录监测报告或新文章创作后，重新检测数据源并更新仪表盘。

### 4. PDCA 排名对比追踪

```
/geo-project-dashboard --project 多耐 --action pdca
```

自动取最近两份收录监测报告进行对比，生成 PDCA 追踪报告。也可指定日期：

```
/geo-project-dashboard --project 多耐 --action pdca --date 20260506 --compare-date 20260429
```

---

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--project` | create/update/pdca 时必填 | - | 项目简称（多耐/海顿/贝易寿），也可用完整文件夹名 |
| `--action` | 是 | - | `create` / `global` / `update` / `pdca` |
| `--date` | 否 | 最新报告日期 | PDCA 对比的目标日期（YYYYMMDD） |
| `--compare-date` | 否 | 目标日期的前一份 | PDCA 对比的基准日期（YYYYMMDD） |

---

## 执行步骤

### Action: create（创建项目仪表盘）

1. **解析项目名称**
   - 将简称映射到完整路径：`多耐` → `项目_多耐减振GEO`，`海顿` → `项目_海顿集团GEO`，`贝易寿` → `项目_贝易寿GEO`
   - 如果传入的不是简称，在 `GEO多项目管理系统/` 下模糊匹配 `项目_*GEO/` 文件夹

2. **读取项目概览**
   - 读取 `00_项目概览.md`，提取品牌名称、项目目标、创建日期等元信息

3. **检测数据源**
   - 按 `references/data-source-mapping.md` 中的规则检测所有可用数据源
   - 确定项目成熟度级别（早期/中期/成熟）

4. **读取模板**
   - 读取 `templates/project-dashboard.js` 获取 DataviewJS 模板代码

5. **生成仪表盘**
   - 用检测到的数据源路径替换模板中的 `{{PLACEHOLDER}}` 占位符
   - 根据成熟度决定是否包含收录相关模块
   - 写入 `GEO多项目管理系统/项目_[品牌名]GEO/仪表盘.md`

6. **输出结果**
   - 告知用户仪表盘文件位置
   - 提示用户在 Obsidian 中打开查看

### Action: global（全局管理视图）

1. **扫描项目列表**
   - 列出 `GEO多项目管理系统/` 下所有 `项目_*GEO/` 文件夹

2. **逐项目采集指标**
   - 对每个项目：读取概览、统计内容文件数、检测跟踪表、检测收录监测
   - 提取关键指标：文章计划数、已创作数、收录率

3. **读取模板**
   - 读取 `templates/global-dashboard.js`

4. **生成全局视图**
   - 用所有项目的路径和数据生成全局仪表盘
   - 写入 `GEO多项目管理系统/GEO全局管理视图.md`

5. **输出摘要**
   - 展示各项目关键数据汇总

### Action: update（更新项目仪表盘）

1. **定位已有仪表盘**
   - 检查 `GEO多项目管理系统/项目_[品牌名]GEO/仪表盘.md` 是否存在

2. **重新检测数据源**
   - 特别关注：是否有新的收录监测报告（日期更晚的文件）
   - 统计内容文件是否有变化

3. **重新生成**
   - 使用 update action 与 create 相同的模板逻辑
   - 覆盖写入仪表盘文件

4. **提示变更**
   - 告知用户哪些数据发生了变化

### Action: pdca（PDCA 排名对比追踪）

1. **检测收录监测报告**
   - 列出 `05_排名监测/收录排名监测_*.md` 所有文件
   - 如果指定了 `--date` 和 `--compare-date`，使用对应文件
   - 否则自动选取最近两份

2. **读取模板**
   - 读取 `templates/pdca-tracker.js`

3. **解析两份报告**
   - 使用模板中的 `parseRanking()` 函数解析
   - 按用户问题建立对比映射

4. **生成 PDCA 报告**
   - 计算每个问题的变化（进步/退步/稳定/新增/消失）
   - 写入 `05_排名监测/PDCA追踪_[date1]vs[date2].md`

5. **输出行动建议**
   - 列出需要优化的退步问题
   - 列出可以复制的成功经验

---

## 数据源检测规则

详见 `references/data-source-mapping.md`。

核心检测逻辑：

```
项目路径/03_GEO方案/内容布局跟踪表.md          → 跟踪表（必有）
项目路径/03_GEO方案/*关键词映射表*.md          → 映射表（可选）
项目路径/05_排名监测/收录排名监测_YYYYMMDD.md  → 收录监测（可选，取最新）
项目路径/04_内容创作/**/*.md                    → 内容文件（vault 检测）
项目路径/06_发布记录/*.md                      → 发布记录（可选）
项目路径/00_项目概览.md                        → 项目概览（可选）
```

---

## 输出文件位置

| Action | 输出路径 |
|--------|---------|
| create | `GEO多项目管理系统/项目_[品牌名]GEO/仪表盘.md` |
| global | `GEO多项目管理系统/GEO全局管理视图.md` |
| update | `GEO多项目管理系统/项目_[品牌名]GEO/仪表盘.md`（覆盖） |
| pdca | `GEO多项目管理系统/项目_[品牌名]GEO/05_排名监测/PDCA追踪_[date1]vs[date2].md` |

---

## 项目简称映射

| 简称 | 完整文件夹名 | 品牌名称 |
|------|------------|---------|
| `多耐` | `项目_多耐减振GEO` | DN多耐 / 广州多耐减振科技 |
| `海顿` | `项目_海顿集团GEO` | 海顿壁挂炉 / 广东海顿供热 |
| `贝易寿` | `项目_贝易寿GEO` | 贝易寿 / 张三多 |

> 如果未来新增项目，自动扫描 `项目_*GEO/` 文件夹即可发现。

---

## 注意事项

1. **Dataview 插件依赖**：仪表盘使用 DataviewJS，需要用户已安装 Dataview 插件
2. **数据源路径**：所有路径使用 Obsidian vault 相对路径，不以 `/` 开头
3. **软链接同步**：技能文件通过 `.claude/skills/` 目录管理
4. **跨项目格式差异**：不同项目的跟踪表列格式可能不同，模板使用智能列检测
5. **优雅降级**：缺少可选数据源时，仪表盘仍然可用，只隐藏对应模块
6. **06_发布记录 为空是正常的**：当前所有项目的发布记录文件夹为空，仪表盘会显示"暂无数据"提示
7. **不要覆盖 geo-dashboard**：`geo-dashboard` 是 GEO 平台 API 技能，本技能名为 `geo-project-dashboard`

---

## 与其他技能的衔接

| 触发场景 | 上游技能 | 衔接动作 |
|---------|---------|---------|
| 批量创作完成后 | `geo-batch-create` | → `/geo-project-dashboard --project X --action update` |
| 收录监测完成后 | `geo-indexing-check` | → `/geo-project-dashboard --project X --action update` |
| 批量导入收录后 | `geo-indexing-batch-import` | → `/geo-project-dashboard --project X --action update` |
| 周度/月度复盘 | 手动触发 | → `/geo-project-dashboard --project X --action pdca` |
| 管理层汇报 | 手动触发 | → `/geo-project-dashboard --action global` |
| 新项目创建完成后 | `create-kb` + `geo-keyword-plan` | → `/geo-project-dashboard --project X --action create` |

---

## 相关技能

- **geo-dashboard** — GEO 平台 API 数据总览（周统计）
- **geo-indexing-check** — 收录检测（产出收录监测报告，供仪表盘读取）
- **geo-indexing-batch-import** — 批量导入收录任务
- **geo-rank-content** — 查看内容排名
- **geo-batch-create** — 批量创作内容（完成后更新仪表盘）
- **create-kb** — 创建知识库项目

---

## 技能版本

- **版本**：v1.0
- **创建日期**：2026-04-29
- **模板文件**：`templates/project-dashboard.js`、`templates/global-dashboard.js`、`templates/pdca-tracker.js`
- **参考文件**：`references/data-source-mapping.md`
