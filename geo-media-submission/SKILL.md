---
name: geo-media-submission
description: "GEO 媒体投稿技能。查询和筛选 GEO 平台可投稿媒体，展示媒体ID、名称、价格、平台、区域、分类、是否可带链接、案例、出稿率和AI收录标签；让用户选择文章和媒体后，预览单篇或批量投稿费用并创建投稿，最后回查投稿记录。Use when the user says 有哪些投稿平台、媒体投稿、新闻稿投放、选择媒体、按价格/地区/行业/AI标签筛选媒体、把文章投稿到媒体、批量投稿、查看投稿记录。写操作必须先预览并经用户确认。"
---

# GEO 媒体投稿

使用 `/v1/publication-media` 查询真实媒体库和创建投稿。不要用固定的媒体名称清单代替平台数据。

## 安全规则

1. 先按 `../geo-config/SKILL.md` 检查 openKey 和默认公司/产品。
2. 先列出媒体供用户选择，不擅自决定付费媒体。
3. 投稿前展示文章ID、媒体ID、单价、组合数和预计总价；没有 `--force` 只预览。
4. `aiIncluded` 是媒体库标签，不等于已通过客户自己的 GEO 监测验证；不得承诺 AI 一定引用。
5. 投稿后通过 `/v1/publication-media/publish` GET 回查记录，不能把下单成功写成发布成功。

## 常用命令

```bash
# 查询媒体
node geo-media-submission/scripts/media_submission.js --action list --limit 20

# 按条件筛选
node geo-media-submission/scripts/media_submission.js \
  --action list --taxonomy "财经商业" --area "上海" \
  --with-link true --ai-included "豆包" --max-price 300

# 查看可选枚举
node geo-media-submission/scripts/media_submission.js --action enums

# 投稿预览
node geo-media-submission/scripts/media_submission.js \
  --action submit --article-ids 101,102 --media-ids 2001,2002

# 用户确认后投稿
node geo-media-submission/scripts/media_submission.js \
  --action submit --article-ids 101,102 --media-ids 2001,2002 --force

# 查看投稿记录
node geo-media-submission/scripts/media_submission.js --action records --article-id 101
```

接口字段详见 `references/api.md`。

