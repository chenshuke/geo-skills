---
name: generate-cover
description: 为GEO文章生成封面图片，支持AI生成、模板样式和自定义设计。强制使用短文件名，输出映射文件供 upload-image 联动使用。
---

# 生成文章封面图片

> **技能名称**：generate-cover
> **用途**：为GEO文章生成封面图片，支持多种生成方式
> **作者**：GEO执行助理
> **联动技能**：upload-image（生成后自动上传到 OSS）

## 技能说明

根据文章标题、内容、关键词等信息生成封面图片，支持多种生成方式。

### ⚠️ 文件名规范（强制）

> **核心规则**：封面文件名**禁止包含中文、特殊字符、空格**，只使用 `[前缀]_[编号].png` 格式。

| 场景 | ✅ 正确 | ❌ 错误 |
|------|--------|--------|
| 单篇 | `cover_01.png` | `cover_2026年壁挂炉选购指南.png` |
| 批量 | `cover_01.png` ~ `cover_37.png` | `cover_2026年壁挂炉...png`（中文+过长） |
| 带项目前缀 | `hd_cover_01.png` | `海顿_壁挂炉_封面_01.png` |

**原因**：
1. 中文文件名在 macOS 上受 255 字节限制，长标题会被截断导致文件损坏
2. 中文在 URL 编码后极长，OSS 可能无法正确处理
3. 特殊字符（`：`、`？`、`%`、`/`）会导致 URL 解析失败
4. 重复上传同名文件时 OSS 返回"数据已存在"错误

**推荐命名规则**：
- 批量生成：`{项目缩写}_cover_{编号}.png`（如 `hd_cover_01.png`）
- 单篇生成：`cover_{时间戳}.png`（如 `cover_20260507_143000.png`）
- 编号不足两位补零：`01`、`02` 而非 `1`、`2`

### 映射文件（联动 upload-image）

批量生成时，**必须输出映射文件** `cover_mapping.json`，记录编号→标题→本地路径的对应关系：

```json
{
  "01": {
    "title": "2026年壁挂炉选购完全指南：看懂5个核心参数不踩坑省钱",
    "local_path": "covers/cover_01.png",
    "oss_url": ""
  },
  "02": {
    "title": "2026年全预混冷凝壁挂炉推荐：107%热效率值不值得买",
    "local_path": "covers/cover_02.png",
    "oss_url": ""
  }
}
```

- `oss_url` 字段在上传后由 upload-image 技能回填
- 后续上传文章时，通过映射文件匹配封面 URL，避免人工查找

### 生成方式

1. **AI图像生成**：使用AI图像生成API（DALL-E、Stable Diffusion等）
2. **文字封面**：生成简洁的文字封面（渐变背景+标题文字）
3. **模板封面**：使用预设模板生成封面
4. **图片拼接**：将产品图片与文字组合

---

## 使用方法

### 方式1：AI生成封面
```
/skill generate-cover --title="文章标题" --style="product" --ai="dalle"
```

### 方式2：文字封面
```
/skill generate-cover --title="2026年学生奶粉排行榜" --style="text" --color="blue"
```

### 方式3：模板封面
```
/skill generate-cover --title="产品评测" --style="template" --template="rank"
```

### 方式4：产品+文字
```
/skill generate-cover --title="哈德爱因斯坦奶粉" --productImage="logo.png" --style="product"
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--title` | 文章标题 | 是 | - |
| `--subtitle` | 副标题 | 否 | - |
| `--keywords` | 关键词（逗号分隔） | 否 | - |
| `--style` | 封面样式：text/template/product/ai | 否 | text |
| `--ai` | AI服务：dalle/sd/mj | 否 | dalle |
| `--template` | 模板名称：rank/review/guide/compare | 否 | - |
| `--color` | 主题色：blue/red/green/orange/purple | 否 | blue |
| `--productImage` | 产品图片路径 | 否 | - |
| `--output` | 输出文件路径 | 否 | 自动生成 |
| `--width` | 图片宽度 | 否 | 1200 |
| `--height` | 图片高度 | 否 | 630 |

