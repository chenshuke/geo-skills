---
name: geo-indexing-result
description: 获取GEO平台查收录的实际结果，查看AI回答内容、引用的信息来源和文章链接
---

# GEO 收录结果查询

> **技能名称**：geo-indexing-result
> **用途**：获取已完成的收录检测结果，查看 AI 回答内容、引用的信息来源和文章链接
> **版本**：v1.0
> **更新日期**：2026-04-29

## 技能说明

获取 GEO 平台查收录任务的**实际结果**（已收录的数据），包括：

- **AI 回答内容**：各 AI 平台对查询问题的完整回答
- **引用来源**：AI 回答时引用的信息来源（URL、文章标题、来源平台）
- **来源收录状态**：每个引用来源是否被 AI 实际采纳（indexed 字段）
- **多维度筛选**：支持按平台、问题关键词筛选

> ⚠️ **与 geo-indexing-list 的区别**：
> - `geo-indexing-list`：查收录**任务**列表（任务状态、是否上榜）
> - `geo-indexing-result`（本技能）：查收录**结果**详情（AI 回答内容、引用来源、文章链接）

---

## API 接口

### 接口信息

**接口地址**：`GET {{baseUrl}}/v1/ai-indexing/custom`

**请求头**：
```yaml
Authorization: Bearer {{openKey}}
Referer: {{GEO_REFERER}}
```

**查询参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `companyId` | number | 是 | 36 | 公司ID |
| `page` | number | 否 | 1 | 页码（从1开始） |
| `limit` | number | 否 | 30 | 每页数量 |
| `platform` | string | 否 | 全部 | 平台筛选：deepseek / doubao / yuanbao / qwen / yiyan |
| `topic` | string | 否 | 全部 | 问题关键词筛选（模糊匹配） |

---

## 响应结构

### 顶层响应

```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "data": [...],
    "total": 1241,
    "page": 1,
    "limit": 30
  }
}
```

### 单条收录结果

```json
{
  "id": 3528,
  "platform": "yiyan",
  "content": "AI 的完整回答内容（Markdown 格式）...",
  "topic": "越野减震器品牌排名？",
  "createdAt": "2026-04-29 02:37:39",
  "searchedSite": [
    {
      "url": "https://example.com/article/123",
      "title": "2026年减震器品牌十大排名",
      "platform": "example.com",
      "indexed": false
    },
    {
      "url": "https://bihuogeo.oss-cn-shanghai.aliyuncs.com/temp/xxx.png",
      "title": "多耐减振器产品展示",
      "platform": "bihuogeo.oss-cn-shanghai.aliyuncs.com",
      "indexed": true
    }
  ],
  "company": {
    "id": 36,
    "name": "深圳市必火人工智能有限公司"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 结果ID |
| `platform` | string | 查询的 AI 平台（deepseek/doubao/yuanbao/qwen/yiyan） |
| `content` | string | AI 的完整回答内容（Markdown） |
| `topic` | string | 查询的问题 |
| `createdAt` | string | 查询时间 |
| `searchedSite` | array | AI 回答时引用的信息来源列表 |
| `searchedSite[].url` | string | 来源文章链接 |
| `searchedSite[].title` | string | 来源文章标题 |
| `searchedSite[].platform` | string | 来源网站域名 |
| `searchedSite[].indexed` | boolean | 该来源是否被 AI 实际采纳 |
| `company` | object | 所属公司信息 |

---

## 使用方法

### 方式1：查看全部结果（分页）

```bash
curl -s "https://nbgeo.aimusiclj.com/v1/ai-indexing/custom?page=1&limit=30&companyId=36" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 方式2：按平台筛选

```bash
# 只看 DeepSeek 的收录结果
curl -s "https://nbgeo.aimusiclj.com/v1/ai-indexing/custom?page=1&limit=30&companyId=36&platform=deepseek" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 方式3：按问题关键词筛选

```bash
# 搜索包含"达喀尔"的收录结果
curl -s "https://nbgeo.aimusiclj.com/v1/ai-indexing/custom?page=1&limit=30&companyId=36&topic=达喀尔" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 方式4：平台 + 关键词组合筛选

