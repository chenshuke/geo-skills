---
name: geo-indexing-check
description: 导入查收录任务到自研GEO平台，支持多平台AI收录查询（DeepSeek、豆包、元宝、通义千问、文心一言、Kimi、智谱、ChatGPT、Gemini）
---

# GEO查收录任务导入

> **技能名称**：geo-indexing-check
> **用途**：导入查收录任务到自研GEO平台
> **API地址**：https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom/import
> **作者**：GEO执行助理

---

## 技能说明

将查收录任务导入到自研GEO平台，系统会自动在指定的AI平台上查询品牌词的收录情况。

**支持的平台**：
- deepseek - DeepSeek
- doubao - 豆包
- yuanbao - 元宝
- qwen - 通义千问
- yiyan - 文心一言
- kimi - Kimi
- zhipu - 智谱
- chatgpt - ChatGPT
- gemini - Gemini

---

## 使用方法

### 方式1：单个品牌词查询
```
/skill geo-indexing-check --data="燃气壁挂炉推荐[海顿]" --platforms="deepseek,doubao,yuanbao" --company-id=36
```

### 方式2：多个品牌词查询（推荐）
多个品牌词用 `|` 分隔，放在同一个 `[]` 内：
```
/skill geo-indexing-check --data="减震器品牌推荐[多耐|DN]" --platforms="deepseek" --company-id=36
```

### 方式3：全平台查询
```
/skill geo-indexing-check --data="AI数字人工具推荐[必火AI]" --platforms="all" --company-id=36
```

### 方式4：批量查询（多个问题）

多个不同的问题需要逐个提交（每个问题一次API调用）。但多个品牌词可以合并：

✅ **正确方式**（推荐，多品牌词合并）：
```
/skill geo-indexing-check --data="减震器推荐[多耐|DN]" --platforms="..." --company-id=36
```

⚠️ **注意**：多个不同的问题仍需逐个提交，不可用 `|` 分隔问题本身：
```
# ❌ 错误 — 这是多个问题，不是多品牌词
/skill geo-indexing-check --data="问题1[品牌]|问题2[品牌]" --platforms="..." --company-id=36

# ✅ 正确 — 逐个提交每个问题
/skill geo-indexing-check --data="问题1[多耐|DN]" --platforms="..." --company-id=36
/skill geo-indexing-check --data="问题2[多耐|DN]" --platforms="..." --company-id=36
```

✅ **正确方式**：使用脚本逐个提交多个问题（见下方批量提交方法）

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--data` | 查询问题，格式：`问题[品牌词]`。多个品牌词用 `|` 分隔，如 `问题[品牌1|品牌2]` | 是 | - |
| `--platforms` | 查询平台，多个平台用逗号分隔，或使用 `all` 查询全部 | 是 | - |
| `--company-id` | 公司ID | 是 | - |

### 参数值说明

**平台列表**：
| 值 | 平台名称 |
|---|---|
| deepseek | DeepSeek |
| doubao | 豆包 |
| yuanbao | 元宝 |
| qwen | 通义千问 |
| yiyan | 文心一言 |
| kimi | Kimi |
| zhipu | 智谱 |
| chatgpt | ChatGPT |
| gemini | Gemini |
| all | 全部平台 |

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 解析参数
从用户输入中提取：
- `data`: 查询问题（支持单个或多个，用 `|` 分隔）
- `platforms`: 平台列表（如果是 `all`，则使用全部平台）
- `company-id`: 公司ID

### 2. 参数验证
- 检查 `data` 格式是否包含 `[品牌词]`
- 验证 `platforms` 是否为有效平台名称
- 确认 `company-id` 为有效数字
- ⚠️ **认证验证**：从 geo-config.json 配置文件读取 openKey

### 3. 构造API请求

**API地址**：`https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom/import`

**请求方法**：POST

**请求头**：
```json
{
  "Authorization": "Bearer ${openKey}",
  "Content-Type": "application/json"
}
```
> ⚠️ 从 geo-config.json 配置文件读取 openKey

**请求体格式**：
```json
{
  "data": "燃气壁挂炉推荐[海顿]",
  "platforms": ["deepseek", "doubao", "yuanbao", "qwen", "yiyan"],
  "companyId": 36
}
```

**多品牌词格式**（推荐，一次提交同时查多个品牌词）：
```json
{
  "data": "减震器品牌推荐[多耐|DN]",
  "platforms": ["deepseek", "doubao"],
  "companyId": 36
}
```

### 4. 处理批量查询

**品牌词合并**：如果需要同时查询多个品牌词，使用 `[品牌1|品牌2]` 格式，一次提交即可覆盖所有品牌词，无需逐个提交。

如果需要批量提交多个不同的问题，请使用以下脚本方法：

```bash
#!/bin/bash
keywords=(
"问题1"
"问题2"
"问题3"
# ... 更多问题
)
brand="多耐|DN"  # 多品牌词用 | 分隔

