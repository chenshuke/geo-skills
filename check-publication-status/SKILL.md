# GEO发布状态检测技能

> **技能名称**：check-publication-status
> **用途**：检测GEO平台上文章的发布状态
> **作者**：GEO执行助理
> **创建时间**：2026年3月26日

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能说明

查询GEO平台上的文章发布状态，识别哪些文章已成功发布，哪些还未发布。

---

## 使用方法

### 方式1：检测所有发布状态

```
/skill check-publication-status --productId=88 --companyId=36
```

### 方式2：指定页码查询

```
/skill check-publication-status --productId=88 --companyId=36 --page=1 --limit=30
```

### 方式3：显示详细信息

```
/skill check-publication-status --productId=88 --companyId=36 --verbose
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--productId` | 产品ID | 是 | - |
| `--companyId` | 公司ID | 是 | - |
| `--page` | 页码 | 否 | 1 |
| `--limit` | 每页数量 | 否 | 30 |
| `--verbose` | 显示详细信息 | 否 | false |

---

## API接口信息

**接口地址**：`https://nbgeo.aimusiclj.com/v1/publication`

**请求方法**：GET

**请求头**：
```
Authorization: Bearer ${openKey}
Referer: https://geo.bihuoai.com/
```

**请求参数**：
- `page`: 页码（从1开始）
- `limit`: 每页数量（默认30）
- `productId`: 产品ID
- `companyId`: 公司ID

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 准备请求

**读取认证信息**：从 geo-config.json 读取 openKey

**构建请求URL**：
```bash
base_url="https://nbgeo.aimusiclj.com/v1/publication"
url="${base_url}?page=${page:-1}&limit=${limit:-30}&productId=${productId}&companyId=${companyId}"
```

### 2. 发送请求

**使用curl调用API**：
```bash
response=$(curl -s -X GET "$url" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json")
```

### 3. 解析响应

**检查响应状态**：
```bash
# 检查HTTP状态码
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$url" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -H "Content-Type: application/json")

if [ "$http_code" != "200" ]; then
  echo "❌ API请求失败，HTTP状态码：$http_code"
  exit 1
fi
```

**解析JSON响应**：
```bash
# 使用jq解析JSON（如果已安装）
if command -v jq &> /dev/null; then
  echo "$response" | jq '.'
else
  echo "$response"
fi
```

### 4. 分析发布状态

**提取关键信息**：
```bash
# 统计总数
total=$(echo "$response" | jq '.total // 0')

# 统计当前页数量
count=$(echo "$response" | jq '.data | length')

# 提取文章列表
items=$(echo "$response" | jq -r '.data[] | {title, status, url} | @json')
```

### 5. 生成报告

**显示统计信息**：
```bash
echo "=== 发布状态检测报告 ==="
echo "产品ID：$productId"
echo "公司ID：$companyId"
echo "总数量：$total"
echo "当前页：${page:-1}"
echo "本页数量：$count"
echo ""
```

**按状态分类显示**：
```bash
echo "✅ 已发布文章："
echo "$response" | jq -r '.data[] | select(.status == "published") | "- \(.title)"'

echo ""
echo "⏳ 待发布文章："
echo "$response" | jq -r '.data[] | select(.status != "published") | "- \(.title)"'
```

### 6. 保存结果

**保存到文件**：
```bash
# 保存JSON响应
echo "$response" > "publication_status_${productId}_$(date +%Y%m%d_%H%M%S).json"

# 保存可读报告
{
  echo "=== 发布状态检测报告 ==="
  echo "检测时间：$(date '+%Y-%m-%d %H:%M:%S')"
  echo "产品ID：$productId"
  echo "公司ID：$companyId"
  echo ""
  echo "统计信息："
  echo "总数量：$total"
  echo "本页数量：$count"
  echo ""
  echo "详细列表："
  echo "$response" | jq -r '.data[] | "- [\(.status)] \(.title)"'
} > "publication_report_${productId}_$(date +%Y%m%d_%H%M%S).txt"
```

---

## 响应格式示例

