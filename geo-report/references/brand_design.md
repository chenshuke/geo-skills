# 必火GEO 品牌设计规范

## 品牌色彩

| 用途 | 色号 | 说明 |
|------|------|------|
| 主色 | `#BC1F1A` | 必火红，所有主要区块背景、强调色 |
| 深红渐变 | `#BC1F1A → #6e0c09` | Header背景渐变 |
| 暗红底色 | `#1a0808` | 深色区块（流程横幅、底部总结） |
| 浅红背景 | `#fdf5f5` | 卡片浅色底、标签背景 |
| 边框色 | `#f0e4e4` / `#f0d0ce` | 卡片边框、分割线 |
| 强调文字 | `#FFD4D3` | 深色背景上的红色文字 |

## Logo

- 文件路径：`templates/logo.png`（必火AI火焰图标，红底白字）
- 使用场景：Header右上角，圆角矩形，尺寸约70×70px
- 嵌入方式：转为base64后内联到HTML（避免文件路径依赖）

```python
import base64
with open('templates/logo.png', 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode()
logo_src = f'data:image/png;base64,{logo_b64}'
```

## 字体

- 中文：PingFang SC → Microsoft YaHei → Noto Sans CJK SC
- 英文：同上（系统字体）
- 标题字重：900（font-weight: 900）
- 正文字重：400/600

## 页面尺寸

- 宽度：960px（固定）
- 高度：由内容自动决定（使用 `html_to_pdf.js` 脚本自动计算）
- 边距：0（全出血设计）

## 视觉元素

- 圆角：卡片 16px，徽章 8px，标签 5-6px
- 阴影：`0 3px 16px rgba(188,31,26,0.07)`（卡片），`0 6px 24px rgba(0,0,0,0.25)`（Logo）
- 装饰圆：Header内用半透明白色圆形（`rgba(255,255,255,0.05)`）
- 斜切装饰：Header右侧用 `clip-path: polygon` 创建斜切暗色块

## 英文装饰文字

Header和各区块右侧常用小写英文作为装饰标注，字号9-10px，颜色`rgba(255,255,255,0.3)`或`#ccc`：
- `BIHUO GEO · NEW MEDIA INFRASTRUCTURE · STEP 02`
- `SERVICE QUOTATION`
- `PLATFORM SETUP`、`DIGITAL HUMAN VIDEO`、`SERVICE SCOPE`