for keyword in "${keywords[@]}"; do
  curl -s -X POST "https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom/import" \
    -H "Authorization: Bearer ${openKey}" \
    -H "Referer: https://geo.bihuoai.com/" \
    -H "Content-Type: application/json" \
    -d "{\"data\": \"$keyword[$brand]\", \"platforms\": [...], \"companyId\": 36}"
  sleep 0.3  # 避免请求过快
done
```

**单个请求格式**：
```json
{"data": "燃气壁挂炉推荐[海顿]", "platforms": [...], "companyId": 36}
```

**多品牌词请求格式**（推荐）：
```json
{"data": "减震器品牌推荐[多耐|DN]", "platforms": [...], "companyId": 36}
```

### 5. 执行API调用
使用 Bash 工具执行 curl 命令：

```bash
# 从 geo-config.json 读取 openKey
curl -X POST "https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom/import" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "燃气壁挂炉推荐[海顿]",
    "platforms": ["deepseek", "doubao", "yuanbao", "qwen", "yiyan", "kimi", "zhipu", "chatgpt", "gemini"],
    "companyId": 36
  }'
```

### 6. 处理响应结果

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success"
}
```

**错误处理**：
- 如果 `statusCode != 0`，显示错误信息
- 如果请求失败，显示网络错误详情

### 7. 输出结果
向用户报告：
- ✅ 任务创建成功
- 📋 查询问题列表
- 🌐 查询平台列表
- 🔗 任务ID（如有）

---

## 示例

### 示例1：单个问题，指定平台

**输入**：
```
/skill geo-indexing-check --data="燃气壁挂炉推荐[海顿]" --platforms="deepseek,doubao,yuanbao" --company-id=36
```

**输出**：
```
✅ 查收录任务创建成功！

📋 查询问题：燃气壁挂炉推荐[海顿]
🌐 查询平台：DeepSeek、豆包、元宝
🏢 公司ID：36

📝 任务详情：
- 问题：燃气壁挂炉推荐
- 品牌词：海顿
- 平台数量：3个

🔍 系统正在查询中，请稍后在平台查看结果...
```

---

### 示例2：全平台查询

**输入**：
```
/skill geo-indexing-check --data="AI数字人工具推荐[必火AI]" --platforms="all" --company-id=36
```

**输出**：
```
✅ 查收录任务创建成功！

📋 查询问题：AI数字人工具推荐[必火AI]
🌐 查询平台：全部9个平台（DeepSeek、豆包、元宝、通义千问、文心一言、Kimi、智谱、ChatGPT、Gemini）
🏢 公司ID：36

📝 任务详情：
- 问题：AI数字人工具推荐
- 品牌词：必火AI
- 平台数量：9个

🔍 系统正在查询中，请稍后在平台查看结果...
```

---

### 示例3：批量查询

**输入**：
```
/skill geo-indexing-check --data="燃气壁挂炉推荐[海顿]|壁挂炉哪个牌子好[海顿]|海顿壁挂炉怎么样" --platforms="deepseek,doubao" --company-id=36
```

**输出**：
```
✅ 批量查收录任务创建成功！

📋 查询问题：3个
1. 燃气壁挂炉推荐[海顿]
2. 壁挂炉哪个牌子好[海顿]
3. 海顿壁挂炉怎么样[海顿]

🌐 查询平台：DeepSeek、豆包
🏢 公司ID：36

📝 任务详情：
- 问题数量：3个
- 品牌词：海顿
- 平台数量：2个
- 总任务数：6个

🔍 系统正在查询中，请稍后在平台查看结果...
```

---

## 注意事项