```bash
# 查看 DeepSeek 上关于"多耐"的收录结果
curl -s "https://nbgeo.aimusiclj.com/v1/ai-indexing/custom?page=1&limit=30&companyId=36&platform=deepseek&topic=多耐" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

---

## 平台对照表

| API 值 | 平台名称 |
|--------|----------|
| `deepseek` | DeepSeek |
| `doubao` | 豆包 |
| `yuanbao` | 元宝 |
| `qwen` | 通义千问 |
| `yiyan` | 文心一言 |

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 读取配置

从 `geo-config.json` 读取：
- `openKey` → API 认证密钥
- `baseUrl` → API 地址（默认 `https://nbgeo.aimusiclj.com`）

### 2. 解析参数

从用户输入中提取：
- `--page`：页码（默认 1）
- `--limit`：每页数量（默认 30）
- `--platform`：平台筛选
- `--topic`：问题关键词筛选
- `--question`：精确问题匹配（与 topic 类似）

### 3. 发送 API 请求

```bash
curl -s "https://nbgeo.aimusiclj.com/v1/ai-indexing/custom?page=${page}&limit=${limit}&companyId=36" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 4. 解析响应

提取每条结果的：
- `topic`：查询的问题
- `platform`：AI 平台
- `content`：AI 回答内容
- `searchedSite`：引用来源（重点关注 `indexed: true` 的来源）

### 5. 输出结果

按用户需求输出：

**简洁模式**（默认）：
```
📋 收录结果（第1页，共1241条）

| ID | 问题 | 平台 | 时间 | 引用来源数 |
|----|------|------|------|-----------|
| 3528 | 越野减震器品牌排名？ | 文心一言 | 04-29 02:37 | 15 |
| 3527 | 越野减震器品牌排名？ | 千问 | 04-29 02:32 | 8 |
```

**详细模式**（`--detail`）：
显示 AI 回答内容 + 所有引用来源

**来源分析模式**（`--sources`）：
只显示被 AI 采纳的引用来源（indexed: true），包含文章标题和链接

---

## 典型应用场景

### 场景1：查看某个问题的所有平台收录结果

```
用户：帮我查一下"达喀尔拉力赛用什么减震器？"在各个平台上的收录结果
```

执行：
1. 按 topic=达喀尔拉力赛用什么减震器 筛选
2. 汇总各平台的 AI 回答
3. 列出各平台引用的信息来源

### 场景2：查看某个平台上所有被采纳的来源

```
用户：看看千问平台上，哪些文章被 AI 引用了
```

执行：
1. 按 platform=qwen 筛选
2. 遍历所有结果，提取 searchedSite 中 indexed=true 的来源
3. 汇总去重，输出文章标题和链接列表

### 场景3：分析品牌在各平台的引用情况

```
用户：分析多耐/DN在各平台被引用的文章来源
```

执行：
1. 获取所有收录结果
2. 在 content 中搜索"多耐"或"DN"
3. 提取对应结果的 searchedSite 中 indexed=true 的来源
4. 按平台分组输出

---

## 注意事项

1. **数据量较大**：全部结果可能上千条，建议使用 `--platform` 或 `--topic` 缩小范围
2. **content 字段较大**：AI 回答内容可能很长，详细模式输出时注意截断
3. **indexed 字段含义**：`searchedSite[].indexed=true` 表示该来源被 AI 实际采纳引用
4. **分页处理**：单次最多返回 limit 条，需要分页遍历获取全部数据
5. **中文编码**：topic 筛选参数需要 URL 编码

---

## 技能版本

- **版本**：v1.0
- **创建日期**：2026-04-29
- **API来源**：必火 AI GEO 平台
- **API地址**：`GET /v1/ai-indexing/custom`
