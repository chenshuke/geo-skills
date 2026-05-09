---
name: extract-docx
description: 从Word文档(.doc/.docx)中提取结构化内容，支持批量提取和表格提取
---

# 提取Word文档内容

> **技能名称**：extract-docx
> **用途**：从Word文档(.doc/.docx)中提取结构化内容
> **作者**：GEO执行助理

---

## 技能说明

从Word文档中智能提取内容，支持：
- **文本内容提取**：段落、标题、列表
- **表格数据提取**：自动转换为Markdown表格
- **图片信息识别**：记录图片位置和描述
- **结构化输出**：生成Markdown格式文档

---

## 使用方法

### 方式1：提取单个文档
```
/skill extract-docx --file="品牌及董事长资料.docx"
```

### 方式2：批量提取
```
/skill extract-docx --dir="01_原始资料" --batch
```

### 方式3：指定输出格式
```
/skill extract-docx --file="海顿产品资料.doc" --output="产品信息提取.md"
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--file` | 文档文件路径 | 否 | - |
| `--dir` | 目录路径（批量模式） | 否 | - |
| `--batch` | 批量处理模式 | 否 | false |
| `--output` | 输出文件名 | 否 | [原文件名]_提取.md |
| `--format` | 输出格式：md/json/txt | 否 | md |
| `--tables-only` | 仅提取表格 | 否 | false |

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 1. 确认文件信息

**检查文件是否存在**：
```bash
ls -la "[文件路径]"
```

**确认文件类型**：
- `.docx` - 新版Word格式
- `.doc` - 旧版Word格式

### 2. 选择提取方法

#### 对于 .docx 文件

使用 Python + docx 库提取：

```python
from docx import Document

doc = Document("[文件路径]")

# 提取段落
for para in doc.paragraphs:
    print(para.text)

# 提取表格
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            print(cell.text)
```

#### 对于 .doc 文件

使用 Python + win32com 提取：

```python
import win32com.client

word = win32com.client.Dispatch("Word.Application")
doc = word.Documents.Open("[文件路径]")

# 提取所有内容
content = doc.Content.Text

# 保存后关闭
doc.Close()
word.Quit()
```

### 3. 内容处理

#### 识别文档结构

使用 Grep 在提取的内容中查找：
```markdown
# 标题层级
## 二级标题
### 三级标题

# 列表
- 项目1
- 项目2

# 表格（自动转换）
| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |
```

#### 清理内容

- 移除多余空行
- 统一标点符号
- 修正格式错误
- 去除页眉页脚

### 4. 特殊处理

#### 表格转换

Word表格 → Markdown表格：

```python
def table_to_markdown(table):
    # 获取行数列数
    rows = len(table.rows)
    cols = len(table.columns)

    # 构建Markdown表格
    md = "|"
    for i in range(cols):
        md += " |"
    md += "\n|"

    # 添加分隔线
    for i in range(cols):
        md += "---|"
    md += "\n|"

    # 填充数据
    for row in table.rows:
        for cell in row.cells:
            md += f"{cell.text}|"
        md += "\n|"

    return md
```

#### 图片处理

- 记录图片位置
- 提取图片描述（如有）
- 标注：`![图片描述](图片位置)`

### 5. 生成输出文档

使用 Write 工具创建Markdown文档：

```markdown
# [文档名称] - 内容提取

> **来源文件**：[原文件路径]
> **提取时间**：[当前时间]
> **文件类型**：docx/doc
> **内容统计**：X个段落、X个表格、X个图片

---

## 📄 文档内容

### 一、文本内容

[提取的文本内容，保持原有结构]

---

### 二、表格数据

#### 表格1：[表格标题或描述]

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| ... | ... | ... |

---

### 三、图片信息

- 图片1：[描述] - 位置：段落X
- 图片2：[描述] - 位置：段落Y

---

### 四、内容摘要

**主要章节**：
1. [章节1]
2. [章节2]
3. [章节3]

**关键信息**：
- [要点1]
- [要点2]
- [要点3]

**适合补充到**：
- 知识库 → [建议章节]

---

**提取完成**：[时间]
**提取方法**：[python-docx/win32com]
```

### 6. 批量处理（如果使用 --batch）

```bash
# 查找所有文档
find [目录] -name "*.docx" -o -name "*.doc"

# 逐个处理
for file in $(find [目录] -name "*.docx"); do
    /skill extract-docx --file="$file"
done
```

### 7. 输出结果

向用户报告：
- ✅ 内容提取成功
- 📊 提取统计（字数、段落数、表格数）
- 📁 输出文件路径
- 📝 内容摘要
- 💡 补充建议

---

## 示例

### 示例1：提取品牌资料

**输入**：
```
/skill extract-docx --file="品牌及董事长资料.docx"
```

**输出**：
```
✅ 文档内容提取成功！

📊 提取统计：
- 总字数：3,500字
- 段落数：45个
- 表格数：2个
- 图片数：0个

📁 输出文件：
品牌及董事长资料_提取.md

📝 内容摘要：
主要章节：
1. 企业文化价值观
   - 产品观：创新、稳定、通用、追求细节
   - 人才观：忠诚、激情、协作、成长
   - 客户观：用户至上，敬畏客户

2. 品牌故事（20年发展历程）

3. 创始人背景

💡 补充建议：
- 价值观 → 企业品牌知识库"五、企业文化"
- 品牌故事 → 企业品牌知识库"六、品牌故事"
- 创始人背景 → 个人品牌知识库"一、个人背景"
```

### 示例2：提取产品资料

**输入**：
```
/skill extract-docx --file="海顿产品资料.doc" --tables-only
```

**输出**：
```
✅ 表格数据提取成功！

📊 表格统计：
- 提取表格：8个
- 产品型号：50+个
- 尺寸规格：11种

📁 输出文件：
海顿产品资料_表格提取.md

💡 补充建议：
- 产品型号表 → 产品知识库"二、产品体系"
- 尺寸对照表 → 产品知识库"十二、技术参数"
```

---

## 注意事项

1. **文件格式**：.doc 和 .docx 需要不同的提取方法
2. **编码问题**：注意中文字符编码
3. **表格复杂度**：复杂表格（合并单元格）可能需要手动调整
4. **图片提取**：只能记录位置，不能提取图片内容
5. **大文件处理**：大文件可能需要较长时间

---

## 依赖工具

- **python-docx**：处理 .docx 文件
- **pywin32**：处理 .doc 文件（Windows）
- **pandas**：表格数据处理（可选）

安装依赖：
```bash
pip install python-docx pywin32 pandas
```

---

## 技能版本

- **版本**：v1.0
- **创建日期**：2025-02-05
- **最后更新**：2025-02-05
