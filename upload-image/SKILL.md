---
name: upload-image
description: 上传图片到阿里云OSS，通过两步流程完成：1.获取上传凭证 2.上传文件到OSS。支持批量上传和URL镜像转存。自动处理文件名冲突和特殊字符。
---

# 上传图片到OSS

> **技能名称**：upload-image
> **用途**：上传本地图片到阿里云OSS存储，或将第三方图片URL转存为OSS镜像
> **作者**：GEO执行助理
> **版本**：v3.0
> **联动技能**：generate-cover（封面生成→上传→回填映射文件）

## 技能说明

通过阿里云OSS API上传图片文件，采用标准的两步上传流程：
1. **第一步**：调用后端API获取OSS上传凭证（签名、policy等）
2. **第二步**：使用获取的凭证上传文件到OSS（无需Authorization header）

额外支持：将第三方图片URL批量转存为OSS镜像URL。

---

## 配置

### 环境变量配置

所有认证信息和API地址统一从环境变量读取，无需手动传入认证参数。

在项目根目录的 `.env` 文件中配置以下变量：

```bash
# GEO 平台 API 密钥（永久密钥，从管理后台获取）
GEO_OPEN_KEY=your_geo_open_key_here

# GEO 平台 API 地址
GEO_BASE_URL=https://nbgeo.aimusiclj.com

# GEO 平台请求来源标识（固定值）
GEO_REFERER=https://geo.bihuoai.com/
```

| 环境变量 | 说明 |
|---------|------|
| `GEO_OPEN_KEY` | Bearer Token认证密钥，从必火GEO管理后台获取 |
| `GEO_BASE_URL` | GEO平台API基础地址 |
| `GEO_REFERER` | 请求来源标识（防盗链） |

> **重要**：调用此技能前，请先确认 `.env` 文件已正确配置。所有请求将自动使用 `Authorization: Bearer {{GEO_OPEN_KEY}}` + `Referer: {{GEO_REFERER}}` 进行认证。

### 认证方式

所有对 GEO 平台 API 的请求统一使用以下请求头：

```yaml
Content-Type: application/json
Authorization: Bearer {{GEO_OPEN_KEY}}
Referer: {{GEO_REFERER}}
```

> **注意**：第二步 OSS 上传不需要 Authorization header，只需第一步获取的签名凭证参数。

---

## 使用方法

### 方式1：基本上传
```
/skill upload-image --file="path/to/image.png"
```

### 方式2：指定业务类型
```
/skill upload-image --file="path/to/image.png" --businessType=2 --groupId=1
```

### 方式3：批量上传
```
/skill upload-image --files="image1.png,image2.jpg,image3.png"
```

### 方式4：URL镜像转存
```
/skill upload-image --urls="https://example.com/img1.png,https://example.com/img2.jpg"
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--file` | 单个图片文件路径 | 否 | - |
| `--files` | 多个图片文件路径（逗号分隔） | 否 | - |
| `--urls` | 第三方图片URL列表（逗号分隔） | 否 | - |
| `--businessType` | 业务类型（2=图片） | 否 | 2 |
| `--groupId` | 分组ID | 否 | 1 |
| `--from` | 来源标识 | 否 | 1 |

> `--file`、`--files`、`--urls` 三选一或组合使用。

---

## API详情

### 接口1：获取上传凭证

**接口地址**：`POST {{baseUrl}}/v1/oss/pre`

**请求头**：
```yaml
Content-Type: application/json
Authorization: Bearer {{openKey}}
Referer: {{referer}}
```

**请求体**：
```json
{
  "fileName": "xxx.png",
  "businessType": 2,
  "groupId": 1,
  "from": 1,
  "url": ""
}
```

