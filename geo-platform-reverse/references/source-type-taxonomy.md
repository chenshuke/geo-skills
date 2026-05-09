# 来源类型分类体系

> 本文档定义 `geo-platform-reverse` 和 `geo-evidence-chain` 共用的来源分类规则。
> 扩展自 `geo-evidence-chain` v1.0 的 8 类体系，新增 2 类（视频平台、问答/知道）。

---

## 10 类来源分类

### 分类总览

| # | 来源类型 | 权重 | 说明 | 典型域名模式 |
|---|---------|------|------|-------------|
| 1 | **专业垂直平台** | 0.28 | 行业垂直站点，专业领域权威来源 | pcauto, yiche, autohome, dongchedi, 58che |
| 2 | **权威媒体/新闻** | 0.24 | 主流新闻媒体，公共信任背书 | sohu, qq, 163, ifeng, people, xinhua, cctv |
| 3 | **论坛/社区** | 0.14 | 用户真实讨论，UGC 内容 | club.autohome, tieba, zhihu, tianya |
| 4 | **自媒体/公众号** | 0.10 | 微信生态深度内容 | mp.weixin.qq.com |
| 5 | **评测/导购** | 0.09 | 消费决策参考平台 | smzdm, chinapp, maigoo, rong360 |
| 6 | **百科/知识库** | 0.07 | 基础认知构建来源 | baike.baidu, wiki |
| 7 | **内容聚合/百家号** | 0.06 | 流量型聚合平台 | baijiahao, toutiao, jd, taobao |
| 8 | **品牌官网** | 0.05 | 品牌自有阵地 | 从 `--brand-domains` 参数读取 |
| 9 | **视频平台** | 0.04 | 视频类内容来源 | douyin, bilibili, kuaishou, youtube, ixigua |
| 10 | **问答/知道** | 0.03 | 问答类知识来源 | zhidao.baidu, wenda.so, ask |

> **权重说明**：权重反映该来源类型对 AI 平台引用决策的"典型影响力"。不同平台对不同类型来源的实际 indexed 率可能不同，权重仅为参考基准。

---

## 分类规则

### 分类优先级（从高到低）

1. **URL 精确模式匹配**（最高优先级）
   - 如 `mp.weixin.qq.com` → 自媒体/公众号
   - 如 `club.autohome.com.cn` → 论坛/社区

2. **父域名匹配**
   - 如 `news.sohu.com` → 提取 `sohu.com` → 权威媒体/新闻
   - 如 `post.smzdm.com` → 提取 `smzdm.com` → 评测/导购

3. **URL 路径模式匹配**
   - 如 `xxx.com/baike/` → 百科/知识库
   - 如 `xxx.com/video/` → 视频平台

4. **品牌域名匹配**
   - 如果 URL 域名在 `--brand-domains` 参数中 → 品牌官网

5. **兜底归类**
   - 以上均不匹配 → 其他/未知（不纳入 10 类统计，单独记录）

### 域名匹配表

#### 1. 专业垂直平台

| 域名模式 | 行业 | 备注 |
|---------|------|------|
| `pcauto.com.cn` | 汽车 | 太平洋汽车 |
| `yiche.com` | 汽车 | 易车 |
| `autohome.com.cn` | 汽车 | 汽车之家（主站） |
| `dongchedi.com` | 汽车 | 懂车帝 |
| `58che.com` | 汽车 | 58车 |
| `xcar.com.cn` | 汽车 | 爱卡汽车 |
| `auto.sohu.com` | 汽车 | 搜狐汽车（归入汽车垂类） |
| `dcdapp.com` | 汽车 | 懂车帝App |

> **行业扩展**：当用于非汽车行业时，需补充该行业的垂直平台域名。

#### 2. 权威媒体/新闻

