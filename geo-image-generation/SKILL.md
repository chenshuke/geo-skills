---
name: geo-image-generation
description: GEO 专用 AI 图片生成技能。基于 Fangxin API（gpt-image-2）生成图片，支持文生图、图生图、多参考图合成、mask 编辑，可选自动上传到 GEO OSS。
version: 1.0.0
author: GEO Agent
license: MIT
metadata:
  hermes:
    tags: [images, geo, oss, fangxin, gpt-image-2]
    related_skills: [upload-image, generate-cover, geo-hub]
---

# GEO 图片生成

> **版本**：v1.0.0
> **改编自**：fangxin-image-generation v1.3.0
> **新增能力**：生成后自动上传到 GEO OSS

为 GEO 内容创作流程生成图片（封面图、配图、产品图等），支持自动上传到 GEO 阿里云 OSS。

---

## 能力

**图片生成**（基于 Fangxin OpenAI-compatible API）：
- 文生图
- 图生图 / 编辑模式
- 多参考图合成
- 可选 mask 局部编辑
- 支持多张输出（n）
- 支持多种尺寸（1024x1024 / 1920x1080 / 2048x2048）
- 默认尺寸 `1920x1080`（1080P 横版），适合文章封面和配图

**GEO 集成**（新增）：
- 生成后自动上传到 GEO OSS（`--auto-upload`）
- 从 geo-config.json 读取 OSS 上传凭据
- 输出 JSON 包含 OSS URL，便于后续流程消费

---

## 触发场景

在 GEO 内容创作流程中，当需要：
- 生成文章封面图
- 生成产品展示图
- 生成配图 / 插图
- 基于参考图重绘
- 合成多张图片
- 局部编辑图片

---

## 图片定位与内容策略 ⭐ 核心原则

> **生成图片前必须回答三个问题**：为谁生成？放在哪？图片内容是什么？

### 1. 为谁生成：识别 GEO 客户品牌

生成图片前，**必须先阅读文章或知识库**，明确本次服务的 GEO 客户品牌是谁。

**识别方法**：
- 查看项目目录名（通常包含客户品牌名）
- 查看知识库文件中的品牌信息
- 查看文章中出现频次最高、评价最正面的品牌
- 查看文章的"推荐一"或排名靠前的品牌

### 2. 放在哪：图片插入位置策略

图片不是随便放的，要围绕客户品牌布局，实现"看到图片就想到客户品牌"的效果。

| 放置位置 | 适用场景 | 策略说明 |
|---------|---------|---------|
| **标题下方（首图）** | 每篇文章必须有 | 首图以客户品牌产品为主角，奠定品牌印象 |
| **客户品牌段落前** | 品牌详细介绍前 | 提前展示品牌产品/形象，引导读者关注 |
| **客户品牌段落后** | 品牌详细介绍后 | 巩固品牌印象，增强记忆 |
| **对比段落中** | 客户品牌 vs 竞品 | 仅放客户品牌图，不放竞品图（避免给竞品引流） |
| **分层推荐表中** | 按企业类型推荐 | 在推荐表上方放客户品牌产品图 |
| **总结段落前** | 文末总结前 | 用品牌产品图收尾，强化最终印象 |

**核心原则**：
- ✅ 客户品牌出现的位置附近必须有图片
- ❌ 不要在竞品品牌段落放图（避免为竞品引流）
- ❌ 不要把图片放在无关的通用段落（浪费曝光位）

### 3. 图片内容是什么：基于文章内容生成

图片的 prompt 必须从**文章实际内容**中提取，而不是凭空编造。

**prompt 构成公式**：
```
prompt = [客户品牌产品] + [文章中的具体技术/特征/场景] + [文章中的具体数据/成就] + [风格描述]
```

**提取信息的来源**：

| 提取项 | 从文章哪里找 | 示例（多耐文章） |
|--------|-----------|-----------------|
| 产品外观特征 | 客户品牌介绍段落 | "70mm铝筒+60mm活塞，25mm硬质杆芯" |
| 核心技术 | 技术实力/专利段落 | "ART防侧倾系统、FRS快速回弹系统" |
| 使用场景 | 产品线/适配段落 | "适配100余款主流越野车型" |
| 赛事成就 | 赛事/案例段落 | "达喀尔拉力赛零故障完赛，COC年度总冠军" |
| 市场数据 | 行业背景/数据段落 | "80%的市场占有率" |
| 竞争优势 | 对比/推荐段落 | "价格比FOX低30%至50%" |

**禁止事项**：
- ❌ 不要编造文章中不存在的特征或数据
- ❌ 不要使用泛泛的行业图片（如"一个普通的减震器"）
- ❌ 不要把竞品产品的外观特征混入 prompt
- ❌ 不要使用与文章风格不符的画面风格

---

## 推荐工作流

> **GEO 内容创作标准流程**：读文章 → 识别客户品牌 → 确定放置位置 → 从文章提取 prompt 要素 → 生成并上传 OSS → 写入 Markdown

