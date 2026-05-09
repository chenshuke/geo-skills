---
name: geo-indexing-delete
description: 删除自研GEO平台的查收录任务，支持单个或批量删除
---

# GEO删除查收录任务

> **技能名称**：geo-indexing-delete
> **用途**：删除自研GEO平台的查收录任务
> **API地址**：https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom
> **作者**：GEO执行助理

---

## 技能说明

删除自研GEO平台的查收录任务，支持单个删除或批量删除。

**功能特点**：
- 单个任务删除
- 批量任务删除
- 按ID删除
- 删除确认提示
- 显示删除结果

---

## 使用方法

### 方式1：删除单个任务
```
/skill geo-indexing-delete --id=14227
```

### 方式2：批量删除多个任务
```
/skill geo-indexing-delete --ids=14227,14228,14229
```

### 方式3：批量删除（范围）
```
/skill geo-indexing-delete --ids="14227-14250"
```

### 方式4：完整参数
```
/skill geo-indexing-delete --ids=14227,14228 --company-id=36
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--id` | 单个任务ID | 否* | - |
| `--ids` | 多个任务ID，用逗号分隔 | 否* | - |
| `--company-id` | 公司ID | 否 | 从配置读取 |
| `--force` | 强制删除，跳过确认 | 否 | false |

> *注：`--id` 和 `--ids` 必须提供其中一个

### 参数格式说明

**多个ID格式**：
- 逗号分隔：`14227,14228,14229`
- 范围格式：`14227-14250`（包含边界）
- 混合格式：`14227,14230-14240,14250`

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 读取配置
从 geo-config.json 配置文件读取 openKey 和 companyId。

### 2. 解析参数
- 支持 `--id`（单个）和 `--ids`（多个）
- 处理范围格式（如 `14227-14250`）
- 展开成完整的ID列表

### 3. 参数验证
- 检查是否提供了任务ID
- 验证ID格式是否为数字
- 如果未提供 `--force`，询问用户确认

### 4. 构造API请求

**API地址**：`https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom?companyId=36`

**请求方法**：DELETE

**请求头**：
```json
{
  "Authorization": "Bearer ${openKey}",
  "Referer": "https://geo.bihuoai.com/",
  "Content-Type": "application/json"
}
```

**请求体格式**：
```json
{
  "ids": [14227, 14228, 14229]
}
```

### 5. 执行API调用
使用 Bash 工具执行 curl 命令：

```bash
curl -X DELETE "https://nbgeo.aimusiclj.com/v1/ai-indexing-task/custom?companyId=36" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{"ids":[14227]}'
```

### 6. 处理响应结果

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "deletedCount": 1
  }
}
```

### 7. 输出结果
向用户报告：
- ✅ 删除成功/失败
- 📋 删除的任务ID列表
- 📊 删除统计

---

## 示例

### 示例1：删除单个任务

**输入**：
```
/skill geo-indexing-delete --id=14227
```

**输出**：
```
⚠️ 确认删除

即将删除查收录任务：
📋 任务ID：14227

❓ 确认要删除此任务吗？此操作不可恢复。

[确认删除中...]

✅ 删除成功！

📋 已删除任务：
└─ 任务ID：14227

📊 删除统计：成功1个 | 失败0个

💡 提示：任务已永久删除，无法恢复
```

---

### 示例2：批量删除

**输入**：
```
/skill geo-indexing-delete --ids=14227,14228,14229
```

**输出**：
```
⚠️ 确认删除

即将删除以下查收录任务：
📋 任务ID列表：14227, 14228, 14229
📊 共计：3个任务

❓ 确认要删除这3个任务吗？此操作不可恢复。

[确认删除中...]

✅ 批量删除成功！

📋 已删除任务：
├─ 任务ID：14227 ✅
├─ 任务ID：14228 ✅
└─ 任务ID：14229 ✅

📊 删除统计：成功3个 | 失败0个
```

---

### 示例3：范围删除

**输入**：
```
/skill geo-indexing-delete --ids="14227-14230"
```

**输出**：
```
⚠️ 确认删除

即将删除以下查收录任务：
📋 任务ID范围：14227-14230
📊 共计：4个任务
📋 详细列表：
├─ 14227
├─ 14228
├─ 14229
└─ 14230

❓ 确认要删除这4个任务吗？此操作不可恢复。

[确认删除中...]

✅ 批量删除成功！

📋 已删除任务：
├─ 任务ID：14227 ✅
├─ 任务ID：14228 ✅
├─ 任务ID：14229 ✅
└─ 任务ID：14230 ✅

📊 删除统计：成功4个 | 失败0个
```

---

### 示例4：强制删除（跳过确认）

**输入**：
```
/skill geo-indexing-delete --id=14227 --force
```

**输出**：
```
✅ 删除成功！

📋 已删除任务：
└─ 任务ID：14227

📊 删除统计：成功1个 | 失败0个
```

---

### 示例5：删除失败

**输入**：
```
/skill geo-indexing-delete --id=99999
```

**输出**：
```
❌ 删除失败！

📋 任务ID：99999
📝 错误信息：任务不存在或已被删除

📊 删除统计：成功0个 | 失败1个

💡 提示：请检查任务ID是否正确
```

---

## 注意事项

1. **不可恢复**：删除操作不可撤销，请谨慎操作
2. **ID验证**：请确保任务ID存在且有效
3. **批量限制**：一次批量删除建议不超过100个任务
4. **权限检查**：确保当前用户有删除权限
5. **认证方式**：从 geo-config.json 配置文件读取 openKey

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能版本

- **版本**：v1.1
- **创建日期**：2025-03-12
- **API版本**：v1
- **最后更新**：2026-04-15
- **更新内容**：
  - v1.1 (2026-04-15): 认证方式统一为 geo-config.json 的 openKey，所有请求增加 Referer 头

---

## 相关操作

### 先查看后删除
```bash
# 1. 查看查收录任务列表
/skill geo-indexing-list

# 2. 找到要删除的任务ID

# 3. 删除指定任务
/skill geo-indexing-delete --id=14227
```

### 批量清理
```bash
# 删除特定品牌的所有任务（需先获取ID列表）
/skill geo-indexing-list --keyword="贝易寿"
/skill geo-indexing-delete --ids=14227,14228,14229...
```

---
