---
name: geo-report
description: GEO报告与拓展统一技能，整合售后报告管理、售前诊断、关键词主题拓展（L1/L2/L3三级）以及必火GEO报价单制作四大能力，覆盖报告查询、诊断任务管理、主题深度拓展和商务报价全场景。
---

# GEO 报告与拓展

> **功能**：售后报告管理 + 售前诊断 + 主题拓展 + 报价单制作
> **配置来源**：`geo-config/geo-config.json`
> **Base URL**：https://nbgeo.aimusiclj.com
> **认证方式**：`Authorization: Bearer ${openKey}` + `Referer: https://geo.bihuoai.com/`

---

## 能力总览

| 子技能 | 核心功能 | 主要接口 |
|--------|---------|---------|
| **geo-report** | 售后报告查询、详情、生成 | GET/POST /v1/report |
| **geo-presale-report** | 售前诊断任务全流程管理 | /v1/pre-sale-report 系列 |
| **geo-topic-expand** | 关键词三级主题拓展（L1→L2→L3） | /v1/topic-expand 系列 |
| **bihuo-geo-quotation** | 必火GEO报价单PDF制作 | 本地HTML→PDF |

---

## 一、售后报告（geo-report）

提供报告列表查询、报告详情获取（含收录统计、竞争对手分析、情感分析）以及按需生成新报告的能力。

### API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| GET | /v1/report | 获取报告列表 | page, limit, companyId |
| GET | /v1/report/{id} | 获取报告详情 | id（路径参数） |
| POST | /v1/report/generate | 生成报告 | companyId, dateRange |

### 执行步骤

1. 读取认证配置，构建请求头
2. 发起API调用：
   - 查询列表：GET `/v1/report?page=&limit=&companyId=`
   - 查询详情：GET `/v1/report/{id}`
   - 生成报告：POST `/v1/report/generate`，Body 传入 companyId + dateRange
3. 处理响应：检查 code 是否为 200，解析 data
4. 生成报告后轮询：返回 processing 时间隔 5-10 秒查询，直到 completed

### 报告详情包含

- 收录统计（indexStats）：总收录数、增长率
- 竞争对手分析（competitorAnalysis）：竞品市场份额
- 情感分析（sentimentAnalysis）：正面/中性/负面比例

### 注意事项

- companyId 为必填参数
- dateRange 范围建议不超过 90 天
- 同一公司同一日期范围请勿重复提交

---

## 二、售前诊断（geo-presale-report）

为客户生成 GEO 诊断报告的完整流程，包括创建诊断任务、编辑搜索意图、管理收录任务、确认提交。

### API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| POST | /v1/pre-sale-report | 创建售前诊断任务 | companyName, keywords |
| GET | /v1/pre-sale-report | 获取任务列表 | page, limit, status |
| GET | /v1/pre-sale-report/{id} | 获取任务详情 | id |
| PATCH | /v1/pre-sale-report/{id}/topics | 更新搜索意图 | id, topics |
| PATCH | /v1/pre-sale-report/{id}/omit-indexing | 排除AI索引任务 | id, indexingIds |
| POST | /v1/pre-sale-report/{id}/add-indexing-tasks | 添加收录任务 | id, tasks |
| POST | /v1/pre-sale-report/{id}/delete-indexing-tasks | 删除收录任务 | id, indexingIds |
| POST | /v1/pre-sale-report/{id}/confirm | 确认任务 | id, mode（1=标准/2=增强） |

### 执行步骤

1. **创建诊断任务**：POST 传入公司名称和关键词列表
2. **查询任务状态**：轮询等待初始化完成
3. **查看并编辑搜索意图**：查看 topics 字段，按需 PATCH 更新
4. **管理收录任务**：排除不需要的收录 / 添加新收录 / 删除收录
5. **确认并提交**：确认无误后 POST confirm，选择模式 1 或 2
6. **查看最终结果**：再次查询详情获取完整诊断数据

### 注意事项

- 确认操作不可逆，确认前请检查所有配置
- 关键词数量建议不超过 20 个
- 创建接口非幂等，避免重复提交

---

## 三、主题拓展（geo-topic-expand）

对关键词进行 L1→L2→L3 三级多层级主题拓展，逐步细化发现更多相关搜索意图。