| 域名模式 | 层级 | 备注 |
|---------|------|------|
| `xinhua.com` / `news.cn` | 央媒 | 新华社 |
| `people.com.cn` | 央媒 | 人民网 |
| `cctv.com` | 央媒 | 央视 |
| `gov.cn` | 政府 | 政府网站 |
| `sohu.com` | 门户 | 搜狐 |
| `qq.com` | 门户 | 腾讯 |
| `163.com` | 门户 | 网易 |
| `ifeng.com` | 门户 | 凤凰网 |
| `sina.com.cn` | 门户 | 新浪 |
| `thepaper.cn` | 媒体 | 澎湃新闻 |
| `bjnews.com.cn` | 媒体 | 新京报 |
| `caixin.com` | 媒体 | 财新 |

#### 3. 论坛/社区

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `club.autohome.com.cn` | 汽车 | 汽车之家论坛 |
| `tieba.baidu.com` | 综合 | 百度贴吧 |
| `zhihu.com` | 综合 | 知乎 |
| `tianya.cn` | 综合 | 天涯 |
| `bbs.pcauto.com.cn` | 汽车 | 太平洋汽车论坛 |
| `xcar.com.cn/bbs` | 汽车 | 爱卡论坛 |

#### 4. 自媒体/公众号

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `mp.weixin.qq.com` | 微信 | 微信公众号文章 |

> 目前仅元宝平台引用微信公众号。

#### 5. 评测/导购

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `smzdm.com` | 导购 | 什么值得买 |
| `chinapp.com` | 品牌 | 品牌网 |
| `maigoo.com` | 排行 | 买购网 |
| `rong360.com` | 金融 | 融360 |
| `rank.uname.com` | 排行 | 各种排行榜站 |

#### 6. 百科/知识库

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `baike.baidu.com` | 百科 | 百度百科 |
| `wiki.zh.wikipedia.org` | 百科 | 维基百科 |

#### 7. 内容聚合/百家号

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `baijiahao.baidu.com` | 百家号 | 百度百家号 |
| `toutiao.com` | 头条 | 今日头条 |
| `jd.com` | 电商 | 京东 |
| `taobao.com` | 电商 | 淘宝 |
| `pinduoduo.com` | 电商 | 拼多多 |

#### 8. 品牌官网

从 `--brand-domains` 参数读取，不硬编码。

#### 9. 视频平台

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `douyin.com` | 短视频 | 抖音 |
| `bilibili.com` | 长视频 | B站 |
| `kuaishou.com` | 短视频 | 快手 |
| `youtube.com` | 长视频 | YouTube |
| `ixigua.com` | 视频 | 西瓜视频 |

#### 10. 问答/知道

| 域名模式 | 类型 | 备注 |
|---------|------|------|
| `zhidao.baidu.com` | 问答 | 百度知道 |
| `wenda.so.com` | 问答 | 360问答 |
| `ask.com` | 问答 | Ask |

---

## 分类流程伪代码

```
function classifySource(url, brandDomains):
    domain = extractDomain(url)          // 如 "news.sohu.com"
    parentDomain = extractParentDomain(domain)  // 如 "sohu.com"

    // 1. 精确模式匹配
    if domain matches "mp.weixin.qq.com":
        return "自媒体/公众号"
    if domain matches "club.autohome.com.cn":
        return "论坛/社区"
    // ... 其他精确匹配

    // 2. 品牌域名匹配
    if parentDomain in brandDomains:
        return "品牌官网"

    // 3. 父域名匹配
    if parentDomain in ["sohu.com", "qq.com", "163.com", "ifeng.com", ...]:
        return "权威媒体/新闻"
    if parentDomain in ["pcauto.com.cn", "yiche.com", "autohome.com.cn", ...]:
        return "专业垂直平台"
    // ... 其他父域名匹配

    // 4. 兜底
    return "其他/未知"
```

---

## 扩展指南

### 添加新行业域名

当分析新行业时，在对应来源类型下添加域名：

1. 在域名匹配表中添加行
2. 标注行业标签
3. 在分类函数中添加匹配规则

### 添加新来源类型

如果发现新的来源类型（如小红书、播客等）：

1. 评估该类型的数量占比（建议 >2% 才独立分类）
2. 在 10 类基础上新增
3. 调整权重分配
4. 更新 `geo-evidence-chain` 的来源分类表

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-05-08 | 初始版本，基于 evidence-chain v1.0 的 8 类扩展为 10 类 |
