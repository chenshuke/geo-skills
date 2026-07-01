---
name: geo-skill-evolution
description: "GEO 技能自进化和经验沉淀技能，主要给内部团队/助教/交付负责人使用，暂不作为普通学员主入口。Use when the user says 技能自进化、把客户问题沉淀成技能、把行业差异沉淀、学员遇到新问题、复盘这次实操、把失败案例变成规则、更新技能前先做改进方案、生成回归测试、沉淀行业 playbook、不同客户/行业/学员问题不一样怎么办. Produces skill improvement proposals, regression tests, routing updates, safety checks, and GitHub release checklist; does not expose real customer names or Base URL."
---

# GEO 技能自进化

把客户、行业、学员在 GEO 实操中遇到的新问题，沉淀成可复用的技能改进：**问题样本 → 归因 → 应改哪个技能 → 脚本/说明/路由建议 → 回归测试 → 发布前验收**。

## 核心原则

- 本技能优先作为内部复盘/助教工具；普通学员遇到问题优先使用 `geo-troubleshooter`。
- 默认只做“改进方案 + 回归测试 + 发布清单”，不直接改生产技能；用户明确说“按方案更新技能”时再修改。
- 公开技能包不得出现真实客户/品牌名称、客户项目路径、真实 openKey、内部 Base URL、OSS 长签名图片 URL。
- 每个新问题都必须转成可复用资产，而不是只给一次性答复。
- 优先补脚本和测试，再补说明；能防止学员误操作的规则要写进协议和 quick commands。
- 改完必须跑回归测试，尤其是曾经踩坑的场景。

## 推荐脚本

脚本：`geo-skill-evolution/scripts/evolve.js`

### 记录一次新问题

```bash
node geo-skill-evolution/scripts/evolve.js \
  --symptom "某行业客户发布后 AI 提到了竞品但没有引用我方" \
  --industry "本地生活" \
  --learner-level "新手" \
  --evidence "answers.json,source_assets.csv" \
  --project-dir "项目_示例品牌GEO"
```

### 从错误日志生成技能改进方案

```bash
node geo-skill-evolution/scripts/evolve.js \
  --symptom "发布状态回查把图片 URL 当成 publishedUrl" \
  --evidence "publication_status.json,error.log" \
  --severity P0 \
  --project-dir "项目_示例品牌GEO"
```

输出到 `00_项目概览/技能进化/`：

- `geo_skill_evolution_YYYY-MM-DD_HHMMSS.md`：改进方案
- `geo_skill_evolution_YYYY-MM-DD_HHMMSS.json`：结构化记录
- `skill_evolution_backlog.csv`：长期问题池
- `regression_test_plan.md`：回归测试清单

## 标准输出格式

每次沉淀必须包含：

```text
## 新问题是什么
## 影响哪些用户/行业
## 根因假设
## 应该沉淀到哪个技能
## 需要改什么
## 建议修改文件
## 建议新增/更新测试
## 回归测试怎么做
## 发布前验收
## 是否需要人工确认
```

## 改进类型

| 类型 | 说明 | 常见目标 |
|---|---|---|
| `script-fix` | 脚本逻辑或 API 字段适配 | `geo-article` / `geo-publish` / `geo-indexing` |
| `routing-update` | 用户说法触发不到正确技能 | `geo-hub` / `geo-workflow-hub` |
| `troubleshooting-rule` | 失败原因需要新手友好诊断 | `geo-troubleshooter` |
| `workflow-pattern` | 多技能链路需要编排 | `geo-content-to-publish-pipeline` |
| `industry-playbook` | 行业差异需要方法论沉淀 | `geo-knowledge` / `geo-content-production` / `geo-analysis` |
| `safety-redaction` | 脱敏、客户名、Base URL、openKey 风险 | 全局协议 / 发布脚本 |
| `regression-test` | 历史坑需要固定样例测试 | `geo-runtime doctor` / 对应脚本 |

## 什么时候必须使用本技能

- 一个问题在 2 个以上客户/学员中重复出现。
- 学员容易把中间状态误判为最终结果。
- 新行业有明显不同的关键词、信源、平台引用模式。
- 现有技能能解决，但路径太隐蔽，新手不知道怎么做。
- 修了一个 P0/P1 bug，需要沉淀回归测试。

## 与其他技能配合

```text
geo-troubleshooter 发现问题
  ↓
geo-skill-evolution 归因并生成技能改进方案/回归测试
  ↓
用户确认后修改目标 geo-* 技能
  ↓
geo-runtime doctor + 回归样例验证
  ↓
publish-geo-skills.sh 发布
```
