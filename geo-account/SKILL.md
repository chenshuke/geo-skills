---
name: geo-account
description: GEO平台账户与资源管理模块，包含发布账号查询、数据总览、套餐/SKU管理、视频管理
---

# GEO 账户与资源管理

本模块整合了 GEO 平台的账户信息查询、运营数据总览、套餐与 SKU 管理、视频资产管理能力。帮助用户全面掌握平台账号资源、套餐配额、使用情况，为运营决策提供数据支撑。

---

## 能力总览

- **发布账号列表**：分页查询、按平台/状态筛选、按平台分组显示、发布统计
- **数据总览**：主题/文章/发布/收录的周统计数据汇总
- **套餐管理**：套餐列表、用户当前套餐及配额、SKU 列表及详情
- **视频管理**：视频列表查询、从 OEM 批量导入视频

---

## API 接口汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/publication-account | 获取发布账号列表 |
| GET | /v1/dashboard/summary | 数据总览（周统计） |
| GET | /v1/package | 获取套餐列表 |
| GET | /v1/package/user | 获取用户当前套餐 |
| GET | /v1/sku | 获取 SKU 列表 |
| GET | /v1/sku/{id} | 获取 SKU 详情 |
| GET | /v1/video | 查询视频列表 |
| POST | /v1/video/import | 从 OEM 导入视频 |

---

## 一、发布账号列表

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--page` | 页码 | 1 |
| `--limit` | 每页数量 | 30 |
| `--platform` | 平台筛选 | 全部 |
| `--status` | 状态筛选（0=禁用, 1=正常） | 全部 |
| `--company-id` | 公司 ID | 从配置读取 |
| `--format` | 输出格式：table / group / json | table |

### 支持的平台

toutiao（今日头条）、sohu_news（搜狐号）、bilibili（B站）、zhihu（知乎）、csdn（CSDN）、wechat（微信公众号）、xiaohongshu（小红书）、douyin（抖音）

### curl 示例

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/publication-account?page=1&limit=30&companyId=36" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 响应字段

| 字段 | 说明 |
|------|------|
| id | 账号 ID |
| name | 账号名称 |
| platform | 平台标识 |
| status | 状态（0=禁用, 1=正常） |
| maxPostOneDay | 每日最大发布数 |
| publishedTodayCount | 今日已发布数 |

---

## 二、数据总览

### 说明

无需请求参数，直接调用即可获取周统计数据。

### curl 示例

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/dashboard/summary" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 响应字段

| 字段 | 说明 |
|------|------|
| topicCount | 主题总数 |
| articleCount | 文章总数 |
| publishCount | 发布总数 |
| indexCount | 收录总数 |
| weeklyData[] | 周统计列表（date / topicCount / articleCount / publishCount / indexCount） |

---

## 三、套餐与 SKU 管理

### 套餐列表 — GET /v1/package

查询参数：`page`、`limit`

### 用户当前套餐 — GET /v1/package/user

无需额外参数。返回：packageId、packageName、expireTime、topicQuota、topicUsed、articleQuota、articleUsed。

### SKU 列表 — GET /v1/sku

查询参数：`page`、`limit`、`packageId`（可选筛选）

### SKU 详情 — GET /v1/sku/{id}

路径参数：`id`（SKU 唯一标识）

### curl 示例

```bash
# 获取用户当前套餐
curl -X GET "https://nbgeo.aimusiclj.com/v1/package/user" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 获取指定套餐的 SKU
curl -X GET "https://nbgeo.aimusiclj.com/v1/sku?packageId=1" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 关键字段

SKU 字段包括：id、packageId、name、price、duration、durationUnit（day/month/year）、topicQuota、articleQuota、status、features[]。

---

## 四、视频管理

### 查询视频列表 — GET /v1/video

查询参数：`page`（默认 1）、`limit`（默认 10）

### 导入视频 — POST /v1/video/import

| 参数 | 类型 | 说明 |
|------|------|------|
| source | string | 导入来源，固定为 `oem` |
| videoIds | string[] | OEM 平台视频 ID 数组 |

### curl 示例

```bash
# 查询视频列表
curl -X GET "https://nbgeo.aimusiclj.com/v1/video?page=1&limit=10" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"

# 导入视频
curl -X POST "https://nbgeo.aimusiclj.com/v1/video/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/" \
  -d '{"source":"oem", "videoIds":["id1","id2"]}'
```

### 注意事项

- 批量导入 `videoIds` 建议单次不超过 50 个
- 导入为异步处理，需等待后查询列表确认

---

## 通用执行步骤

1. 从 `geo-config/geo-config.json` 读取 `openKey`
2. 根据操作选择对应 API 接口
3. 设置统一请求头（Authorization + Referer）
4. 拼接查询参数并发送请求
5. 检查响应 `code` / `statusCode` 字段，解析数据
6. 格式化输出结果

## 通用错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 401 | 认证失败，openKey 无效或过期 | 检查 geo-config.json 中的 openKey |
| 403 | 无权限访问 | 确认账户权限 |
| 404 | 资源不存在 | 检查 ID 参数 |
| 429 | 请求频率超限 | 等待后重试（间隔 1 秒以上） |
| 500 | 服务端内部错误 | 联系平台管理员 |

---

## 配置

所有技能统一从 `geo-config/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：https://nbgeo.aimusiclj.com