**响应示例**：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": {
    "expire": "1774495828",
    "policy": "eyJleHBpcmF0aW9uIjoiMjAyNi0wMy0yNlQwMzozMDoyOC4yMzNaIiwiY29uZGl0aW9ucyI6W1siY29udGVudC1sZW5ndGgtcmFuZ2UiLDAsNDE5NDMwNDAwMF1dfQ==",
    "signature": "J/5W/Fv4SYzxprwbpy6r4qAECmI=",
    "OSSAccessKeyId": "LTAI5tNAXLH9G6rF6axdeUra",
    "host": "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com",
    "callback": "eyJjYWxsYmFja1VybCI6Imh0dHBzOi8vbmJnZW8uYWltdXNpY2xqLmNvbS92MS9vc3MvY2FsbCIsImNhbGxiYWNrQm9keSI6ImZpbGVOYW1lPTIwMjYwMzI1MTEzMDI3XzI4NTc3LnBuZyZkaXI9dGVtcCZ1c2VySWQ9MjgmZnJvbT0xJmJ1c2luZXNzVHlwZT0yJmdyb3VwSWQ9MSZhZ2VudElkPTQmc2l6ZT0ke3NpemV9Jm1pbWVUeXBlPSR7bWltZVR5cGV9JmhlaWdodD0ke2ltYWdlSW5mby5oZWlnaHR9JndpZHRoPSR7aW1hZ2VJbmZvLndpZHRofSZmb3JtYXQ9JHtpbWFnZUluZm8uZm9ybWF0fSZoYXNoPSR7Y29udGVudE1kNX0iLCJjYWxsYmFja0JvZHlUeXBlIjoiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkIn0=",
    "dir": "temp/",
    "key": "temp/20260325113027_28577.png",
    "uploadUrl": "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/20260325113027_28577.png",
    "Content-Disposition": "attachment;filename=20260325113027_28577.png"
  }
}
```

### 接口2：上传文件到OSS

**接口地址**：`POST {{host}}`（从第一步响应中获取）

**Content-Type**：`multipart/form-data`

> **注意**：此请求不需要 Authorization header，直接使用第一步获取的签名凭证。

**表单字段**：

| 字段 | 说明 | 示例值 |
|------|------|--------|
| `expire` | 过期时间戳 | 1774495828 |
| `policy` | 上传策略（Base64编码） | eyJleH... |
| `signature` | 签名 | J/5W/Fv4... |
| `OSSAccessKeyId` | OSS访问密钥ID | LTAI5tNAXLH9G6rF6axdeUra |
| `host` | OSS主机地址 | https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com |
| `callback` | 回调配置（Base64编码） | eyJjYWx... |
| `dir` | 上传目录 | temp/ |
| `key` | 对象键（文件路径） | temp/20260325113027_28577.png |
| `uploadUrl` | 上传URL | https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/... |
| `Content-Disposition` | 内容处置 | attachment;filename=xxx.png |
| `file` | 文件内容（二进制） | - |

### 接口3：批量URL转OSS镜像（新增）

**接口地址**：`POST {{baseUrl}}/v1/oss/translate-url`

**请求头**：
```yaml
Content-Type: application/json
Authorization: Bearer {{openKey}}
Referer: {{referer}}
```

**请求体**：
```json
{
  "urls": [
    "https://example.com/image1.png",
    "https://example.com/image2.jpg"
  ]
}
```

**说明**：将第三方图片URL批量转存为OSS镜像URL，返回对应的OSS地址列表。适用于需要将外部图片持久化到自有OSS存储的场景。

---

## curl示例

### 第一步：获取上传凭证

> **注意**：以下命令中的变量从环境变量读取：
> - `${GEO_BASE_URL}` → API基础地址
> - `${GEO_OPEN_KEY}` → 认证密钥
> - `${GEO_REFERER}` → 请求来源标识

```bash
curl -X POST "${GEO_BASE_URL}/v1/oss/pre" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}" \
  -d '{"fileName":"xxx.png", "businessType":2, "groupId":1, "from":1, "url":""}'
```

### 第二步：上传到OSS（不需要Bearer token，直接用OSS的签名凭证）

```bash
curl -X POST "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/" \
  -F "expire=..." \
  -F "policy=..." \
  -F "signature=..." \
  -F "OSSAccessKeyId=..." \
  -F "host=..." \
  -F "callback=..." \
  -F "dir=temp/" \
  -F "key=temp/xxx.png" \
  -F "uploadUrl=..." \
  -F "Content-Disposition=..." \
  -F "file=@local_file.png"
```

### URL转存（translate-url）

```bash
curl -X POST "${GEO_BASE_URL}/v1/oss/translate-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}" \
  -d '{"urls":["https://example.com/img1.png","https://example.com/img2.jpg"]}'
```

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 0. 读取配置
- 从 `.env` 文件读取 `GEO_BASE_URL`、`GEO_OPEN_KEY`、`GEO_REFERER`
- 确认配置存在且 `GEO_OPEN_KEY` 不为空

### 1. 验证文件（文件上传模式）
- 检查文件路径是否存在
- 验证文件类型（支持：png, jpg, jpeg, gif, webp）
- 获取文件大小（最大4GB）

### 1.5 文件名安全处理（关键步骤）

> **此步骤在调用 OSS 接口之前执行，防止文件名问题导致上传失败或 URL 不可访问。**

**规则**：
1. **移除所有非安全字符**：只保留 `[a-zA-Z0-9._-]`
2. **中文转拼音或直接移除**：禁止中文出现在 OSS 文件名中
3. **截断过长文件名**：文件名（含扩展名）不超过 80 字符
4. **处理文件名冲突**：OSS 返回"数据已存在"时自动添加时间戳后缀重试

```python
import re, time