### API 接口

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| POST | /v1/topic-expand | 创建拓展任务 | keywords, companyId |
| GET | /v1/topic-expand | 获取拓展任务列表 | page, limit, status |
| GET | /v1/topic-expand/{id} | 获取任务详情 | id |
| PATCH | /v1/topic-expand/{id}/l1 | 更新L1阶段输出 | id, l1Result |
| POST | /v1/topic-expand/{id}/expand-l2 | 执行L2拓展 | id |
| POST | /v1/topic-expand/{id}/select-l2 | 选择L2并执行L3拓展 | id, selectedL2Ids |

### 执行步骤

1. **创建拓展任务**：POST 传入关键词列表和 companyId
2. **等待L1完成**：轮询直到状态变为 l1_completed
3. **编辑L1结果**：查看 l1Result，按需增删改（仅L1完成后、L2启动前可编辑）
4. **执行L2拓展**：POST expand-l2 触发深度拓展
5. **等待L2完成**：轮询直到状态变为 l2_completed
6. **选择L2并执行L3**：从 l2Result 中选择有价值的主题（建议3-10个），POST select-l2
7. **查看最终结果**：轮询等待 completed，获取完整三级结果

### 任务状态流转

`l1_processing` → `l1_completed` → `l2_processing` → `l2_completed` → `l3_processing` → `completed`

### 注意事项

- 必须按 L1→L2→L3 顺序执行，不可跳过阶段
- L1 结果仅在 L1 完成后、L2 启动前可编辑
- selectedL2Ids 建议选择 3-10 个主题
- 轮询间隔建议 5-10 秒

---

## 四、必火GEO报价单（bihuo-geo-quotation）

为必火GEO制作各类报价单PDF和服务清单。

### 可制作文档

| 文档 | 价格 | 模版文件 |
|------|------|---------|
| GEO代运营服务报价单 | ¥9,800 | `templates/geo_service_template.html` |
| GEO培训报名单 | ¥2,980 | `templates/geo_training_template.html` |
| 新媒体基建服务报价单 | ¥9,800 | `templates/geo_media_template.html` |
| 双方案融合报价单 | 综合价 | `templates/geo_combined_template.html` |
| 企业端全案服务清单 | 全案 | `templates/geo_fullcase_template.html` |

### 品牌规范

- **主色**：`#BC1F1A`（必火红）
- **页面宽度**：960px 固定
- **Logo**：`templates/logo.png`（转为 base64 内联）
- **字体**：PingFang SC / Microsoft YaHei / Noto Sans CJK SC

### 工作流程

1. 读取对应模版 HTML 文件
2. 用 edit 修改内容（价格、服务项、承诺文案、交付天数等）
3. 用 `html_to_pdf.js` 生成 PDF

### PDF 生成命令

```bash
cd ./bihuo-geo-quotation
node ./scripts/html_to_pdf.js <input.html> <output.pdf>
```

### HTML 统一结构

```
Header（红色渐变背景 + Logo + 标题 + 描述）
  ↓
承诺横幅 / 流程横幅（深色背景，关键指标）
  ↓
主体内容区（白色卡片，左侧红色STEP编号条）
  ↓
底部保障区（红色渐变背景，四格保障卡片）
  ↓
Footer（深色背景，品牌信息）
```

### 常见修改场景

| 需求 | 操作 |
|------|------|
| 修改价格 | 搜索价格数字，同步更新 Header 徽章和价格卡片 |
| 修改服务项数量 | 搜索对应数字，同步修改表格和横幅 |
| 修改承诺文案 | 搜索原文案，同步修改横幅和服务内容第1条 |
| 修改交付天数 | 搜索天数，同步修改横幅、保障卡片、服务描述 |

---

## 通用错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查必填参数是否缺失或格式是否正确 |
| 401 | 认证失败 | 检查 geo-config.json 中的 openKey |
| 404 | 资源不存在 | 确认ID正确 |
| 409 | 状态冲突 | 检查当前状态，避免重复操作 |
| 429 | 请求频率超限 | 等待后重试，建议间隔 1 秒以上 |
| 500 | 服务器内部错误 | 稍后重试，持续出现需联系平台运维 |

---

## 通用注意事项

- openKey 为敏感信息，务必通过 geo-config.json 统一管理
- 批量操作时注意控制请求频率，建议每次请求间隔 ≥ 200ms
- 异步任务建议使用轮询方式检查状态，间隔 5-10 秒

---

**版本**：v1.0
**更新时间**：2026-05-08
