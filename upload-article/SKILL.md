---
name: upload-article
description: 上传文章到GEO平台，支持自动生成封面并上传到OSS，返回文章访问链接
---

# 上传文章到GEO平台

> **技能名称**：upload-article
> **用途**：上传文章到必火GEO平台，自动处理封面生成和上传
> **作者**：GEO执行助理
> **版本**：v3.0
> **更新日期**：2026-04-16

## 技能说明

通过必火GEO平台API上传文章，**完整工作流程**包括：

### ⭐ 依赖技能流程
1. **封面生成**（可选）：调用 `generate-cover` 技能生成封面图片
2. **OSS上传**（如需要）：调用 `upload-image` 技能上传到OSS获取链接
3. **文章上传**：调用GEO平台API上传文章和封面

### 核心功能
- ✅ 自动生成封面图片
- ✅ 自动上传封面到OSS
- ✅ 提交文章标题、正文、摘要等
- ✅ 关联产品和公司信息
- ✅ 返回文章访问链接

---

## 使用方法

### 方式1：自动生成封面（推荐）⭐

```
/skill upload-article --title="文章标题" --content="文章正文" --autoCover
```

**说明**：
- 自动根据标题生成文字封面
- 上传封面到OSS获取链接
- 一起上传到GEO平台

---

### 方式2：指定封面样式生成

```
/skill upload-article \
  --title="2026年学生奶粉排行榜" \
  --content="文章正文..." \
  --autoCover \
  --coverStyle="rank"
```

**封面样式**：
- `text` - 文字封面（默认）
- `rank` - 排行榜封面（TOP10徽章）
- `review` - 评测封面（星级评分）
- `guide` - 攻略封面（步骤图标）
- `compare` - 对比封面（VS标识）
- `product` - 产品封面（产品图片）

**封面颜色**：
- `blue` - 蓝色（专业、信任）
- `red` - 红色（热情、促销）
- `green` - 绿色（健康、自然）
- `orange` - 橙色（活力、年轻）
- `purple` - 紫色（高端、科技）

---

### 方式3：带本地封面上传

```
/skill upload-article \
  --title="文章标题" \
  --content="文章正文" \
  --cover="path/to/cover.png"
```

**说明**：本地封面会自动上传到OSS获取链接

---

### 方式4：带OSS URL上传

```
/skill upload-article \
  --title="文章标题" \
  --content="文章正文" \
  --coverUrl="https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png"
```

**说明**：直接使用已上传的OSS图片链接

---

### 方式5：从知识库文章上传

```
/skill upload-article \
  --file="02-GEO内容库/article.md" \
  --autoCover
```

**说明**：
- 自动从.md文件提取标题和内容
- 自动生成封面
- 一起上传到GEO平台

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--title` | 文章标题 | 是* | 从文件提取 |
| `--content` | 文章正文内容 | 是* | 从文件读取 |
| `--summary` | 文章摘要 | 否 | 自动提取前200字 |
| `--autoCover` | 自动生成封面 | 否 | false |
| `--coverStyle` | 封面样式 | 否 | text |
| `--coverColor` | 封面颜色 | 否 | blue |
| `--cover` | 封面图片本地路径 | 否 | - |
| `--coverUrl` | 封面图片OSS URL | 否 | - |
| `--productId` | 产品ID | 否 | 从配置读取 |
| `--companyId` | 公司ID | 否 | 从配置读取 |
| `--file` | 文章文件路径（.md） | 否 | - |
| `--tags` | 文章标签（逗号分隔） | 否 | [] |

*如果使用 `--file` 参数，title 和 content 会自动从文件中提取

---

## 配置

### 环境变量配置

在项目根目录的 `.env` 文件中配置：

```bash
# GEO 平台 API 密钥（永久密钥，从管理后台获取）
GEO_OPEN_KEY=your_geo_open_key_here

# GEO 平台 API 地址
GEO_BASE_URL=https://nbgeo.aimusiclj.com

# GEO 平台请求来源标识（固定值）
GEO_REFERER=https://geo.bihuoai.com/

# 默认产品ID（可选）
GEO_DEFAULT_PRODUCT_ID=98

# 默认公司ID（可选）
GEO_DEFAULT_COMPANY_ID=36
```

---

## 完整执行流程

当调用此技能时，按以下步骤执行：

### 步骤1：读取配置和内容

**读取环境变量**：
- `GEO_OPEN_KEY` → API认证密钥
- `GEO_BASE_URL` → API基础地址
- `GEO_REFERER` → 请求来源标识
- `GEO_DEFAULT_PRODUCT_ID` → 默认产品ID
- `GEO_DEFAULT_COMPANY_ID` → 默认公司ID

**获取文章内容**：

情况A：直接提供内容
- 使用 `--title` 和 `--content` 参数
- `--summary` 如未提供，自动提取前200字

情况B：从文件读取
- 读取 `.md` 文件
- 提取首个 `#` 标题作为 `title`
- 读取全文作为 `content`
- 自动生成摘要

---

### 步骤2：生成封面（可选）

**触发条件**：提供了 `--autoCover` 参数

