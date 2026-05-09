---
name: bihuo-geo-quotation
description: 必火GEO品牌报价单与服务方案制作技能。用于为必火GEO制作各类报价单PDF和服务清单，包括：GEO代运营服务报价单（¥9800）、GEO培训报名单（¥2980）、新媒体基建服务报价单（¥9800）、双方案融合报价单、企业端全案服务清单。使用场景：用户要求制作/修改/更新必火GEO相关报价单、服务方案文档、价格表、全案清单时使用。
---

# 必火GEO 报价单制作技能

## 已有文档清单

| 文档 | 模版文件 | 输出文件名 |
|------|---------|-----------|
| GEO代运营服务报价单（¥9800） | `templates/geo_service_template.html` | 必火GEO服务报价单_9800.pdf |
| GEO培训报名单（¥2980） | `templates/geo_training_template.html` | 必火GEO训练营报名单_2980.pdf |
| 双方案融合报价单 | `templates/geo_combined_template.html` | 必火GEO服务报价单（完整版）.pdf |
| 新媒体基建服务报价单（¥9800） | `templates/geo_media_template.html` | 必火GEO新媒体基建服务报价单_9800.pdf |
| 企业端全案服务清单 | `templates/geo_fullcase_template.html` | 必火GEO企业端全案服务清单.pdf |

## 品牌规范

读取 `references/brand_design.md` 获取完整设计规范。核心要点：
- **主色**：`#BC1F1A`（必火红）
- **页面宽度**：960px 固定
- **Logo**：`templates/logo.png`，使用前转为 base64 内联
- **字体**：PingFang SC / Microsoft YaHei / Noto Sans CJK SC

## 服务内容

读取 `references/service_content.md` 获取所有服务的完整文案、价格、规格参数。

## 工作流程

### 修改现有报价单

1. 读取对应 `templates/*.html` 文件
2. 用 `file` 工具的 `edit` 动作修改内容
3. 用 `html_to_pdf.js` 生成 PDF（见下方）

### 新建报价单

1. 参考现有模版的 HTML 结构（读取最相似的模版）
2. 用 Python 脚本生成 HTML（将 logo 转为 base64 内联）
3. 生成 PDF

### PDF生成命令

```bash
# 通用方式（推荐）
cd ./bihuo-geo-quotation
node ./scripts/html_to_pdf.js <input.html> <output.pdf>
```

或使用内联 Node.js 脚本（puppeteer-core 需要预先安装 (`npm install puppeteer-core`)

```javascript
// 关键：先获取内容高度，再注入 @page 尺寸，使用 preferCSSPageSize: true
const h = await page.evaluate(() => document.body.scrollHeight);
await page.evaluate((h) => {
  const s = document.createElement('style');
  s.textContent = `@page { size: 960px ${h + 20}px; margin: 0; }`;
  document.head.appendChild(s);
}, h);
const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true, margin: {top:0,right:0,bottom:0,left:0} });
```


### Logo 内联方式

```python
import base64
skill_dir = './bihuo-geo-quotation'
with open(f'{skill_dir}/templates/logo.png', 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode()
logo_src = f'data:image/png;base64,{logo_b64}'
```

## HTML 结构规范

所有报价单遵循统一结构：

```
Header（红色渐变背景 + Logo + 标题 + 描述）
  ↓
承诺横幅 / 流程横幅（深色背景，关键指标）
  ↓
主体内容区（白色卡片，左侧红色STEP编号条）
  ↓
底部保障区（红色渐变背景，四格保障卡片）
  ↓
Footer（深色背景，品牌信息）
```

## 常见修改场景

| 需求 | 操作 |
|------|------|
| 修改价格 | 搜索价格数字，同时更新 Header 徽章和价格卡片 |
| 修改服务项数量（如问题词数量） | 搜索对应数字，同步修改表格和横幅 |
| 修改承诺文案 | 搜索原文案，同步修改横幅和服务内容第1条 |
| 修改交付天数 | 搜索天数，同步修改横幅、保障卡片、服务描述 |
| 替换 Logo | 将新 logo 转为 base64，替换 HTML 中 `data:image/png;base64,...` |
| 新增服务模块 | 复制现有 `.module-card` 结构，修改内容 |
