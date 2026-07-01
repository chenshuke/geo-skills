---
name: geo-troubleshooter
description: "GEO 故障排查和新手友好诊断技能。Use when the user says 排查失败、哪里出问题、为什么不能用、openKey 配错、companyId/productId 错、文章上传失败、发布任务创建成功但没有发布、发布状态人工处理、收录任务没跑完、answers 有数据但 matrix 没数据、searchedSites 有来源但 articleIndexed=false、AI 提到竞品不提我方、AI 推荐我方但引用源不是我方资产、下一步怎么处理、需要人工确认吗. Outputs fixed diagnosis format: 问题是什么/可能原因/证据在哪里/下一步怎么处理/是否需要人工确认."
---

# GEO 故障排查

把 GEO 技能执行中的失败或异常，转换成新手能理解的固定诊断：**问题是什么 → 可能原因 → 证据在哪里 → 下一步怎么处理 → 是否需要人工确认**。

## 核心原则

- 不替代具体业务技能；本技能只做诊断、分流和下一步建议。
- Base URL 不在回复、日志、报告或 dry-run 中展示；可以展示 Referer、脱敏 openKey、接口路径、文件路径。
- 先看证据再下结论：优先读取用户提供的错误日志、JSON 输出、发布状态表、answers/matrix/source-assets 文件。
- 对新手输出固定格式，不只说“失败了”，必须告诉他下一步做什么。

## 推荐脚本

脚本：`geo-troubleshooter/scripts/troubleshoot.js`

### 快速诊断

```bash
node geo-troubleshooter/scripts/troubleshoot.js \
  --symptom "发布任务创建成功但没有 publishedUrl" \
  --project-dir "项目_品牌GEO"
```

### 带证据文件诊断

```bash
node geo-troubleshooter/scripts/troubleshoot.js \
  --symptom "answers 有数据但 matrix 没数据" \
  --answers-json answers.json \
  --matrix-json matrix.json \
  --project-dir "项目_品牌GEO"
```

### 发布后链路诊断

```bash
node geo-troubleshooter/scripts/troubleshoot.js \
  --symptom "发布后查不到收录" \
  --publication-json "项目_品牌GEO/06_发布记录/发布状态回查/publication_status_YYYY-MM-DD.json" \
  --url-match-json "项目_品牌GEO/07_监测分析/收录监测/URL命中回查/published_url_match_YYYY-MM-DD.json" \
  --project-dir "项目_品牌GEO"
```

输出到 `00_项目概览/故障排查/`：

- `geo_troubleshooting_YYYY-MM-DD.md`
- `geo_troubleshooting_YYYY-MM-DD.json`

## 标准诊断格式

每个问题必须输出：

```text
## 问题是什么
## 可能原因
## 证据在哪里
## 下一步怎么处理
## 是否需要人工确认
```

## 常见场景路由

| 场景 | 优先证据 | 下一步技能 |
|---|---|---|
| openKey 配错 | `geo-runtime/scripts/doctor.js --json`、API 错误 | `geo-config` |
| companyId/productId 错 | doctor JSON、API 返回、文章/产品列表 | `geo-config` / `geo-account` |
| 文章上传失败 | `upload_article.js --json-out`、错误日志 | `geo-article` |
| 发布任务创建成功但没有发布 | publication status JSON | `geo-publish` |
| 发布状态是人工处理 | publication status JSON | `geo-publish` + 人工处理平台账号 |
| 查收录任务没有跑完 | scheduled runs/answers JSON | `geo-indexing` |
| answers 有数据但 matrix 没数据 | answers JSON + matrix JSON | `geo-indexing` |
| searchedSites 有来源但 `articleIndexed=false` | answers JSON / source-assets | `geo-source-assets` + `geo-content-production` |
| AI 提到竞品但不提我方 | answers JSON / geo-analysis 报告 | `geo-analysis` + `geo-content-production` |
| AI 推荐我方但引用源不是我方资产 | source-assets / answers JSON | `geo-source-assets` |

## 判断口径

- “发布任务已创建” ≠ “平台已发布”：必须拿到 `publishedUrl`。
- “平台已发布” ≠ “AI 已看见”：必须在 `searchedSites` 里精确 URL 命中，或至少有标题/账号弱命中。
- `searchedSites` 有来源但 `articleIndexed=false`：说明 AI 看到了来源，但没有把我方文章作为命中证据。
- AI 提到竞品不提我方：优先判断品牌存在感缺口，再补对比/替代/榜单型内容。
- AI 推荐我方但引用源不是我方资产：说明品牌被提及但证据链不受控，要补我方可控信源和媒体二次分发。
