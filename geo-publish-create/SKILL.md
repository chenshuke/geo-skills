---
name: geo-publish-create
description: 创建自研GEO平台的发布任务，支持单篇/多篇文章发布到多个平台账号
---

# GEO创建发布任务

> **技能名称**：geo-publish-create
> **用途**：创建发布任务，将文章发布到指定平台账号
> **API地址**：https://nbgeo.aimusiclj.com/v1/publication-task
> **作者**：GEO执行助理

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`.claude/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能说明

创建发布任务，将一篇文章或多篇文章发布到多个平台账号。

**功能特点**：
- 单篇/多篇文章发布
- 多平台同时发布
- 指定发布账号
- 定时发布（可选）
- AIGC开关（可选）

---

## 使用方法

### 方式1：单篇文章发布到单个账号
```
/skill geo-publish-create --name="海顿壁挂炉推广" --article-id=4346 --platform=sohu_news --account-id=188
```

### 方式2：单篇文章发布到多个账号
```
/skill geo-publish-create --name="海顿壁挂炉推广" --article-id=4346 \
  --platforms=sohu_news,toutiao --account-ids=188,189
```

### 方式3：定时发布
```
/skill geo-publish-create --name="定时发布" --article-id=4346 \
  --platform=sohu_news --account-id=188 --publish-time="2025-03-12 10:00:00"
```

### 方式4：多篇文章发布
```
/skill geo-publish-create --name="批量发布" --article-ids=4346,4347 \
  --platform=sohu_news --account-id=188
```

### 方式5：完整参数
```
/skill geo-publish-create \
  --name="海顿壁挂炉推广任务" \
  --article-id=4346 \
  --platform=sohu_news \
  --account-id=188 \
  --product-id=88 \
  --company-id=36 \
  --aigc=false
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--name` | 发布任务名称 | 是 | - |
| `--article-id` | 单个文章ID | 否* | - |
| `--article-ids` | 多个文章ID，用逗号分隔 | 否* | - |
| `--platform` | 单个发布平台 | 否* | - |
| `--platforms` | 多个发布平台，用逗号分隔 | 否* | - |
| `--account-id` | 单个发布账号ID | 否* | - |
| `--account-ids` | 多个发布账号ID，用逗号分隔 | 否* | - |
| `--publish-time` | 发布时间（可选，格式：YYYY-MM-DD HH:MM:SS） | 否 | 立即发布 |
| `--product-id` | 产品ID | 否 | 从配置读取 |
| `--company-id` | 公司ID | 否 | 从配置读取 |
| `--aigc` | 是否使用AIGC（true/false） | 否 | false |

> *注：文章ID和平台账号必须提供

---

## 支持的平台

| 平台值 | 平台名称 |
|--------|----------|
| toutiao | 今日头条 |
| sohu_news | 搜狐号 |
| bilibili | B站 |
| zhihu | 知乎 |
| csdn | CSDN |
| wechat | 微信公众号 |
| xiaohongshu | 小红书 |
| douyin | 抖音 |

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 读取配置
从 geo-config.json 读取 openKey、companyId、productId 等配置信息。

### 2. 解析参数
- 解析文章ID（支持单个或多个）
- 解析平台列表
- 解析账号列表（与平台列表对应）
- 解析发布时间

### 3. 参数验证
- 检查任务名称不为空
- 检查文章ID和平台账号数量匹配
- 验证平台名称有效
- 验证发布时间格式（如提供）

### 4. 构造API请求

**API地址**：`https://nbgeo.aimusiclj.com/v1/publication-task`

**请求方法**：POST

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
  "name": "这里是任务名称",
  "aigc": false,
  "productId": 88,
  "articles": [
    {
      "articleId": 4346,
      "platforms": [
        {
          "platform": "sohu_news",
          "publishAccountIds": [188],
          "publishTime": null,
          "config": {
            "channels": [],
            "attribute": "",
            "requireLogin": false,
            "infoSource": "0",
            "sourceLink": ""
          }
        }
      ]
    }
  ],
  "companyId": 36
}
```

### 5. 执行API调用
使用 Bash 工具执行 curl 命令：

```bash
curl -s -X POST "https://nbgeo.aimusiclj.com/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{"name":"任务名称","aigc":false,"productId":88,"articles":[{"articleId":4346,"platforms":[{"platform":"sohu_news","publishAccountIds":[188],"publishTime":null,"config":{"channels":[],"attribute":"","requireLogin":false,"infoSource":"0","sourceLink":""}}]}],"companyId":36}'
```

### 6. 处理响应结果

**成功响应**：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "taskId": 123
  }
}
```

### 7. 输出结果
向用户报告：
- ✅ 任务创建成功
- 📋 任务ID
- 📄 文章列表
- 🌐 发布平台和账号
- ⏰ 发布时间

---

## 示例

### 示例1：单篇文章发布到单个账号

**输入**：
```
/skill geo-publish-create --name="海顿壁挂炉推广" --article-id=4346 --platform=sohu_news --account-id=188
```

**输出**：
```
✅ 发布任务创建成功！

📋 任务名称：海顿壁挂炉推广
🔗 任务ID：123

📄 发布内容：
└─ 文章ID：4346

🌐 发布计划：
└─ 搜狐号 (账号ID: 188) → 立即发布

📊 统计：1篇文章 | 1个平台 | 立即发布

💡 提示：任务已创建，系统将自动发布到指定平台
```