**成功响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 123,
      "title": "文章标题",
      "status": "published",
      "url": "https://example.com/article/123",
      "createdAt": "2026-03-26T10:00:00Z",
      "updatedAt": "2026-03-26T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 30,
  "totalPages": 2
}
```

---

## 错误处理

### 常见错误及解决方案

**错误1：401 Unauthorized**
- 原因：openKey无效或过期
- 解决：在管理平台 > 密钥管理中重新创建 openKey，更新到 geo-config.json

**错误2：404 Not Found**
- 原因：API地址错误或产品/公司ID不存在
- 解决：检查API地址和ID参数

**错误3：500 Internal Server Error**
- 原因：服务器错误
- 解决：稍后重试或联系技术支持

---

## 输出格式

### 标准输出

```
=== 发布状态检测报告 ===
检测时间：2026-03-26 16:30:00
产品ID：88
公司ID：36

统计信息：
总数量：50
本页数量：30
当前页：1

✅ 已发布文章（35篇）：
- [published] 文章标题1
- [published] 文章标题2
...

⏳ 待发布文章（15篇）：
- [draft] 文章标题3
- [pending] 文章标题4
...
```

### JSON输出

```json
{
  "productId": 88,
  "companyId": 36,
  "total": 50,
  "published": 35,
  "draft": 10,
  "pending": 5,
  "items": [...]
}
```

---

## 高级功能

### 1. 分页查询所有文章

```bash
#!/bin/bash
# 查询所有页的数据
page=1
limit=30
total_fetched=0

while true; do
  echo "正在查询第$page页..."

  response=$(curl -s -X GET \
    "https://nbgeo.aimusiclj.com/v1/publication?page=$page&limit=$limit&productId=88&companyId=36" \
    -H "Authorization: Bearer ${openKey}" \
    -H "Referer: https://geo.bihuoai.com/")

  # 处理当前页数据
  count=$(echo "$response" | jq '.data | length')
  total_fetched=$((total_fetched + count))

  echo "本页数量：$count，已获取：$total_fetched"

  # 检查是否还有下一页
  total=$(echo "$response" | jq '.total')
  if [ $total_fetched -ge $total ]; then
    break
  fi

  page=$((page + 1))
  sleep 1  # 避免请求过快
done

echo "查询完成，共获取 $total_fetched 条数据"
```

### 2. 导出CSV格式

```bash
# 导出为CSV格式
echo "$response" | jq -r '.data[] | [.id, .title, .status, .url] | @csv' > publication_status.csv
```

### 3. 对比本地文件

```bash
# 读取本地文章列表
local_articles=$(ls -1 content/*.md | xargs -I {} basename {} .md)

# 读取已发布文章列表
published_articles=$(echo "$response" | jq -r '.data[] | select(.status == "published") | .title')

# 找出未发布的文章
for article in $local_articles; do
  if ! echo "$published_articles" | grep -q "$article"; then
    echo "未发布：$article"
  fi
done
```

---

## 配置管理

所有GEO技能统一从 `geo-config.json` 读取认证信息，无需手动配置 Token。详见顶部"配置"章节。

---

## 使用示例

### 示例1：基本查询

```bash
/skill check-publication-status --productId=88 --companyId=36
```

**输出**：
```
=== 发布状态检测报告 ===
检测时间：2026-03-26 16:30:00
产品ID：88
公司ID：36
总数量：50
当前页：1
本页数量：30

✅ 已发布文章（25篇）：
- 犀成咨询怎么样
- 犀成咨询公司介绍
...

⏳ 待发布文章（5篇）：
- 犀成咨询最新动态
...
```

### 示例2：分页查询

```bash
# 查询第2页
/skill check-publication-status --productId=88 --companyId=36 --page=2
```

### 示例3：查询并保存

```bash
# 查询并保存结果
/skill check-publication-status --productId=88 --companyId=36 --save
```

---

## 注意事项

1. **认证安全**：
   - 所有请求统一使用 openKey，从 geo-config.json 读取
   - 不要在代码中硬编码密钥

2. **API限流**：
   - 避免请求过快，可能触发限流
   - 建议每页查询间隔1秒以上

3. **数据量**：
   - 如果数据量很大，分页查询可能需要较长时间
   - 建议使用异步模式或后台任务

4. **错误处理**：
   - 始终检查HTTP状态码
   - 处理网络错误和API错误
   - 提供清晰的错误信息

---

## 技能版本

- **版本**：v2.0
- **创建日期**：2026年3月26日
- **最后更新**：2026年4月15日

---

## 相关技能

- `geo-article-list` - 获取GEO平台的文章列表
- `geo-article-review` - 审核GEO平台的文章
- `geo-publish-create` - 创建发布任务
