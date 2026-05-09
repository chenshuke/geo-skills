---
name: geo-indexing-batch-import
description: 批量导入关键词到GEO平台收录检测任务，支持多平台监测
---

# 批量导入收录检测任务

> **技能名称**：geo-indexing-batch-import
> **用途**：批量添加关键词到GEO平台收录检测任务，自动为每个关键词配置多平台监测
> **作者**：GEO执行助理
> **版本**：v1.0
> **更新日期**：2026-04-16

## 技能说明

通过必火GEO平台API批量导入关键词到收录检测任务，功能包括：
- 批量添加关键词（自动添加公司名称后缀）
- 配置多个AI平台监测（豆包、元宝、DeepSeek、千问、文心一言等）
- 自动处理关键词格式：`关键词[公司名称]`
- 支持任意数量的关键词批量导入

## 使用方法

### 方式1：基本批量导入
```
/skill geo-indexing-batch-import --keywords="壁挂炉推荐,燃气壁挂炉推荐" --company="海顿"
```

### 方式2：从文本文件导入
```
/skill geo-indexing-batch-import --file="keywords.txt" --company="海顿"
```

### 方式3：指定监测平台
```
/skill geo-indexing-batch-import --keywords="壁挂炉推荐" --company="海顿" --platforms="豆包,deepseek,千问"
```

### 方式4：从飞书关键词库导入
```
/skill geo-indexing-batch-import --source="feishu" --company="海顿" --priority="P0"
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--keywords` | 关键词列表（逗号分隔） | 否* | - |
| `--file` | 关键词文本文件路径 | 否* | - |
| `--company` | 公司名称（必须提供） | 是 | - |
| `--companyId` | 公司ID（可选） | 否 | 从API获取 |
| `--platforms` | 监测平台（逗号分隔） | 否 | 豆包,元宝,deepseek,千问,文心一言 |
| `--source` | 数据来源（feishu/manual） | 否 | manual |
| `--priority` | 优先级过滤（P0/P1/P2/ALL） | 否 | ALL |

*`--keywords` 和 `--file` 二选一，或使用 `--source=feishu`

---

## 配置

### 环境变量配置

所有认证信息和API地址从 `.env` 文件读取：

```bash
# GEO 平台 API 密钥
GEO_OPEN_KEY=your_geo_open_key_here

# GEO 平台 API 地址
GEO_BASE_URL=https://nbgeo.aimusiclj.com

# GEO 平台请求来源标识
GEO_REFERER=https://geo.bihuoai.com/
```

### 支持的监测平台

| 中文名 | API值 | 说明 |
|--------|-------|------|
| 豆包 | `doubao` | 字节跳动AI助手 |
| 元宝 | `yuanbao` | 腾讯元宝 |
| DeepSeek | `deepseek` | DeepSeek AI |
| 千问 | `qwen` | 通义千问 |
| 文心一言 | `yiyan` | 百度文心一言 |
| Kimi | `kimi` | 月之暗面Kimi |
| 智谱 | `zhipu` | 智谱AI |
| ChatGPT | `chatgpt` | OpenAI ChatGPT |
| Gemini | `gemini` | Google Gemini |

---

## API接口

### 接口信息

**接口地址**：`POST {{baseUrl}}/v1/ai-indexing-task/custom/import`

**请求头**：
```yaml
Content-Type: application/json
Authorization: Bearer {{GEO_OPEN_KEY}}
Referer: {{GEO_REFERER}}
```

