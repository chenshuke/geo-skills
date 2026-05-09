---
type: geo-platform-profile
platform: {platform}
platform_name: {platform_name}
generated_by: geo-platform-reverse
generated_at: {YYYY-MM-DD}
data_source: {data_source}
sample_size: {sample_size}
date_range: "{date_range}"
industry: {industry}
confidence: {confidence}
version: v1.0
---

# {platform_name} 平台引用画像

> 生成时间：{YYYY-MM-DD}
> 数据基础：{sample_size}条收录结果（{data_source_desc}）
> 置信度：{confidence_text}
> 分析工具：geo-platform-reverse v1.0

---

## 1. 引用性格总览

| 属性 | 值 |
|------|-----|
| **性格标签** | {strategy_type} |
| **平均引用来源数** | {avg_sources}个 |
| **indexed采纳率** | {indexed_rate}% |
| **来源类型多样性** | {type_diversity}种/问题 |
| **偏好来源Top3** | {top3_types} |
| **不引用的来源类型** | {excluded_types} |
| **时效性偏好** | {timeliness_type}（{fresh_ratio}%） |
| **引用格式** | {citation_format} |

---

## 2. 来源类型分布

| 来源类型 | 出现次数 | 占比 | indexed次数 | indexed率 | 偏好度 |
|---------|---------|------|-----------|----------|--------|
| 专业垂直平台 | {v} | {v}% | {v} | {v}% | {v} |
| 权威媒体/新闻 | {v} | {v}% | {v} | {v}% | {v} |
| 论坛/社区 | {v} | {v}% | {v} | {v}% | {v} |
| 自媒体/公众号 | {v} | {v}% | {v} | {v}% | {v} |
| 评测/导购 | {v} | {v}% | {v} | {v}% | {v} |
| 百科/知识库 | {v} | {v}% | {v} | {v}% | {v} |
| 内容聚合/百家号 | {v} | {v}% | {v} | {v}% | {v} |
| 品牌官网 | {v} | {v}% | {v} | {v}% | {v} |
| 视频平台 | {v} | {v}% | {v} | {v}% | {v} |
| 问答/知道 | {v} | {v}% | {v} | {v}% | {v} |

> **偏好度定义**：indexed率 / 总体indexed率。>1.2 为**高**，0.8~1.2 为中，<0.8 为低。

---

## 3. 交叉验证模式

| 指标 | 值 | 解读 |
|------|-----|------|
| 平均来源数 | {v} | {interpretation} |
| indexed采纳率 | {v}% | {interpretation} |
| 类型多样性 | {v}种/问题 | {interpretation} |
| 域名多样性 | {v}个/问题 | {interpretation} |
| 同源重复率 | {v}% | {interpretation} |

**交叉验证策略**：{strategy_type}——{strategy_description}。

---

## 4. 问题类型→引用模式

| 问题类型 | 结果数 | 平均来源数 | indexed率 | 偏好来源类型Top3 | 特殊行为 |
|---------|--------|-----------|----------|----------------|---------|
| 品牌推荐 | {v} | {v} | {v}% | {v} | {v} |
| 品牌排名 | {v} | {v} | {v}% | {v} | {v} |
| 技术对比 | {v} | {v} | {v}% | {v} | {v} |
| 知识科普 | {v} | {v} | {v}% | {v} | {v} |
| 价格相关 | {v} | {v} | {v}% | {v} | {v} |
| 品牌评价 | {v} | {v} | {v}% | {v} | {v} |

---

## 5. 时效性分析

| 来源年份 | 占比 | indexed率 |
|---------|------|----------|
| 2026年 | {v}% | {v}% |
| 2025年 | {v}% | {v}% |
| 2024年及以前 | {v}% | {v}% |
| 无法判断 | {v}% | {v}% |

**时效性偏好**：{timeliness_type}——{timeliness_description}。

---

## 6. 引用格式

| 格式类型 | 使用频率 | 示例 |
|---------|---------|------|
| 脚注式 | {v}% | {example} |
| 内联式 | {v}% | {example} |
| 卡片式 | {v}% | {example} |
| 无标注 | {v}% | — |
| 混合式 | {v}% | — |

---

## 7. 权威信号

| 信号类型 | indexed率 | 与平均差异 |
|---------|----------|----------|
| .gov/.edu 域名 | {v}% | {+/-v}% |
| 央媒/国家级 | {v}% | {+/-v}% |
| 主流门户 | {v}% | {+/-v}% |
| 地方媒体 | {v}% | {+/-v}% |
| 自媒体/个人号 | {v}% | {+/-v}% |

---

## 8. Top 15 被引用域名

| 排名 | 域名 | 被引用次数 | indexed次数 | indexed率 |
|------|------|-----------|-----------|----------|
| 1 | {domain} | {v} | {v} | {v}% |
| 2 | {domain} | {v} | {v} | {v}% |
| 3 | {domain} | {v} | {v} | {v}% |
| 4 | {domain} | {v} | {v} | {v}% |
| 5 | {domain} | {v} | {v} | {v}% |
| 6 | {domain} | {v} | {v} | {v}% |
| 7 | {domain} | {v} | {v} | {v}% |
| 8 | {domain} | {v} | {v} | {v}% |
| 9 | {domain} | {v} | {v} | {v}% |
| 10 | {domain} | {v} | {v} | {v}% |
| 11 | {domain} | {v} | {v} | {v}% |
| 12 | {domain} | {v} | {v} | {v}% |
| 13 | {domain} | {v} | {v} | {v}% |
| 14 | {domain} | {v} | {v} | {v}% |
| 15 | {domain} | {v} | {v} | {v}% |

---

## 9. 平台特异性行为

- {unique_behavior_1}
- {unique_behavior_2}
- {unique_behavior_3}
- {unique_behavior_4}
- {unique_behavior_5}

---

## 10. 策略建议

### 对 GEO 发布的建议

1. {suggestion_1}
2. {suggestion_2}
3. {suggestion_3}
4. {suggestion_4}
5. {suggestion_5}

### 与 evidence-chain 的衔接

本画像文件可直接作为 `geo-evidence-chain --platform-profiles` 参数的输入，替代该技能第三步中的硬编码平台性格表。

使用方法：
```
/geo-workflow-hub evidence --company="品牌" --platform-profiles "06_策略/平台画像_{platform}_{YYYYMMDD}.md"
```

---

> 本画像由 `geo-platform-reverse` v1.0 自动生成。建议每季度更新一次。