**2.1 调用 generate-cover 技能**

```bash
# 生成文字封面（默认）
/skill generate-cover \
  --title="${title}" \
  --style="text" \
  --color="blue" \
  --output="temp_cover.png"
```

**或生成指定样式封面**：
```bash
# 排行榜封面
/skill generate-cover \
  --title="${title}" \
  --style="rank" \
  --template="rank" \
  --output="temp_cover.png"

# 评测封面
/skill generate-cover \
  --title="${title}" \
  --style="review" \
  --template="review" \
  --output="temp_cover.png"
```

**2.2 获取封面文件路径**

生成成功后，`generate-cover` 返回：
```
✅ 封面生成成功！
📁 文件路径: temp_cover.png
🔗 本地路径: D:\python\GEO\temp_cover.png
```

---

### 步骤3：上传封面到OSS（如需要）

**触发条件**：
- 使用了 `--autoCover`（生成了本地封面）
- 或提供了 `--cover`（本地封面路径）

**3.1 调用 upload-image 技能**

```bash
/skill upload-image \
  --file="${cover_path}"
```

**3.2 获取OSS URL**

上传成功后，`upload-image` 返回：
```
✅ 图片上传成功！
🔗 访问URL: https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png
```

**保存OSS链接**：
```python
cover_url = "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png"
```

---

### 步骤4：构建请求数据

```json
{
  "title": "${title}",
  "productId": ${product_id},
  "companyId": ${company_id},
  "coverImageUrl": "${cover_url}",
  "content": "${content}",
  "summary": "${summary}",
  "tags": ${tags_array}
}
```

**字段说明**：
- `title` - 文章标题（必填）
- `productId` - 产品ID（必填）
- `companyId` - 公司ID（必填）
- `coverImageUrl` - 封面OSS URL（可选）
- `content` - 文章正文（必填，支持Markdown）
- `summary` - 文章摘要（可选，不提供则自动提取）
- `tags` - 文章标签数组（可选）

---

### 步骤5：发送API请求

```bash
curl -X POST "${GEO_BASE_URL}/v1/article" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}" \
  -d '{
    "title": "文章标题",
    "productId": 98,
    "companyId": 36,
    "coverImageUrl": "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png",
    "content": "文章正文",
    "summary": "摘要",
    "tags": []
  }'
```

---

### 步骤6：处理响应结果

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "id": 1234,
    "title": "文章标题",
    "url": "https://nbgeo.aimusiclj.com/article/1234",
    "createdAt": "2026-04-16T12:00:00.000Z"
  }
}
```

**返回结果**：
```
✅ 文章上传成功！

📝 文章标题：哈德爱因斯坦神经酸奶粉深度评测
🔢 文章ID：1234
🔗 访问链接：https://nbgeo.aimusiclj.com/article/1234
🖼️ 封面图片：已上传
📦 产品ID：98
🏢 公司ID：36
⏱️ 上传耗时：1.2秒
```

---

## 输出结果

### 自动生成封面并上传

```
✅ 文章上传成功！（含自动封面）

📝 文章标题：2026年学生奶粉排行榜
🔢 文章ID：1234
🔗 访问链接：https://nbgeo.aimusiclj.com/article/1234

🖼️ 封面信息：
   ✅ 封面生成：排行榜样式（蓝色）
   ✅ OSS上传：https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png
   ⏱️ 封面耗时：2.5秒

📊 内容信息：
   📦 产品ID：98
   🏢 公司ID：36
   📝 字数统计：2580字
   🏷️ 标签：奶粉,学生营养,排行榜

⏱️ 总耗时：4.2秒（含封面生成和上传）
```

---

## 使用示例

### 示例1：自动生成文字封面

```bash
/skill upload-article \
  --title="壁挂炉推荐指南" \
  --content="# 壁挂炉推荐指南\n\n## 产品介绍..." \
  --autoCover
```

**流程**：
1. ✅ 生成文字封面（蓝色渐变）
2. ✅ 上传封面到OSS
3. ✅ 上传文章到GEO平台

---

### 示例2：生成排行榜封面

```bash
/skill upload-article \
  --title="2026年AI数字人平台TOP10" \
  --content="文章正文..." \
  --autoCover \
  --coverStyle="rank" \
  --coverColor="red"
```

**流程**：
1. ✅ 生成排行榜封面（红色渐变+TOP10徽章）
2. ✅ 上传封面到OSS
3. ✅ 上传文章到GEO平台

---

### 示例3：从文件上传+自动封面

```bash
/skill upload-article \
  --file="02-GEO内容库/产品介绍/哈德爱因斯坦神经酸奶粉怎么样.md" \
  --autoCover \
  --coverStyle="review"
```

**流程**：
1. ✅ 从.md文件读取标题和内容
2. ✅ 生成评测封面（星级评分）
3. ✅ 上传封面到OSS
4. ✅ 上传文章到GEO平台

---

### 示例4：使用已有OSS封面

```bash
/skill upload-article \
  --title="产品评测" \
  --content="文章内容..." \
  --coverUrl="https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/existing.png"
