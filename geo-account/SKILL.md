---
name: geo-account
description: "GEO 账号、公司产品、套餐资源查询技能。Use when the user says 查看公司/产品列表、发布账号、账号资源、套餐、配额、积分、余额、dashboard、仪表盘、视频素材、平台账号是否正常、有哪些账号/产品/公司. Do not use for article upload, publishing, or indexing tasks; use geo-article, geo-publish, or geo-indexing."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey（需先完成 geo-config 配置）

# GEO 账户与资源管理

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

本模块整合了 GEO 平台的公司/产品、发布账号、套餐状态、视频资产查询能力。帮助用户全面掌握平台账号资源、套餐配额、使用情况，为运营决策提供数据支撑。

---

## 通用安全规则

## Base URL 输出规则

- Base URL 属于内部接口配置：脚本可以读取、测试和写入配置文件，但默认回复、日志、dry-run、JSON 预览中不得展示具体 Base URL。
- 用户侧可以展示 Referer、脱敏 openKey、companyId/productId、接口路径（如 `/v1/geo-company`），但不要展示接口域名。
- 用户只提供 openKey 时，先调用 `geo-config/scripts/configure_openkey.js` 自动识别平台接口与 Referer。

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。
- 有专用 Node 脚本时优先使用脚本；没有专用脚本时使用 `geo-runtime/scripts/api_request.js`，`curl` 只作为低级调试，不作为中文正文或批量写操作默认方案。

---

## 能力总览

- **发布账号列表**：分页查询、按平台/状态筛选、按平台分组显示、发布统计
- **公司/产品列表**：查询当前 openKey 可访问的公司与产品
- **套餐管理**：套餐列表、用户当前套餐及配额
- **视频管理**：视频列表查询、从 OEM 批量导入视频

---

## API 接口汇总

| 方法 | 路径 | 说明 | 测试状态 |
|------|------|------|---------|
| GET | /v1/publication-account | 获取发布账号列表 | ✅ 正常 |
| GET | /v1/package | 获取套餐列表 | ✅ 正常 |
| GET | /v1/package/self | 获取当前用户套餐状态 | ✅ 正常 |
| GET | /v1/video | 查询视频列表 | ✅ 正常 |
| POST | /v1/video/import | 从 OEM 导入视频 | ✅ 正常 |

> **注意**：Swagger 当前未提供旧版 `dashboard/summary`、`package/user`、`sku` 系列接口；用户套餐状态应使用 `/v1/package/self`。

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

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# ${companyId} 从 geo-config.json 的 defaults.companyId 读取
curl -X GET "${baseUrl}/v1/publication-account?page=1&limit=30&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
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

## 二、套餐列表（GET /v1/package）

### 查询参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--page` | 页码 | 1 |
| `--limit` | 每页数量 | 10 |
| `--company-id` | 公司 ID | 从配置读取 |

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
curl -X GET "${baseUrl}/v1/package?page=1&limit=10&companyId=${companyId}" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"
```

---

## 三、视频管理

### 查询视频列表 — GET /v1/video

查询参数：`page`（默认 1）、`limit`（默认 10）

### 导入视频 — POST /v1/video/import

| 参数 | 类型 | 说明 |
|------|------|------|
| source | string | 导入来源，固定为 `oem` |
| videoIds | string[] | OEM 平台视频 ID 数组 |

### curl 示例（仅调试；默认优先使用 Node 脚本或 `geo-runtime/scripts/api_request.js`）

```bash
# 查询视频列表
curl -X GET "${baseUrl}/v1/video?page=1&limit=10" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}"

# 导入视频（${videoId} 为 OEM 平台视频 ID）
curl -X POST "${baseUrl}/v1/video/import" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: ${referer}" \
  -d '{"source":"oem", "videoIds":["${videoId1}","${videoId2}"]}'
```

### 注意事项

- 批量导入 `videoIds` 建议单次不超过 50 个
- 导入为异步处理，需等待后查询列表确认

---

## 通用执行步骤

1. 从 `~/.geo-skills/credentials/geo-config.json` 读取 `openKey`
2. 根据操作选择对应 API 接口
3. 设置统一请求头（Authorization + Referer）
4. 拼接查询参数并发送请求
5. 检查响应 `statusCode` 字段（0 为成功），解析数据
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

所有技能统一从 `~/.geo-skills/credentials/geo-config.json` 读取认证信息：
- openKey：接口密钥
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/
- Base URL：内部自动识别，不对用户展示