---

### 示例2：单篇文章发布到多个账号

**输入**：
```
/skill geo-publish-create --name="海顿壁挂炉多平台发布" --article-id=4346 \
  --platforms=sohu_news,toutiao --account-ids=188,189
```

**输出**：
```
✅ 发布任务创建成功！

📋 任务名称：海顿壁挂炉多平台发布
🔗 任务ID：124

📄 发布内容：
└─ 文章ID：4346

🌐 发布计划：
├─ 搜狐号 (账号ID: 188) → 立即发布
└─ 今日头条 (账号ID: 189) → 立即发布

📊 统计：1篇文章 | 2个平台 | 立即发布
```

---

### 示例3：定时发布

**输入**：
```
/skill geo-publish-create --name="定时发布任务" --article-id=4346 \
  --platform=sohu_news --account-id=188 --publish-time="2025-03-12 10:00:00"
```

**输出**：
```
✅ 发布任务创建成功！

📋 任务名称：定时发布任务
🔗 任务ID：125

📄 发布内容：
└─ 文章ID：4346

🌐 发布计划：
└─ 搜狐号 (账号ID: 188) → 2025-03-12 10:00:00

📊 统计：1篇文章 | 1个平台 | 定时发布

⏰ 提示：文章将在指定时间自动发布
```

---

### 示例4：多篇文章批量发布

**输入**：
```
/skill geo-publish-create --name="批量发布任务" --article-ids=4346,4347,4348 \
  --platform=sohu_news --account-id=188
```

**输出**：
```
✅ 发布任务创建成功！

📋 任务名称：批量发布任务
🔗 任务ID：126

📄 发布内容：
├─ 文章ID：4346
├─ 文章ID：4347
└─ 文章ID：4348

🌐 发布计划：
└─ 搜狐号 (账号ID: 188) → 立即发布

📊 统计：3篇文章 | 1个平台 | 立即发布
```

---

### 示例5：查询可用账号后发布

**场景：先查看有哪些账号可用**

```bash
# 1. 查看发布账号列表
/skill geo-account-list

# 输出：搜狐号有账号 188 (AI测评师) 和 371 (元峰说)

# 2. 创建发布任务
/skill geo-publish-create --name="海顿推广" --article-id=4346 \
  --platform=sohu_news --account-id=188
```

---

## 删除发布任务

在创建正式发布任务前，如果进行了测试，**必须先删除测试任务**，避免重复发布。

### 查看任务列表

```bash
curl -s "https://nbgeo.aimusiclj.com/v1/publication-task?page=1&limit=20&companyId=36" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 删除任务（支持批量）

**接口地址**：`DELETE {{baseUrl}}/v1/publication-task`

**请求头**：
```yaml
Authorization: Bearer {{openKey}}
Referer: {{referer}}
Content-Type: application/json
```

**请求体**：
```json
{"ids": [2464, 2465]}
```

**curl示例**：
```bash
curl -s -X DELETE "${GEO_BASE_URL}/v1/publication-task" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}" \
  -H "Content-Type: application/json" \
  -d '{"ids":[2464]}'
```

---

## 注意事项

1. **测试任务清理（重要）**：调试或测试创建的发布任务**必须立即删除**，使用 `DELETE /v1/publication-task` 接口。正式发布前务必检查任务列表，确认没有残留的测试任务，避免文章重复发布
2. **productId 匹配**：发布任务的 `productId` 必须与文章关联的产品 ID 一致（可通过文章列表 API 查看文章的 `product.id`），否则会返回 `statusCode: 10108, message: "产品ID不匹配"`
3. **账号匹配**：确保账号ID与平台对应
4. **发布限制**：注意每个账号的每日发布上限（`maxPostOneDay`），分配文章时不要超出限制
5. **定时发布**：发布时间格式必须为 `YYYY-MM-DD HH:MM:SS`
6. **文章状态**：文章必须先审核通过才能发布
7. **认证失败**：如遇认证失败，请在管理平台 > 密钥管理中重新创建 openKey，更新到 geo-config.json

---

## 完整工作流

```bash
# 1. 创建文章
/skill geo-article-create --title="海顿壁挂炉评测" --content="..." --product-id=88

# 2. 审核文章
/skill geo-article-review --approve=4346

# 3. 查看可用账号
/skill geo-account-list --platform=sohu_news

# 4. （可选）测试发布——测试后必须删除！
/skill geo-publish-create --name="测试发布" --article-id=4346 --platform=sohu_news --account-id=188
# 删除测试任务
curl -X DELETE "${GEO_BASE_URL}/v1/publication-task" -H "Authorization: Bearer ${GEO_OPEN_KEY}" -H "Referer: ${GEO_REFERER}" -H "Content-Type: application/json" -d '{"ids":[任务ID]}'

# 5. 创建正式发布任务
/skill geo-publish-create --name="海顿推广" --article-id=4346 --platform=sohu_news --account-id=188
```

---

## 技能版本

- **版本**：v2.1
- **创建日期**：2025-03-11
- **API版本**：v1
- **最后更新**：2026年5月7日
- **变更说明**：新增删除发布任务接口（DELETE /v1/publication-task）、新增测试任务清理规则、新增 productId 匹配校验说明