**请求体**：
```json
{
  "companyId": 36,
  "platforms": ["doubao", "yuanbao", "deepseek", "qwen", "yiyan"],
  "data": "壁挂炉推荐[海顿]\n燃气壁挂炉推荐[海顿|必火]\n冷凝壁挂炉推荐[海顿]"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `companyId` | number | 是 | 公司ID（从GEO平台获取） |
| `platforms` | array | 是 | 平台数组（使用API值，如`["doubao", "deepseek"]`） |
| `data` | string | 是 | 关键词文本，每行一个，格式见下方 |

### ⭐ data 字段格式规范

每行一个关键词查询任务，格式为：`关键词[品牌1|品牌2|...]`

**单个目标品牌**：
```
壁挂炉推荐[海顿]
```

**多个目标品牌**（用 `|` 分隔）：
```
改装减震器品牌推荐？[多耐|DN]
```

**格式要点**：
- 关键词与方括号之间**不加空格**
- 多个品牌名之间用 `|` 分隔，品牌名前后不加空格
- 每行一个查询任务，以换行符 `\n` 分隔

### 响应示例

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success"
}
```

**失败响应**：
```json
{
  "statusCode": 400,
  "message": "请求参数错误"
}
```

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 读取配置

- 从 `.env` 文件读取 `GEO_BASE_URL`、`GEO_OPEN_KEY`、`GEO_REFERER`
- 确认 `GEO_OPEN_KEY` 已配置

### 2. 获取关键词

**情况A：直接提供关键词**
- 使用 `--keywords` 参数，逗号分隔
- 示例：`壁挂炉推荐,燃气壁挂炉推荐,冷凝壁挂炉推荐`

**情况B：从文件读取**
- 读取文本文件，每行一个关键词
- 自动去除空行和首尾空格

**情况C：从飞书导入**
- 读取飞书关键词库&排名监测表
- 根据 `--priority` 过滤关键词
- 读取关键词名称字段

### 3. 格式化关键词

**⚠️ 重要：关键词格式**

每个关键词必须加上品牌名称后缀，格式为：`关键词[品牌名]` 或 `关键词[品牌1|品牌2]`

**单个目标品牌**：
```
壁挂炉推荐[海顿]
```

**多个目标品牌**（用 `|` 分隔，一次查询多个品牌）：
```
改装减震器品牌推荐？[多耐|DN]
```

**格式要点**：
- 关键词与方括号之间不加空格
- 多个品牌名用 `|` 分隔，品牌名前后不加空格
- 当需要同时查询多个品牌名（如简称+全称）时，合并为一行，避免重复任务

批量处理：
```python
# 单品牌
formatted_keywords = [f"{keyword}[{brand}]" for keyword in keywords]
# 多品牌合并
formatted_keywords = [f"{keyword}[{brand1}|{brand2}]" for keyword in keywords]
```

### 4. 获取公司ID

**方法1：从API获取**（推荐）
```bash
curl -X GET "${GEO_BASE_URL}/v1/geo-company" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}"
```

从响应中提取 `company.id`

**方法2：使用默认值**
- 如果API获取失败，使用 `companyId=36`（海顿）

### 5. 构建请求数据

```json
{
  "companyId": 36,
  "platforms": ["doubao", "yuanbao", "deepseek", "qwen", "yiyan"],
  "data": "关键词1[公司]\n关键词2[公司]\n关键词3[公司]"
}
```

**注意事项**：
- `platforms` 使用API值（如 `doubao`），不是中文名
- `data` 是换行符分隔的字符串
- 每个关键词必须包含 `[公司名称]` 后缀

### 6. 发送API请求

```bash
curl -X POST "${GEO_BASE_URL}/v1/ai-indexing-task/custom/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}" \
  -d '{
    "companyId": 36,
    "platforms": ["doubao", "yuanbao", "deepseek", "qwen", "yiyan"],
    "data": "壁挂炉推荐[海顿]\n燃气壁挂炉推荐[海顿]"
  }'
```

### 7. 处理响应结果

**成功**：
- `statusCode == 0` 或 `code == 0`
- 显示导入成功消息
- 统计导入数量

**失败**：
- 检查错误消息
- 常见错误：
  - `"请求参数错误"` → 检查关键词格式是否包含 `[公司名]`
  - `"data should not be empty"` → 关键词列表为空
  - `"companyId must be a number"` → 公司ID格式错误
  - `"each value in platforms must be a valid enum value"` → 平台值不正确

---

## 输出结果