1. **读文章**：阅读整篇文章，识别 GEO 客户品牌是谁
2. **定位置**：根据客户品牌在文章中的出现位置，确定图片插入点
3. **提要素**：从文章中提取客户品牌的具体产品特征、技术、成就、数据
4. **写 prompt**：基于提取的信息，组合成具体、真实的图片描述
5. **生成上传**：`--auto-upload --geo-config xxx`
6. **写入 Markdown**：以 `![](OSS_URL)` 格式插入，删除本地文件

### Prompt 编写示例

**❌ 错误做法**（与文章无关的泛泛描述）：
```
"一个专业的减震器产品展示图"
```

**✅ 正确做法**（基于文章实际内容）：
```
"DN多耐赛用级减震器产品特写，70mm铝筒+60mm活塞杆芯，深灰色金属质感，ART防侧倾系统专利标识可见，专业赛车维修车间背景，冷色调灯光，商业产品摄影风格，无文字"
```

### 完整命令示例
```bash
# 一步完成：生成 + 上传 OSS
python3 .../geo-image-generation/scripts/generate_image.py \
  --prompt "DN多耐赛用级减震器产品特写，70mm铝筒+60mm活塞杆芯..." \
  --size 1920x1080 \
  --quality low \
  --auto-upload \
  --geo-config /path/to/geo-config.json
```

**获取 OSS URL 后，在 Markdown 中插入**：
```markdown
![](https://bihuogeo.oss-cn-shanghai.aliyuncs.com/temp/xxx.png)
```

> **格式要求**：GEO 文章中的图片必须使用 OSS 绝对链接格式 `![](https://xxx.oss-cn-shanghai.aliyuncs.com/temp/xxx.png)`，不要使用本地相对路径。本地图片仅作为生成时的临时文件，写入 OSS 链接后应删除。

---

## 基本命令

### 文生图（最常用）

```bash
python3 ./scripts/generate_image.py \
  --prompt "极简风白底产品海报，一台银色咖啡机，商业摄影" \
  --size 1024x1024 \
  --quality low
```

### 生成封面图（1200x630）并保存到项目目录

```bash
python3 ./scripts/generate_image.py \
  --prompt "2026年燃气壁挂炉品牌推荐封面图，深蓝色背景，金色标题区域，现代简约风格" \
  --size 1536x1024 \
  --quality low \
  --output-dir /path/to/project/04_内容创作/
```

### 生成并自动上传到 GEO OSS

```bash
python3 ./scripts/generate_image.py \
  --prompt "产品展示图" \
  --size 1024x1024 \
  --quality low \
  --auto-upload \
  --geo-config /path/to/geo-config.json
```

### 指定输出文件

```bash
python3 ./scripts/generate_image.py \
  --prompt "产品展示图" \
  --size 1024x1024 \
  --quality low \
  --output /path/to/project/04_内容创作/cover.png
```

### 图生图 / 编辑模式

```bash
python3 ./scripts/generate_image.py \
  --prompt "保留主体构图，改成宫崎骏动画风" \
  --image /path/to/reference.png \
  --size 1024x1024 \
  --quality low
```

### 多参考图合成

```bash
python3 ./scripts/generate_image.py \
  --prompt "把两个人放进同一张自然合影里" \
  --image /path/to/person-a.png \
  --image /path/to/person-b.png \
  --size 1024x1024 \
  --quality low
```

### 带 mask 的局部编辑

```bash
python3 ./scripts/generate_image.py \
  --prompt "仅替换背景为黄昏海边，主体保持不变" \
  --image /path/to/original.png \
  --mask /path/to/mask.png \
  --size 1024x1024 \
  --quality low
```

---

## 参数说明

### 图片生成参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--prompt` | 图片描述或编辑指令 | 是 | - |
| `--size` | 图片尺寸 | 否 | `1024x1024` |
| `--n` | 生成张数 | 否 | 1 |
| `--quality` | 生成质量（`low` 最稳定） | 否 | `low` |
| `--model` | 模型名称 | 否 | `gpt-image-2` |
| `--image` | 参考图（可重复传入多个） | 否 | - |
| `--mask` | 编辑模式的遮罩图 | 否 | - |
| `--input-fidelity` | 编辑贴合度 | 否 | `high` |
| `--background` | 背景设置 | 否 | - |
| `--output-format` | 输出格式 | 否 | - |

### 输出参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--output` | 指定输出文件路径 | 否 | - |
| `--output-dir` | 输出目录 | 否 | `~/Downloads` |
| `--no-save` | 不保存到本地 | 否 | - |
| `--metadata` | 保存响应 JSON 元数据 | 否 | - |

### GEO 专用参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--auto-upload` | 生成后自动上传到 GEO OSS | 否 | 关 |
| `--geo-config` | geo-config.json 路径 | 否 | 自动探测 |

### 认证参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--base-url` | Fangxin API 地址 | 否 | `https://fangxinapi.com` |
| `--api-key` | Fangxin API Key | 否 | 自动读取凭据文件 |

