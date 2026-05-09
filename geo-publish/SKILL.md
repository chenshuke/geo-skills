---
name: geo-publish
description: GEO平台发布任务管理模块，包含创建发布任务和删除发布任务
---

# GEO 发布任务管理

本模块管理 GEO 平台的发布任务，支持将已审核通过的文章发布到多个平台账号（今日头条、搜狐号、B站、知乎、CSDN、微信公众号、小红书、抖音），支持定时发布和批量发布。

---

## 能力总览

- **创建发布任务**：单篇/多篇文章发布到单个/多个平台账号，支持定时发布和 AIGC 开关
- **删除发布任务**：清理测试任务或取消已有发布任务（支持批量）

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/publication-task | 创建发布任务 |
| DELETE | /v1/publication-task | 删除发布任务 |

---

## 一、创建发布任务（POST /v1/publication-task）

### 参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--name` | 发布任务名称 | 是 | - |
| `--article-id` | 单个文章 ID | 否* | - |
| `--article-ids` | 多个文章 ID（逗号分隔） | 否* | - |
| `--platform` | 单个发布平台 | 否* | - |
| `--platforms` | 多个发布平台（逗号分隔） | 否* | - |
| `--account-id` | 单个发布账号 ID | 否* | - |
| `--account-ids` | 多个发布账号 ID（逗号分隔） | 否* | - |
| `--publish-time` | 定时发布时间（YYYY-MM-DD HH:MM:SS） | 否 | 立即发布 |
| `--product-id` | 产品 ID | 否 | 从配置读取 |
| `--company-id` | 公司 ID | 否 | 从配置读取 |
| `--aigc` | 是否使用 AIGC（true/false） | 否 | false |

> 文章 ID 和平台账号必须提供。

### 支持的平台

toutiao（今日头条）、sohu_news（搜狐号）、bilibili（B站）、zhihu（知乎）、csdn（CSDN）、wechat（微信公众号）、xiaohongshu（小红书）、douyin（抖音）

### 请求体结构

```json
{
  "name": "任务名称",
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

### curl 示例

```bash
# 单篇文章发布到单个账号
curl -s -X POST "https://nbgeo.aimusiclj.com/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"海顿壁挂炉推广",
    "aigc":false,
    "productId":88,
    "articles":[{"articleId":4346,"platforms":[{"platform":"sohu_news","publishAccountIds":[188],"publishTime":null,"config":{"channels":[],"attribute":"","requireLogin":false,"infoSource":"0","sourceLink":""}}]}],
    "companyId":36
  }'
```

### 成功响应

```json
{
  "statusCode": 0,
  "message": "success",
  "data": { "taskId": 123 }
}
```

---

## 二、删除发布任务（DELETE /v1/publication-task）

### 请求体

```json
{"ids": [2464, 2465]}
```

### curl 示例

```bash
curl -s -X DELETE "https://nbgeo.aimusiclj.com/v1/publication-task" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json" \
  -d '{"ids":[2464]}'
```

---

## 执行步骤

1. 从 `geo-config/geo-config.json` 读取 `openKey`、`companyId`、`productId`
2. 解析参数（文章 ID、平台列表、账号列表、发布时间）
3. 参数验证：任务名称非空、文章 ID 与平台账号数量匹配、平台名称有效
4. 构造请求体并发送请求
5. 检查响应，输出任务 ID 和发布计划

---

## 完整工作流

```bash
# 1. 创建文章
/skill geo-article-create --title="标题" --content="..." --product-id=88

# 2. 审核文章
/skill geo-article-review --approve=4346

# 3. 查看可用账号
/skill geo-account-list --platform=sohu_news

# 4. （可选）测试发布 -- 测试后必须删除！
/skill geo-publish-create --name="测试" --article-id=4346 --platform=sohu_news --account-id=188
# 删除测试任务
# DELETE /v1/publication-task {"ids":[任务ID]}

# 5. 创建正式发布任务
/skill geo-publish-create --name="正式推广" --article-id=4346 --platform=sohu_news --account-id=188
```

---

## 注意事项

1. **测试任务清理（重要）**：调试创建的发布任务**必须立即删除**，避免文章重复发布。正式发布前检查任务列表确认无残留测试任务
2. **productId 匹配**：发布任务的 productId 必须与文章关联的产品 ID 一致，否则返回 `statusCode: 10108`
3. **每日发布限制**：注意每个账号的 `maxPostOneDay`，不要超出限制
4. **定时发布**：时间格式必须为 `YYYY-MM-DD HH:MM:SS`
5. **文章状态**：文章必须先审核通过（status=1）才能发布
6. **多平台发布**：platforms 和 accountIds 数组长度必须一致，一一对应

---

## 配置

所有技能统一从 `geo-config/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：https://nbgeo.aimusiclj.com