### 导入成功
```
✅ 批量导入完成！

📊 导入统计:
   总关键词数: 21
   监测平台: 豆包, 元宝, DeepSeek, 千问, 文心一言
   公司: 海顿 (ID: 36)

📋 导入的关键词:
   ✓ 壁挂炉推荐[海顿]
   ✓ 燃气壁挂炉推荐[海顿]
   ✓ 冷凝壁挂炉推荐[海顿]
   ... (共21个)

⏱️ 总耗时: 2.3秒
```

### 从文件导入成功
```
✅ 从文件批量导入完成！

📁 文件: keywords.txt
📊 导入统计:
   读取: 25行
   有效: 21个
   空行: 4个（已跳过）

🎯 公司: 海顿
🌐 平台: 豆包, 元宝, DeepSeek, 千问, 文心一言

✓ 已成功添加21个关键词到收录检测任务
```

---

## 使用示例

### 示例1：基本批量导入
```bash
/skill geo-indexing-batch-import \
  --keywords="壁挂炉推荐,燃气壁挂炉推荐,冷凝壁挂炉推荐" \
  --company="海顿"
```

### 示例2：从文件导入
```bash
/skill geo-indexing-batch-import \
  --file="keywords.txt" \
  --company="海顿"
```

**keywords.txt 内容**：
```
壁挂炉推荐
燃气壁挂炉推荐
冷凝壁挂炉推荐
壁挂炉安装推荐
...
```

### 示例3：指定部分平台
```bash
/skill geo-indexing-batch-import \
  --keywords="壁挂炉推荐" \
  --company="海顿" \
  --platforms="豆包,deepseek"
```

### 示例4：从飞书导入P0关键词
```bash
/skill geo-indexing-batch-import \
  --source="feishu" \
  --company="海顿" \
  --priority="P0"
```

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 请求参数错误 | 关键词格式不正确 | 确保每个关键词都包含 `[公司名称]` 后缀 |
| data should not be empty | 关键词列表为空 | 检查 `--keywords` 或 `--file` 参数 |
| companyId must be a number | 公司ID格式错误 | 使用数字类型的公司ID |
| platforms 枚举值错误 | 平台值不正确 | 使用API值（如 `doubao`），不是中文名 |
| 无权限访问 | 使用了无权限的公司ID | 获取当前用户有权限的公司列表 |

---

## 注意事项

1. **关键词格式**：⚠️ **每个关键词必须加上 `[品牌名]` 后缀，多品牌用 `|` 分隔**
   - ✅ 正确（单品牌）：`壁挂炉推荐[海顿]`
   - ✅ 正确（多品牌）：`改装减震器品牌推荐？[多耐|DN]`
   - ❌ 错误：`壁挂炉推荐`（缺少品牌后缀）
   - ❌ 错误：`壁挂炉推荐 [海顿]`（方括号前有空格）

2. **平台值**：使用API值，不是中文名
   - ✅ 正确：`["doubao", "deepseek"]`
   - ❌ 错误：`["豆包", "DeepSeek"]`

3. **Referer请求头**：必须包含 `Referer: https://geo.bihuoai.com/`

4. **批量限制**：单次建议不超过500个关键词

5. **公司权限**：确保使用的公司ID当前用户有权限

---

## 技能版本

- **版本**：v1.0
- **创建日期**：2026-04-16
- **最后更新**：2026-04-16
- **API来源**：必火AI GEO平台
- **关键发现**：关键词必须包含 `[公司名称]` 后缀才能成功导入

---

## 最佳实践

1. **准备关键词列表**
   - 创建文本文件，每行一个关键词
   - 去除重复和空行

2. **确认公司名称**
   - 从GEO平台后台获取准确的公司名称
   - 或使用API获取公司列表

3. **选择监测平台**
   - 根据业务需求选择相关平台
   - 建议：豆包、DeepSeek、千问（覆盖面广）

4. **分批导入**
   - 大量关键词分批导入（每批100-200个）
   - 避免单次请求过大

5. **验证结果**
   - 导入后登录GEO平台查看任务列表
   - 确认关键词和平台都正确