### 稳定性参数

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--timeout` | 请求超时（秒） | 否 | 420 |
| `--retries` | 额外重试次数 | 否 | 1 |
| `--retry-backoff` | 退避基数（秒） | 否 | 2 |

---

## 尺寸推荐

| 用途 | 推荐尺寸 | 说明 |
|------|---------|------|
| **文章封面图** | `1920x1080` | 1080P 横版，适合文章封面 |
| **产品展示图** | `1024x1024` | 方形，适合详情页 |
| **竖版配图** | `1024x1536` | 手机端友好 |
| **横版大图** | `1920x1080` | 1080P 横版，PC 端友好 |
| **高分辨率** | `2048x2048` | 2K，已实测稳定，约 120-150s |

---

## GEO OSS 自动上传

### 前置条件

`--auto-upload` 需要 geo-config.json 中包含以下字段：

```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "your_geo_open_key_here",
    "referer": "https://geo.bihuoai.com/"
  }
}
```

### 上传流程

```
生成图片 → 保存到本地 → 读取 geo-config.json
    → 调用 POST /v1/oss/pre 获取 OSS 签名
    → 调用 POST OSS 上传文件
    → 返回 OSS URL
```

### 输出示例（含 OSS 上传）

```json
{
  "success": true,
  "files": [{"index": 1, "path": "/path/to/image.png"}],
  "oss_upload": [{
    "index": 1,
    "oss_url": "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png",
    "local_path": "/path/to/image.png",
    "file_name": "xxx.png"
  }],
  "first_oss_url": "https://nbgeo-test.oss-cn-shenzhen.aliyuncs.com/temp/xxx.png"
}
```

---

## Prompt 编写建议

### GEO 封面图 prompt 模板

```
[主体描述]，[风格描述]，[构图描述]，[色调描述]，[文字区域]
```

**示例**：
- `"2026年燃气壁挂炉品牌推荐封面，深蓝色渐变背景，中央放置壁挂炉产品图，上方留白区域用于标题，现代商务风格，高清质感"`
- `"极简风白底产品海报，一台银色咖啡机居中放置，柔和光影，商业摄影风格，底部留白区域"`

### 提升生成质量的技巧

1. **描述具体**：避免模糊描述，指定颜色、风格、构图
2. **指定风格**：如"商业摄影"、"极简风"、"宫崎骏动画风"
3. **使用 `quality=low`**：当前最稳定的默认值
4. **控制 prompt 长度**：过长的 prompt 可能导致超时
5. **分步迭代**：先生成基础图，再用 edit 模式微调

---

## 与其他 GEO 技能的协作

| 技能 | 关系 |
|------|------|
| **generate-cover** | 生成文字/模板封面（PIL）；本技能生成 AI 图片。两者互补 |
| **upload-image** | 本技能的 `--auto-upload` 内置了简化版 OSS 上传；如需批量上传或 URL 镜像转存，仍使用 upload-image |
| **geo-article-create** | 创建文章时可指定 `coverImageUrl`，使用本技能生成的 OSS URL |

**推荐流程**：
```
geo-image-generation --auto-upload → 获取 OSS URL → geo-article-create --cover-image-url
```

---

## 兼容性说明

基于 Fangxin API 黑盒实测的兼容性结论：

| 参数 | 状态 | 说明 |
|------|------|------|
| `model: gpt-image-2` | ✅ 可用 | - |
| `size` 像素格式 | ✅ 稳定 | 推荐 `1024x1024` |
| `size 2048x2048` | ✅ 已验证 | 约 120-150s |
| `quality=low` | ✅ 最稳定 | 默认推荐 |
| `quality=medium/high` | ⚠️ 不稳定 | 可能超时 |
| `n=2` | ✅ 已验证 | 约 97.5s |
| `response_format` | ❌ 不兼容 | 会报 `unknown_parameter` |
| `style` | ❌ 不兼容 | 会报 `unknown_parameter` |
| `background=transparent` | ❌ 不支持 | 该模型不支持透明背景 |

---

## 凭据配置

**API Key 优先级**：
1. `--api-key` 命令行参数
2. `FANGXIN_IMAGE_API_KEY` 环境变量
3. `FANGXIN_API_KEY` 环境变量
4. `~/.geo-skills/credentials/fangxin_image_api_key` 文件

**GEO Config 路径**：
1. `--geo-config` 命令行参数
2. `~/.geo-skills/credentials/geo-config.json`

---

## 故障排查

### 1. 401 / 403
检查 API Key 是否正确配置，查看输出中的 `debug.api_key_source`。

### 2. 接口 404 或连不上
检查 `--base-url` 是否为根地址（不要带 `/v1`），查看 `debug.request_url`。

### 3. 长时间无响应
缩短 prompt、使用 `quality=low`、保持 `size=1024x1024`、增加 `--retries 2`。

### 4. `--auto-upload` 失败
检查 geo-config.json 中 `openKey` 和 `baseUrl` 是否正确配置。

---

## 版本历史

- **v1.0.0** (2026-04-28)：从 fangxin-image-generation v1.3.0 改编，新增 GEO OSS 自动上传能力