def safe_filename(filename):
    """
    将任意文件名转换为 OSS 安全文件名。
    规则：只保留字母、数字、点、下划线、连字符。
    """
    # 提取扩展名
    name, ext = os.path.splitext(filename)
    ext = ext.lower()  # .png, .jpg 等

    # 移除所有非安全字符
    safe = re.sub(r'[^a-zA-Z0-9._-]', '', name)

    # 如果清理后为空（全中文文件名），用时间戳替代
    if not safe:
        safe = f"img_{int(time.time() * 1000)}"

    # 截断过长文件名（不含扩展名不超过 70 字符）
    if len(safe) > 70:
        safe = safe[:70]

    return safe + ext

def handle_conflict(filename, max_retries=3):
    """
    处理 OSS 文件名冲突。
    如果 OSS 返回"数据已存在"，自动添加时间戳后缀重试。
    """
    base, ext = os.path.splitext(filename)
    for attempt in range(max_retries):
        if attempt == 0:
            return filename
        else:
            return f"{base}_{int(time.time())}_{attempt}{ext}"
    return filename
```

**示例**：
| 原始文件名 | 安全文件名 |
|-----------|-----------|
| `cover_2026年壁挂炉选购指南.png` | `cover_2026.png` |
| `产品图：海顿Q12正面.png` | `Q12.png` |
| `banner (1).jpg` | `banner_1.jpg` |
| `工厂照片@最终版#.png` | `.png` → `img_1715067200000.png` |

### 1.6 映射文件联动（批量上传封面时）

> 当上传由 `generate-cover` 生成的封面时，应读取 `cover_mapping.json` 并回填 `oss_url`。

```python
import json

# 读取映射文件
with open("covers/cover_mapping.json", "r", encoding="utf-8") as f:
    mapping = json.load(f)

# 上传每个封面后回填 OSS URL
for num, info in mapping.items():
    local_path = info["local_path"]
    oss_url = upload_to_oss(local_path)  # 上传并获取 URL
    info["oss_url"] = oss_url

# 保存更新后的映射文件
with open("covers/cover_mapping.json", "w", encoding="utf-8") as f:
    json.dump(mapping, f, indent=2, ensure_ascii=False)
```

### 2. 第一步：获取上传凭证
```bash
curl -X POST "${GEO_BASE_URL}/v1/oss/pre" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GEO_OPEN_KEY}" \
  -H "Referer: ${GEO_REFERER}" \
  -d '{
    "fileName": "${filename}",
    "businessType": 2,
    "groupId": 1,
    "from": 1,
    "url": ""
  }'
```

### 3. 解析响应
检查 `statusCode` 是否为 0，提取 `data` 字段中的所有上传参数。

### 4. 第二步：上传文件到OSS
> 此步骤不需要 Authorization header，使用第一步获取的签名凭证即可。

```bash
curl -X POST "${host}" \
  -F "expire=${expire}" \
  -F "policy=${policy}" \
  -F "signature=${signature}" \
  -F "OSSAccessKeyId=${OSSAccessKeyId}" \
  -F "host=${host}" \
  -F "callback=${callback}" \
  -F "dir=${dir}" \
  -F "key=${key}" \
  -F "uploadUrl=${uploadUrl}" \
  -F "Content-Disposition=${Content-Disposition}" \
  -F "file=@${local_file_path}"
```

### 5. 处理上传结果
- 成功：返回 `uploadUrl` 作为图片访问地址
- **"数据已存在"错误**：调用 `handle_conflict()` 自动添加时间戳后缀，用新文件名重新获取凭证并上传
- 失败：显示错误信息并提示重试

### 6. 批量上传
如需上传多个文件，循环执行步骤1-5。
- 批量封面上传时，同步更新 `cover_mapping.json` 中的 `oss_url`
- 输出完整的 本地路径 → OSS URL 对照表

### 7. URL转存模式（可选）
如果使用 `--urls` 参数，则调用 `POST /v1/oss/translate-url` 接口，直接返回转换后的OSS镜像URL列表。

---

## 输出结果