---

## 封面样式说明

### 1. 文字封面 (style=text)
简洁的文字封面，适合资讯、榜单类文章

**特点**：
- 渐变背景
- 大标题文字
- 可选副标题
- 品牌水印

**颜色选项**：
- `blue` - 蓝色渐变（专业、信任）
- `red` - 红色渐变（热情、促销）
- `green` - 绿色渐变（健康、自然）
- `orange` - 橙色渐变（活力、年轻）
- `purple` - 紫色渐变（高端、科技）

### 2. 模板封面 (style=template)
使用预设模板快速生成

**可用模板**：
| 模板名 | 适用场景 | 样式 |
|--------|----------|------|
| `rank` | 榜单、排行榜 | TOP10徽章+排名数字 |
| `review` | 评测类 | 星级评分+评分标签 |
| `guide` | 攻略、教程 | 步骤图标+指南标识 |
| `compare` | 对比类 | VS标识+对比框 |

### 3. 产品封面 (style=product)
展示产品图片+文字说明

**特点**：
- 产品图片居中/左侧
- 标题文字醒目
- 卖点标签
- 品牌Logo

### 4. AI生成 (style=ai)
使用AI生成创意封面

**AI服务选项**：
- `dalle` - DALL-E（需配置API Key）
- `sd` - Stable Diffusion（需配置API）
- `mj` - Midjourney（需配置API）

---

## 配置说明

### 配置文件位置

在 `.claude/skills-config.json` 中添加封面生成配置：

```json
{
  "cover": {
    "defaultWidth": 1200,
    "defaultHeight": 630,
    "defaultColor": "blue",
    "brandName": "哈德爱因斯坦",
    "brandLogo": "03-品牌素材库/LOGO/Logo.png",
    "outputDir": "03-品牌素材库/封面/"
  },
  "ai": {
    "dalle": {
      "apiKey": "YOUR_DALLE_API_KEY",
      "model": "dall-e-3",
      "size": "1024x1024"
    },
    "sd": {
      "apiUrl": "YOUR_SD_API_URL",
      "model": "sdxl-base"
    }
  }
}
```

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 读取配置
从 `.claude/skills-config.json` 读取封面生成配置

### 2. 解析参数
- 提取标题、副标题、关键词
- 确定生成样式
- 确定输出路径

### 3. 生成封面

#### 方式A：文字封面
使用ImageMagick或其他工具生成：
```bash
# 创建渐变背景
convert -size 1200x630 gradient:#000080-#4169E1 background.png

# 添加标题文字
convert background.png \
  -font "Microsoft-YaHei-Bold" \
  -pointsize 60 \
  -fill white \
  -gravity center \
  -annotate +0+0 "文章标题" \
  cover.png
```

#### 方式B：模板封面
根据选择模板添加元素：
- rank模板：添加TOP10徽章
- review模板：添加星级评分
- guide模板：添加步骤图标
- compare模板：添加VS标识

#### 方式C：产品封面
1. 加载产品图片
2. 调整大小和位置
3. 添加标题文字
4. 添加卖点标签
5. 添加品牌Logo

#### 方式D：AI生成
1. 构建AI提示词（基于标题+关键词）
2. 调用AI图像生成API
3. 下载生成的图片
4. 调整尺寸和添加文字

### 4. 保存图片
- 保存到指定输出目录
- **文件名格式**：`{前缀}_cover_{编号}.png`（禁止中文和特殊字符）
  - 编号不足两位补零：`01`、`02`...
  - 如有项目前缀：`hd_cover_01.png`（hd = 海顿）
  - 单篇无编号时：`cover_{YYYYMMDD_HHmmss}.png`
- 返回图片路径

### 5. 输出映射文件
- 批量生成时，在输出目录生成 `cover_mapping.json`
- 记录每个编号对应的标题、本地路径
- `oss_url` 字段留空，待 upload-image 技能回填

