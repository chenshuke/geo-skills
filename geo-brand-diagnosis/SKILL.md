---
name: geo-brand-diagnosis
description: GEO品牌AI诊断技能。Use this skill when the user wants to generate AI platform brand diagnosis questions from a brand knowledge base, analyze brand AI diagnosis data from Doubao/DeepSeek/Yuanbao/Kimi/Tongyi or other AI Q&A records, create a professional GEO brand diagnosis report, turn diagnosis into a GEO optimization issue list, and output Markdown and beautiful HTML versions; image versions should be created by manual screenshot or AI image generation, not local HTML-to-PNG automation. Use for 品牌AI诊断问题生成、豆包问答诊断、GEO优化问题清单、竞品风险、知识库补充建议、AI是否认识/推荐品牌、品牌词/品类词/场景词/对比词测试等场景.
---

# GEO 品牌 AI 诊断技能

本技能支持两种模式：

1. **诊断问题生成模式**：用户只提供品牌资料/知识库、还没有 AI 平台回复时，先生成 5 个或 10 个品牌 AI 诊断问题，方便用户去豆包、DeepSeek、元宝、通义等平台测试。
2. **诊断报告生成模式**：用户提供「品牌资料/临时知识库 + AI 平台问答记录」后，生成专业 Markdown 诊断报告和精致 HTML 版本；图片版通过截图或 AI 图片生成另行处理。并调用图片生成能力

## 输入要求

根据资料完整度选择模式：

### 模式 A：只有品牌资料/知识库，没有 AI 平台回复

生成品牌 AI 诊断问题清单。至少需要：

```text
【品牌资料/临时知识库】
品牌/公司名：
所在城市/服务区域：
所属行业：
核心产品/服务：
目标客户：
客户主要痛点：
核心优势：
主要竞品/对标品牌：
公开链接：
```

### 模式 B：已有 AI 平台回复

生成完整诊断报告。至少需要两部分资料：

```text
【品牌资料/临时知识库】
品牌/公司名：
所在城市/服务区域：
所属行业：
核心产品/服务：
目标客户：
客户主要痛点：
核心优势：
典型案例/客户成果：
资质、荣誉、合作客户、媒体报道：
主要竞品/对标品牌：
官网/公众号/小红书/抖音/知乎等公开链接：
不能公开或不能乱说的内容：

【AI 平台问答记录】
问题1：
AI回答1：
...
```

如用户只有零散内容，先整理为上述两段，再诊断。

## 核心原则

- 只基于用户提供的品牌资料和 AI 问答记录分析。
- 不编造品牌事实、案例、数据、资质、合作客户或引用来源。
- 信息不足时明确写「资料不足，需要补充」。
- 诊断必须转成可执行动作，不能只做泛泛点评。
- 重点识别：AI 不知道、AI 说错、AI 不推荐、AI 推荐竞品、缺少信任证据、缺少转化承接。

## 标准工作流

### 0. 先判断输入状态

- 如果用户没有提供 AI 平台问答记录：进入**诊断问题生成模式**，不要假装已经完成诊断。
- 如果用户已经提供 AI 平台问答记录：进入**诊断报告生成模式**。
- 如果用户没有说明问题数量：课堂快速版默认生成 5 个；完整诊断版生成 10 个。

### 1. 读取详细提示词模板

读取：`references/diagnosis-prompts.md`。

### 1A. 诊断问题生成模式

基于品牌知识库生成问题清单，必须覆盖四类问题，并遵守「是否带品牌名」规则：

| 类型 | 用来测试什么 | 是否必须带品牌名 | 问题风格 |
|---|---|---|---|
| 品牌词 | AI 是否认识你、是否能清晰介绍你 | 必须带品牌名 | 像用户直接问“这个品牌是干嘛的/靠谱吗” |
| 品类词 | AI 在行业推荐中会不会提到你或同行 | 默认不带品牌名 | 像用户问“这个行业/品类推荐哪几家” |
| 场景词 | AI 在客户真实需求下会不会推荐你或同行 | 默认不带品牌名 | 像用户带身份、场景、痛点问“怎么选/找谁” |
| 对比词 | AI 如何比较你和竞品 | 必须带品牌名；有竞品时同时带竞品名 | 像用户问“A 和 B 怎么选/有什么区别” |

问题必须简单、口语、真实，避免课程化、营销化、过长、过度专业。

输出字段：

```text
序号｜问题类型｜建议提问问题｜这个问题测试什么｜我需要重点观察什么｜建议测试平台｜记录方式
```

比例建议：

- 5 个问题：1 个品牌词 + 1 个品类词 + 2 个场景词 + 1 个对比词。
- 10 个问题：2 个品牌词 + 3 个品类词 + 3 个场景词 + 2 个对比词。

问题生成后，同时输出「AI 平台问答记录模板」，方便用户测试后回填。

### 1B. 诊断报告生成模式

### 2. 生成 Markdown 报告

按模板输出完整 Markdown，建议保存为：

```text
品牌AI诊断报告.md
```

报告必须包含：

1. 执行摘要
2. 品牌 AI 诊断结论
3. 诊断评分雷达表
4. 主要问题清单
5. 竞品与风险分析
6. 知识库补充建议
7. GEO 内容机会
8. GEO 优化问题清单
9. P0/P1/P2 下一步行动
10. 资料不足与待确认事项

### 3. 生成 HTML

优先使用脚本：

```bash
node .claude/geo-skills-repo/geo-brand-diagnosis/scripts/render_geo_brand_diagnosis.js \
  --input 品牌AI诊断报告.md \
  --output-dir 输出目录 \
  --title "品牌 AI 诊断报告"
```

Node 脚本无 Python 依赖，默认只生成：

```text
品牌AI诊断报告.html
```

不再默认生成 PNG，避免学员电脑安装 Playwright/Chromium。需要图片版时，用浏览器/系统截图，或根据 `references/image-prompt.md` 调用 AI 图片生成技能。不再提供本地自动 HTML 转 PNG 脚本，避免额外环境配置。

### 4. 可选 AI 图片版

如果当前环境有 `imagegen` / `bihuo-ppt-imagegen` / 其他 AI 图片生成技能，额外生成一张「GEO 品牌诊断信息图/封面图」。

读取 `references/image-prompt.md`，基于诊断结论生成图片提示词。图片内容只做视觉总结，不添加未经验证的新事实。

## 输出命名建议

```text
{品牌名}_GEO品牌AI诊断报告.md
{品牌名}_GEO品牌AI诊断报告.html
{品牌名}_GEO诊断信息图提示词.md
```

## 质量自检

交付前检查：

- [ ] 是否明确写出 AI 当前如何看待品牌
- [ ] 是否区分了事实、推断、资料不足
- [ ] 是否识别竞品和竞品压制风险
- [ ] 是否输出 P0/P1/P2 优先级
- [ ] 是否把问题转成了知识库、内容、信源、转化动作
- [ ] Markdown 表格是否完整
- [ ] HTML 是否可打开且样式正常
- [ ] 如用户需要图片版，是否已提供截图建议或 AI 图片提示词