### 单个文件上传成功
```
✅ 图片上传成功！

📁 文件名：example.png
🔗 访问URL：https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/20260325113027_28577.png
📦 文件大小：1.2MB
⏱️ 上传耗时：2.3秒
```

### 批量上传成功
```
✅ 批量上传完成！

📊 上传统计：
- 成功：3/3
- 失败：0

📋 上传清单：
✓ example1.png → https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx1.png
✓ example2.jpg → https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx2.jpg
✓ example3.png → https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx3.png

⏱️ 总耗时：6.8秒
```

### URL转存成功
```
✅ URL转存完成！

📋 转存清单：
✓ https://example.com/img1.png → https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx1.png
✓ https://example.com/img2.jpg → https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx2.jpg

📊 转存统计：2/2
```

---

## 错误处理

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 配置文件缺失 | `.claude/geo-config.json` 不存在 | 创建配置文件并填入正确信息 |
| openKey为空 | 配置中 `openKey` 未设置 | 在 `.claude/geo-config.json` 中配置 `geo.openKey` |
| 认证失败(401) | openKey过期或无效 | 更新 `geo.openKey` |
| 文件不存在 | 路径错误或文件已删除 | 检查文件路径 |
| 文件类型不支持 | 非图片格式 | 使用支持的图片格式 |
| 文件过大 | 超过4GB | 压缩文件或分割上传 |
| 获取凭证失败 | 认证过期或网络问题 | 检查配置和网络连接 |
| 上传失败 | OSS服务异常或凭证过期 | 重试或检查参数 |
| **数据已存在** | **OSS上已有同名文件** | **自动添加时间戳后缀重试**（见步骤 1.5） |
| **上传成功但404** | **文件名含中文/特殊字符被截断** | **使用 `safe_filename()` 清理文件名后重新上传** |
| **封面URL不匹配** | **文章中的URL和实际OSS地址不一致** | **使用 `cover_mapping.json` 映射文件批量更新** |

---

## 使用示例

### 示例1：上传单个图片
```
/skill upload-image --file="./images/logo.png"
```

### 示例2：上传多个图片
```
/skill upload-image --files="./images/banner.png,./images/icon.png,./images/bg.jpg"
```

### 示例3：从知识库上传
```
/skill upload-image --file="03-品牌素材库/LOGO/必火AI反色LOGO.png"
```

### 示例4：URL镜像转存
```
/skill upload-image --urls="https://cdn.example.com/img1.png,https://cdn.example.com/img2.jpg"
```

---

## 注意事项

1. **文件名安全（最重要）**：上传前必须通过 `safe_filename()` 处理文件名，禁止中文、特殊字符、空格。未处理的文件名可能导致：上传成功但 URL 404、文件被截断损坏、文章封面无法显示
2. **文件名冲突**：OSS 不允许覆盖同名文件。遇到"数据已存在"时，自动添加时间戳后缀重试
3. **自动认证**：所有认证信息从 `.claude/geo-config.json` 自动读取，无需手动传入
4. **OSS上传无鉴权**：第二步OSS上传使用签名凭证，不需要 Authorization header
5. **文件大小限制**：单个文件最大4GB
6. **映射文件联动**：批量上传封面时，读取并回填 `cover_mapping.json`，确保文章封面 URL 一致
7. **网络稳定**：上传大文件时保持网络稳定
8. **路径规范**：支持相对路径和绝对路径

---

## 技能版本

- **版本**：v3.0
- **创建日期**：2026-03-25
- **最后更新**：2026-05-07
- **API来源**：必火AI GEO平台
- **v3.0 变更**：
  - ✅ 新增文件名安全处理 `safe_filename()`（步骤 1.5）
  - ✅ 新增文件名冲突自动重试 `handle_conflict()`
  - ✅ 新增 generate-cover 映射文件联动机制
  - ✅ 新增"上传成功但404"、"封面URL不匹配"错误处理
  - ✅ 更新注意事项，文件名安全列为第一条

---

## 配置说明

### 环境变量配置

将认证信息存储在项目根目录的 `.env` 文件中：

```bash
# GEO 平台 API 密钥（永久密钥，从管理后台获取）
GEO_OPEN_KEY=your_geo_open_key_here

# GEO 平台 API 地址
GEO_BASE_URL=https://nbgeo.aimusiclj.com

# GEO 平台请求来源标识（固定值）
GEO_REFERER=https://geo.bihuoai.com/
```

### 获取 openKey

从必火AI GEO平台获取 OpenKey，填入配置文件的 `geo.openKey` 字段。