```

**流程**：
1. ✅ 直接使用已有OSS链接
2. ✅ 上传文章到GEO平台

---

### 示例5：本地封面+自动上传

```bash
/skill upload-article \
  --title="产品介绍" \
  --content="文章内容..." \
  --cover="03-品牌素材库/封面/product.png"
```

**流程**：
1. ✅ 上传本地封面到OSS
2. ✅ 上传文章到GEO平台

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 封面生成失败 | AI服务未配置或网络问题 | 使用本地封面或OSS URL |
| OSS上传失败 | 文件不存在或格式不支持 | 检查图片路径或使用网络URL |
| 文章上传失败 | 标题或内容为空 | 检查参数或文件内容 |
| productId无效 | 产品ID不存在 | 检查产品ID是否正确 |
| companyId无效 | 公司ID不存在 | 检查公司ID是否正确 |
| 认证失败 | GEO_OPEN_KEY无效或已过期 | 更新.env文件中的密钥 |

---

## 注意事项

### ⭐ 重要：封面处理流程

1. **自动生成封面**（`--autoCover`）
   - 优先使用此方式
   - 自动调用 `generate-cover` 技能
   - 自动调用 `upload-image` 技能上传OSS
   - 全流程自动化

2. **本地封面**（`--cover`）
   - 需要手动准备封面图片
   - 自动上传到OSS获取链接
   - 适合已有设计好的封面

3. **OSS URL**（`--coverUrl`）
   - 直接使用已上传的链接
   - 跳过封面生成和上传步骤
   - 最快速的方式

4. **无封面**
   - 直接上传文章，无封面图片
   - 适合快速测试

### 其他注意事项

1. **统一配置**：所有认证和默认参数从 `.env` 环境变量读取
2. **内容格式**：支持 Markdown 格式的文章内容
3. **摘要生成**：未提供摘要时自动提取前200字
4. **默认值**：productId 和 companyId 使用环境变量中的默认值
5. **文件读取**：从 `.md` 文件读取时，首个 H1 标题作为文章标题
6. **认证方式**：使用 `Authorization: Bearer` + `Referer` 双重认证头
7. **封面尺寸**：推荐 1200x630（16:9）
8. **封面格式**：支持 PNG, JPG, JPEG

---

## 技能依赖

此技能依赖以下技能：

### 1. generate-cover
- **用途**：生成文章封面图片
- **调用时机**：当提供 `--autoCover` 参数时
- **调用方式**：
  ```bash
  /skill generate-cover --title="${title}" --style="${coverStyle}"
  ```

### 2. upload-image
- **用途**：上传图片到OSS获取链接
- **调用时机**：当生成封面或提供本地封面时
- **调用方式**：
  ```bash
  /skill upload-image --file="${cover_path}"
  ```

---

## 技能版本

- **版本**：v3.0
- **创建日期**：2026-03-25
- **最后更新**：2026-04-16
- **API来源**：必火AI GEO平台
- **变更说明**：
  - v2.0：配置从 `geo-config/geo-config.json` 迁移至环境变量
  - v3.0：添加自动封面生成功能，集成 `generate-cover` 和 `upload-image` 技能

---

## 最佳实践

### 1. 推荐工作流

```bash
# 最简单的方式：自动生成封面
/skill upload-article \
  --title="文章标题" \
  --content="文章内容..." \
  --autoCover

# 或从文件读取
/skill upload-article \
  --file="文章.md" \
  --autoCover \
  --coverStyle="rank"
```

### 2. 封面样式选择建议

| 文章类型 | 推荐样式 | 推荐颜色 |
|---------|---------|---------|
| 排行榜 | `rank` | `red` / `blue` |
| 产品评测 | `review` | `blue` / `purple` |
| 使用攻略 | `guide` | `green` / `orange` |
| 对比评测 | `compare` | `blue` / `red` |
| 产品介绍 | `product` | 品牌色 |
| 资讯文章 | `text` | `blue` / `green` |

### 3. 批量上传建议

如果需要批量上传多篇文章：
1. 准备好所有.md文件
2. 使用 `--autoCover` 统一生成封面
3. 逐个上传，避免API限流

### 4. 封面优化建议

- ✅ 使用高清图片（分辨率≥1200x630）
- ✅ 标题文字醒目易读
- ✅ 颜色与文章类型匹配
- ✅ 添加品牌Logo增强识别
- ❌ 避免使用模糊图片
- ❌ 避免文字过小

---

## 配置示例

### 环境变量配置 (.env)

```bash
# GEO 平台配置
GEO_OPEN_KEY=YOUR_OPEN_KEY_HERE
GEO_BASE_URL=https://nbgeo.aimusiclj.com
GEO_REFERER=https://geo.bihuoai.com/

# 默认配置
GEO_DEFAULT_PRODUCT_ID=98
GEO_DEFAULT_COMPANY_ID=36
```

### 使用默认配置上传

配置完成后，使用非常简单：

```bash
# 最简方式：自动生成封面
/skill upload-article \
  --title="文章标题" \
  --content="文章内容" \
  --autoCover

# 从文件上传
/skill upload-article \
  --file="文章.md" \
  --autoCover
```