```python
import json

mapping = {}
for num, title, path in cover_list:
    mapping[num] = {
        "title": title,
        "local_path": path,
        "oss_url": ""
    }

with open("covers/cover_mapping.json", "w", encoding="utf-8") as f:
    json.dump(mapping, f, indent=2, ensure_ascii=False)
```

### 6. 可选：自动上传
如果指定 `--upload=true`，自动调用 upload-image 技能上传：
- 读取 `cover_mapping.json` 中的 `local_path`
- 上传后回填 `oss_url`
- 更新文章中的封面引用（`![封面](oss_url)`）

---

## 输出结果

### 生成成功
```
✅ 封面生成成功！

📝 文章标题：2026年学生奶粉排行榜TOP10
🎨 封面样式：rank模板
📁 保存路径：covers/hd_cover_01.png
📐 尺寸：1200 x 630
📋 映射文件：covers/cover_mapping.json（37条记录）
```

---

## 使用示例

### 示例1：榜单文章封面
```bash
/skill generate-cover \
  --title="2026年学生奶粉排行榜TOP10" \
  --style="template" \
  --template="rank" \
  --color="blue"
```

### 示例2：评测文章封面
```bash
/skill generate-cover \
  --title="哈德爱因斯坦神经酸奶粉深度评测" \
  --subtitle="性价比之王？" \
  --style="template" \
  --template="review" \
  --color="orange"
```

### 示例3：攻略文章封面
```bash
/skill generate-cover \
  --title="学生奶粉选购避坑指南" \
  --subtitle="2026年最新版" \
  --style="template" \
  --template="guide" \
  --color="green"
```

### 示例4：简单文字封面
```bash
/skill generate-cover \
  --title="神经酸：助力孩子大脑发育" \
  --style="text" \
  --color="purple"
```

### 示例5：产品封面
```bash
/skill generate-cover \
  --title="哈德爱因斯坦神经酸奶粉" \
  --subtitle="3-12岁学生专属" \
  --style="product" \
  --productImage="03-品牌素材库/产品图/奶粉罐.png" \
  --color="blue"
```

### 示例6：AI生成封面
```bash
/skill generate-cover \
  --title="儿童成长奶粉" \
  --keywords="健康,营养,成长" \
  --style="ai" \
  --ai="dalle" \
  --upload=true
```

---

## 封面设计规范

### 推荐尺寸
- **标准封面**：1200 x 630 (1.91:1)
- **方形封面**：1080 x 1080 (1:1)
- **竖版封面**：1080 x 1350 (4:5)

### 颜色搭配建议
| 文章类型 | 推荐颜色 |
|---------|---------|
| 产品介绍 | 品牌色、蓝色 |
| 榜单排行 | 金色、红色、蓝色 |
| 评测对比 | 橙色、紫色 |
| 攻略教程 | 绿色、蓝色 |
| 案例故事 | 暖色调、橙色 |

### 文字规范
- **标题字号**：48-72px
- **副标题字号**：24-36px
- **字体**：微软雅黑、思源黑体
- **颜色**：白色或深色（根据背景）
- **位置**：居中或偏左上

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 配置文件不存在 | 未创建配置文件 | 创建 `.claude/skills-config.json` |
| 产品图片不存在 | 指定的产品图片路径错误 | 检查图片路径 |
| AI API调用失败 | API Key无效或网络问题 | 检查API配置和网络 |
| 生成工具不可用 | ImageMagick等工具未安装 | 安装必要的图像处理工具 |
| 输出目录不可写 | 没有写入权限 | 检查目录权限 |

---

## 依赖工具

### 可选工具（用于文字封面）
- **ImageMagick**：图像处理工具
- **Python PIL/Pillow**：Python图像库
- **Canvas**：HTML5 Canvas（浏览器环境）

### AI生成需要
- **DALL-E**：OpenAI API Key
- **Stable Diffusion**：SD API或本地部署
- **Midjourney**：Discord API或第三方服务

