---
name: geo-article-create
description: 在自研GEO平台新建文章，支持文章标题、内容、摘要、封面图、标签等完整信息
---

# GEO新建文章

> **技能名称**：geo-article-create
> **用途**：在自研GEO平台创建新文章
> **API地址**：https://nbgeo.aimusiclj.com/v1/article
> **作者**：GEO执行助理

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能说明

在自研GEO平台创建新文章，支持设置标题、内容、摘要、封面图、标签等信息。

**功能特点**：
- 支持Markdown格式内容
- 自动生成摘要（如未提供）
- 支持多个标签
- 支持封面图片上传

---

## 使用方法

### 方式1：基础创建（仅标题+内容）
```
/skill geo-article-create --title="燃气壁挂炉推荐指南" --content="# 燃气壁挂炉推荐..." --product-id=88 --company-id=36
```

### 方式2：完整创建（包含所有信息）
```
/skill geo-article-create \
  --title="2025年燃气壁挂炉TOP10推荐" \
  --content="文章内容..." \
  --summary="本文为您推荐2025年最值得购买的燃气壁挂炉" \
  --cover-image-url="https://example.com/cover.jpg" \
  --tags="壁挂炉,燃气,推荐" \
  --product-id=88 \
  --company-id=36
```

### 方式3：从文件创建
```
/skill geo-article-create \
  --title="海顿壁挂炉评测" \
  --content-file="D:\docs\article.md" \
  --product-id=88 \
  --company-id=36
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--title` | 文章标题 | 是 | - |
| `--content` | 文章内容（与content-file二选一） | 是* | - |
| `--content-file` | 文章内容文件路径（与content二选一） | 是* | - |
| `--summary` | 文章摘要 | 否 | 自动提取 |
| `--cover-image-url` | 封面图片URL | 否 | - |
| `--tags` | 标签，用逗号分隔 | 否 | [] |
| `--product-id` | 产品ID | 是 | 88 |
| `--company-id` | 公司ID | 是 | 36 |

> *注：`--content` 和 `--content-file` 必须提供其中一个

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 解析参数
从用户输入中提取所有参数

### 2. 参数验证
- 检查 `title` 不为空
- 检查 `content` 或 `content-file` 至少提供一个
- 确认 `product-id` 和 `company-id` 为有效数字

### 3. 处理内容文件
如果提供了 `content-file`，使用 Read 工具读取文件内容

### 4. 生成摘要
如果未提供 `summary`，自动从内容中提取（取前100字）

### 5. 处理标签
如果提供了 `tags`，将逗号分隔的字符串转换为数组：
```
"壁挂炉,燃气,推荐" → ["壁挂炉", "燃气", "推荐"]
```

### 6. 构造API请求

**API地址**：`https://nbgeo.aimusiclj.com/v1/article`

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
  "title": "这里是文章标题",
  "productId": 88,
  "coverImageUrl": "https://example.com/cover.jpg",
  "content": "这里是文章内容",
  "summary": "这里是文章摘要",
  "tags": ["标签1", "标签2"],
  "companyId": 36
}
```

### 7. 执行API调用
使用 Bash 工具执行 curl 命令：

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/article" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Content-Type: application/json" \
  -H "Referer: https://geo.bihuoai.com/" \
  -d '{
    "title": "文章标题",
    "productId": 88,
    "content": "文章内容",
    "summary": "文章摘要",
    "tags": ["标签1"],
    "companyId": 36
  }'
```

### 8. 处理响应结果

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "id": 123,
    "title": "文章标题"
  }
}
```

**错误处理**：
- 如果 `statusCode != 0`，显示错误信息
- 如果请求失败，显示网络错误详情

### 9. 输出结果
向用户报告：
- ✅ 文章创建成功
- 📄 文章ID
- 📝 文章标题
- 🏷️ 标签信息
- 🔗 文章链接（如有）

---

## 示例

### 示例1：基础创建

**输入**：
```
/skill geo-article-create --title="海顿壁挂炉评测" --content="# 海顿壁挂炉评测\n\n这是一篇详细评测..." --product-id=88 --company-id=36
```

**输出**：
```
✅ 文章创建成功！

📄 文章ID：123
📝 标题：海顿壁挂炉评测
🏷️ 标签：无
📊 字数：约1500字

🔗 查看文章：https://nbgeo.aimusiclj.com/article/123
```

---

### 示例2：完整创建

**输入**：
```
/skill geo-article-create \
  --title="2025年燃气壁挂炉TOP10推荐" \
  --content="完整文章内容..." \
  --summary="本文为您推荐2025年最值得购买的燃气壁挂炉，涵盖性价比、性能、售后等多维度评测" \
  --cover-image-url="https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/cover.jpg" \
  --tags="壁挂炉,燃气,推荐,海顿" \
  --product-id=88 \
  --company-id=36
```

**输出**：
```
✅ 文章创建成功！

📄 文章ID：124
📝 标题：2025年燃气壁挂炉TOP10推荐
📄 摘要：本文为您推荐2025年最值得购买的燃气壁挂炉，涵盖性价比、性能、售后等多维度评测
🖼️ 封面图：已设置
🏷️ 标签：壁挂炉、燃气、推荐、海顿
📊 字数：约2500字

🔗 查看文章：https://nbgeo.aimusiclj.com/article/124
```

---

### 示例3：从文件创建

**输入**：
```
/skill geo-article-create \
  --title="海顿壁挂炉使用指南" \
  --content-file="D:\docs\海顿壁挂炉使用指南.md" \
  --tags="使用指南,教程" \
  --product-id=88 \
  --company-id=36
```

**输出**：
```
✅ 文章创建成功！

📄 文章ID：125
📝 标题：海顿壁挂炉使用指南
📄 摘要：（已自动提取）
🏷️ 标签：使用指南、教程
📊 字数：约3000字

🔗 查看文章：https://nbgeo.aimusiclj.com/article/125
```

---

## 注意事项

1. **内容格式**：支持Markdown格式，API会自动处理
2. **摘要长度**：建议摘要长度在50-200字之间
3. **封面图**：必须是有效的URL地址
4. **标签数量**：建议不超过5个标签
5. **标题长度**：建议标题长度在10-50字之间
6. **内容长度**：建议文章内容不少于500字

---

## 技能版本

- **版本**：v1.0
- **创建日期**：2025-03-11
- **API版本**：v1
- **最后更新**：2025-03-11