1. **品牌词格式**：data参数必须包含 `[品牌词]`，格式为 `问题[品牌词]`。多个品牌词使用 `|` 分隔，如 `问题[品牌1|品牌2]`（推荐，一次提交覆盖多个品牌词）
2. **平台名称**：使用小写平台名称，用逗号分隔
3. **Token有效期**：Bearer Token可能过期，如失败请检查Token是否有效
4. **批量提交**：多个不同的问题需要逐个提交或使用脚本循环。但多个品牌词可以合并为 `[品牌1|品牌2]` 格式，一次提交即可
5. **请求频率**：批量提交时建议每次请求间隔0.3秒，避免请求过快被限流

### 批量提交正确方法

**方法A：使用Bash脚本**
```bash
#!/bin/bash
keywords=("问题1" "问题2" "问题3" ...)
brand="多耐|DN"  # 多品牌词用 | 分隔
for keyword in "${keywords[@]}"; do
  curl -s -X POST "https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom/import" \
    -H "Authorization: Bearer ${openKey}" \
    -H "Referer: https://geo.bihuoai.com/" \
    -H "Content-Type: application/json" \
    -d "{\"data\": \"$keyword[$brand]\", \"platforms\": [...], \"companyId\": 36}"
  sleep 0.3
done
```

**方法B：逐个调用API**
```bash
# 单个提交
# 从 geo-config.json 读取 openKey
curl -X POST "..." -H "Authorization: Bearer ${openKey}" -H "Referer: https://geo.bihuoai.com/" -d '{"data": "问题1[多耐|DN]", ...}'
curl -X POST "..." -H "Authorization: Bearer ${openKey}" -H "Referer: https://geo.bihuoai.com/" -d '{"data": "问题2[多耐|DN]", ...}'
# ... 依次提交
```

**方法C：Windows PowerShell批量提交（推荐）**
```powershell
# 从 geo-config.json 读取 openKey
$openKey = (Get-Content "D:\python\GEO\GEO多项目管理系统\.claude\geo-config.json" | ConvertFrom-Json).openKey

$keywords = @("问题1", "问题2", "问题3")
$brand = "多耐|DN"  # 多品牌词用 | 分隔
$companyId = 36
$platforms = @("doubao", "yuanbao", "deepseek", "qwen", "yiyan")

$success = 0; $fail = 0
foreach ($kw in $keywords) {
    # ⚠️ 必须用 -Compress，否则多行JSON会导致API解析失败
    $body = @{data="${kw}[$brand]"; platforms=$platforms; companyId=$companyId} | ConvertTo-Json -Compress
    try {
        $r = Invoke-WebRequest -Uri "https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom/import" `
            -Method POST `
            -Headers @{"Authorization"="Bearer $openKey"; "Content-Type"="application/json"; "Referer"="https://geo.bihuoai.com/"} `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) `
            -ErrorAction Stop
        $j = $r.Content | ConvertFrom-Json
        if ($j.statusCode -eq 0) { $success++; Write-Output "OK | $kw" }
        else { $fail++; Write-Output "ERR | $kw | $($j.message)" }
    } catch { $fail++; Write-Output "FAIL | $kw | $_" }
    Start-Sleep -Milliseconds 300
}
Write-Output "`nDONE: OK=$success FAIL=$fail"
```

**PowerShell关键踩坑点**：
| 踩坑 | 说明 | 解决 |
|------|------|------|
| ❌ 不加 `-Compress` | `ConvertTo-Json` 默认输出多行格式化JSON，UTF-8编码后API解析失败 | ✅ 加 `-Compress` |
| ❌ 直接传字符串Body | 中文会变成乱码 | ✅ 用 `[System.Text.Encoding]::UTF8.GetBytes($body)` |

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能版本

- **版本**：v1.4
- **创建日期**：2025-03-11
- **API版本**：v1
- **最后更新**：2026-04-28
- **更新内容**：
  - v1.4 (2026-04-28): 支持多品牌词格式 `[品牌1|品牌2]`，移除旧版"API不支持|分隔符"错误警告，所有示例更新为多品牌词格式
  - v1.3 (2026-04-15): 认证方式统一为 geo-config.json 的 openKey，所有请求增加 Referer 头
  - v1.2 (2026-03-31): Token改为从.env读取（不再硬编码）、新增Windows PowerShell批量脚本及踩坑点、修正示例中过期Token
  - v1.1 (2026-03-13): 添加API批量提交限制警告