---

## 完整工作流示例

### 从创作到发布全流程
```bash
# 第1步：创作文章
使用 geo-create-product 技能创作文章

# 第2步：生成封面
/skill generate-cover \
  --title="文章标题" \
  --style="template" \
  --template="rank" \
  --color="blue" \
  --upload=true

# 第3步：上传文章
/skill upload-article \
  --title="文章标题" \
  --content="文章内容" \
  --cover="生成的封面路径" \
  --productId=98 \
  --companyId=36
```

---

## ⚠️ 常见问题与修复（v2.0 更新）

### 问题1：文件名过长被截断（高发）

**症状**：封面本地显示正常，上传到 OSS 后 404 或图片损坏

**根本原因**：macOS 文件系统限制文件名为 255 字节，中文字符占 3 字节。例如 `cover_01_2026年壁挂炉选购指南：看懂这5个核心参数不踩坑省钱.png` 有 80+ 字节中文名，超出限制后被系统静默截断为 `cover_01_2026年壁挂炉选购指南：看懂这5个核.png`，导致 OSS 上传的文件名和文章引用的 URL 不一致。

**修复方案**：**禁止在文件名中使用中文**，只用编号命名。
- ✅ `hd_cover_01.png`（9 字节，绝对安全）
- ❌ `cover_2026年壁挂炉选购指南：看懂这5个核心.png`（70+ 字节，必截断）

### 问题2：OSS 文件名冲突（"数据已存在"）

**症状**：重新生成并上传封面时，OSS 返回"数据已存在"

**根本原因**：OSS 的 `temp/` 目录下同名文件已存在，且 OSS 不允许覆盖。

**修复方案**：
- 更换文件名前缀（如 `hd_cover_01.png` → `hd2_cover_01.png`）
- 或使用带时间戳的命名：`cover_20260507_143000_01.png`

### 问题3：文章封面 URL 无法映射

**症状**：封面上传成功，但文章中引用的 URL 和实际 OSS 地址不一致

**根本原因**：文件名被截断或重命名后，文章中的 `![封面](old_url)` 没有同步更新。

**修复方案**：
- 使用 `cover_mapping.json` 映射文件跟踪本地路径 → OSS URL
- 上传完成后，遍历映射文件，批量替换文章中的封面 URL
- 永远不要手动复制粘贴 URL

### 问题4：特殊字符导致 URL 失败

**症状**：URL 中包含 `%3A`（冒号）、`%EF%BC%9A`（中文冒号）等编码

**修复方案**：文件名只使用 `[a-zA-Z0-9_-]`，避免任何需要 URL 编码的字符。

### 最佳实践

1. **文件命名**（强制）：
   - ✅ `hd_cover_01.png`、`cover_20260507_143000.png`
   - ❌ 任何包含中文、空格、冒号、百分号的文件名

2. **标题长度**：
   - 主标题：≤ 20字符
   - 副标题：≤ 15字符

3. **保存格式**：
   - 始终使用：`img.save(path, format='PNG', optimize=True)`
   - 不要使用：`img.save(path)` （默认格式可能不兼容）

4. **映射文件**（批量时必须）：
   - 生成时输出 `cover_mapping.json`
   - 上传后回填 `oss_url`
   - 通过映射文件更新文章封面引用

5. **错误处理**：
   - 所有字体加载都加 try-except
   - 所有文件操作都检查返回值

---

## 技能版本

- **版本**：v2.0
- **创建日期**：2026-03-25
- **更新日期**：2026-05-07
- **支持样式**：text、template、product、ai
- **输出格式**：PNG、JPG
- **v2.0 变更**：
  - ✅ 强制短文件名规范（禁止中文、特殊字符）
  - ✅ 新增映射文件 `cover_mapping.json` 输出机制
  - ✅ 新增 upload-image 联动说明
  - ✅ 新增 OSS 文件名冲突处理方案
  - ✅ 新增文章封面 URL 映射更新流程
