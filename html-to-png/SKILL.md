# HTML转PNG图片

> 将HTML文件转换为高质量PNG截图，自动去除四周空白

## ⚠️ 重要：Python版本要求

**必须使用专用Python**：`d:\python\python\python`

默认系统Python (`python`) 不包含playwright，无法使用！

---

## 使用方法

### 方法1：直接命令（推荐）

```bash
# 使用专用Python运行
d:\python\python\python scripts\html_to_image.py --input="客户汇报.html"
```

### 方法2：通过技能调用

```bash
/skill html-to-png --input="HTML文件路径"
```

---

## 参数说明

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| --input | 是 | HTML文件路径 | "项目_海顿GEO/00_项目概览\客户汇报.html" |
| --output | 否 | 输出PNG路径 | "汇报截图.png" |
| --width | 否 | 内容宽度，默认1200px | 1200 |

---

## 快速使用

### 转换单个文件

```bash
d:\python\python\python scripts\html_to_image.py --input="客户汇报.html"
```

### 指定输出路径

```bash
d:\python\python\python scripts\html_to_image.py --input="客户汇报.html" --output="截图.png"
```

### 批量转换

```bash
d:\python\python\python scripts\html_to_image.py --input="项目_海顿/*.html"
```

---

## 功能特点

- ✅ 自动去除四周空白（上下底色+两边渐变背景）
- ✅ 只保留中间1200px宽度的白色内容区域
- ✅ 完整页面截图（自动滚动）
- ✅ 高清输出（playwright渲染）

---

## 技术要求

**必需的Python**：
```
d:\python\python\python   ✅ 正确（包含playwright）
python                    ❌ 错误（系统Python，不含playwright）
```

**已安装依赖**：
- playwright 1.52.0
- chromium浏览器

**检查命令**：
```bash
d:\python\python\python -c "import playwright; print(playwright.__version__)"
```

---

## 脚本位置

- **主脚本**：`scripts/html_to_image.py`
- **备用脚本**：`scripts/html_to_image_selenium.py`

---

## 手动截图方法（备用）

如果自动转换失败，使用浏览器开发者工具：

**Chrome/Edge浏览器：**

1. 双击打开HTML文件
2. 按 `F12` 打开开发者工具
3. 按 `Ctrl+Shift+P` 打开命令面板
4. 输入 `screenshot`
5. 选择 `Capture full size screenshot`

**或使用快捷键**：
- `Win+Shift+S` - Windows截图工具
- `Alt+A` - QQ/微信截图
