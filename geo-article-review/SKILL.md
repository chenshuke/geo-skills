---
name: geo-article-review
description: 审核自研GEO平台的文章，支持批量审核通过/驳回
---

# GEO审核文章

> **技能名称**：geo-article-review
> **用途**：审核自研GEO平台的文章
> **API地址**：https://nbgeo.aimusiclj.com/v1/article/status
> **作者**：GEO执行助理

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能说明

批量审核自研GEO平台的文章，支持审核通过或驳回操作。

**功能特点**：
- 单个文章审核
- 批量文章审核
- 审核通过/驳回
- 显示审核结果

---

## 使用方法

### 方式1：单个文章审核通过
```
/skill geo-article-review --id=4346 --status=1
```

### 方式2：批量审核通过
```
/skill geo-article-review --ids=4346,4347,4348 --status=1
```

### 方式3：审核驳回
```
/skill geo-article-review --id=4346 --status=0
```

### 方式4：快捷审核通过
```
/skill geo-article-review --approve=4346
```

### 方式5：快捷驳回
```
/skill geo-article-review --reject=4346
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--id` | 单个文章ID | 否* | - |
| `--ids` | 多个文章ID，用逗号分隔 | 否* | - |
| `--status` | 审核状态（0=驳回，1=通过） | 是 | 1 |
| `--approve` | 快捷审核通过的文章ID | 否* | - |
| `--reject` | 快捷驳回的文章ID | 否* | - |

> *注：`--id`、`--ids`、`--approve`、`--reject` 必须提供其中一个

### 状态值说明

| 状态值 | 说明 |
|--------|------|
| 0 | 驳回/草稿 |
| 1 | 审核通过/发布 |
| 2 | 审核中（可选） |

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 读取配置
从 `geo-config.json` 配置文件读取 openKey。

### 2. 解析参数
从用户输入中提取参数，处理快捷参数：
- `--approve` 自动转换为 `--ids` + `--status=1`
- `--reject` 自动转换为 `--ids` + `--status=0`

### 3. 参数验证
- 检查是否提供了文章ID
- 验证status值是否为0、1或2
- 确认文章ID格式正确

### 4. 构造API请求

**API地址**：`https://nbgeo.aimusiclj.com/v1/article/status`

**请求方法**：POST

**请求头**：
```json
{
  "Authorization": "Bearer ${openKey}",
  "Content-Type": "application/json"
}
```

**请求体格式**：
```json
{
  "ids": [4346, 4347, 4348],
  "status": 1
}
```

### 5. 执行API调用
使用 Bash 工具执行 curl 命令：

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/article/status" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Content-Type: application/json" \
  -H "Referer: https://geo.bihuoai.com/" \
  -d '{"ids":[4346],"status":1}'
```

### 6. 处理响应结果

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "successCount": 1,
    "failedCount": 0
  }
}
```

### 7. 输出结果
向用户报告：
- ✅ 审核成功/失败
- 📄 处理的文章ID列表
- 📊 成功/失败统计

---

## 示例

### 示例1：单个文章审核通过

**输入**：
```
/skill geo-article-review --id=4346 --status=1
```

**输出**：
```
✅ 文章审核成功！

📄 文章ID：4346
📝 审核结果：审核通过
📊 处理统计：成功1篇 | 失败0篇

💡 提示：文章已发布，可以进行下一步操作
```

---

### 示例2：批量审核通过

**输入**：
```
/skill geo-article-review --ids=4346,4347,4348 --status=1
```

**输出**：
```
✅ 批量审核成功！

📄 处理文章：3篇
├─ 4346 ✅ 审核通过
├─ 4347 ✅ 审核通过
└─ 4348 ✅ 审核通过

📊 处理统计：成功3篇 | 失败0篇

💡 提示：所有文章已发布，可以开始推广
```

---

### 示例3：审核驳回

**输入**：
```
/skill geo-article-review --id=4346 --status=0
```

**输出**：
```
✅ 文章审核成功！

📄 文章ID：4346
📝 审核结果：驳回
📊 处理统计：成功1篇 | 失败0篇

💡 提示：文章已驳回，请修改后重新提交
```

---

### 示例4：快捷审核通过

**输入**：
```
/skill geo-article-review --approve=4346
```

**输出**：
```
✅ 文章审核成功！

📄 文章ID：4346
📝 审核结果：审核通过
📊 处理统计：成功1篇 | 失败0篇
```

---

### 示例5：快捷驳回

**输入**：
```
/skill geo-article-review --reject=4346
```

**输出**：
```
✅ 文章审核成功！

📄 文章ID：4346
📝 审核结果：驳回
📊 处理统计：成功1篇 | 失败0篇
```

---

### 示例6：结合其他skill使用

**场景：创建并审核文章**

```bash
# 1. 创建文章
/skill geo-article-create --title="测试文章" --content="内容..." --product-id=88 --company-id=36

# 2. 审核通过
/skill geo-article-review --approve=4346
```

---

## 注意事项

1. **文章ID验证**：请确保文章ID存在且有效
2. **批量限制**：一次批量审核建议不超过50篇文章
3. **状态说明**：
   - status=0: 驳回（文章退回草稿状态）
   - status=1: 审核通过（文章发布）
4. **权限检查**：确保当前用户有审核权限
5. **认证失败**：如遇认证失败，请检查 `geo-config.json` 中的 openKey 是否有效

---

## 技能版本

- **版本**：v1.0
- **创建日期**：2025-03-11
- **API版本**：v1
- **最后更新**：2025-03-11
