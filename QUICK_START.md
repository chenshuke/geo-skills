# GEO 技能包快速上手指南

## 前置条件

| 条件 | 说明 |
|------|------|
| **Claude Code** 或 **Obsidian + Claude** | 技能运行环境（二选一） |
| **Python 3.8+** | 执行 API 调用和数据处理脚本 |
| **pip** | Python 包管理器 |

## 安装步骤

### 1. 复制技能包到技能目录

```bash
# Claude Code
cp -r geo-topic-expand/ ~/.claude/skills/

# 或 Obsidian
cp -r geo-topic-expand/ <你的Obsidian库路径>/.claude/skills/
```

### 2. 安装 Python 依赖

```bash
cd ~/.claude/skills/geo-topic-expand
pip install -r requirements.txt
```

### 3. 安装可选依赖（按需）

```bash
# 本地封面生成（渐变背景+标题文字、预设模板）
pip install Pillow

# 飞书同步功能
pip install baseopensdk
```

## 配置 API 密钥

编辑 `geo-config/geo-config.json`，填入真实的 `openKey`：

```json
{
  "openKey": "你的真实openKey",
  "baseUrl": "https://nbgeo.aimusiclj.com",
  "referer": "https://geo.bihuoai.com",
  "defaults": {
    "companyId": 0,
    "productId": 0
  }
}
```

> `companyId` 和 `productId` 保持为 0 即可，首次运行时会自动引导选择。

## 首次运行

在 Claude Code 或 Obsidian + Claude 中执行：

```
/geo-hub
```

或

```
/geo-workflow-hub
```

系统会自动执行配置引导流程：
1. 调用 API 获取公司列表 -> 选择 `companyId`
2. 调用 API 获取产品列表 -> 选择 `productId`
3. 将选择结果写入 `geo-config.json`

配置完成后即可正常使用所有功能。

## 完整工作流演示

以一个新品牌从零开始的完整流程为例：

### Step 1: 创建品牌

```
/geo-workflow-hub brand
```

- 选择品牌类型（企业/产品/个人/获客）
- 填写品牌名称、行业、描述等信息
- 系统自动在 GEO 平台创建品牌档案

### Step 2: 搭建知识库

```
/geo-workflow-hub knowledge
```

- 自动创建标准 8 目录结构（00_项目概览/ ~ 07_监测分析/）
- 导入品牌基础知识文档
- 搭建三级关键词体系（L1核心词 -> L2拓展词 -> L3长尾问题）
- 确认知识库结构与内容完整

### Step 3: 内容创作

```
/geo-workflow-hub content
```

按顺序执行以下子步骤：

1. **关键词规划** - 基于 L1/L2/L3 体系规划内容方向
2. **标题生成** - 按照榜单型公式生成标题（含年份 2026）
3. **内容创作** - 按标准档（1000-2000字）撰写文章
4. **内容审核** - 检查 SEO 合规性和质量标准
5. **内容优化** - 根据审核结果调整优化

### Step 4: 文件治理

```
/geo-workflow-hub archive
```

- 检查目录结构合规性（所有文件是否在标准位置）
- 自动归位散落文件到对应的 00~07 标准目录
- 确保项目结构整洁统一

### Step 5: 上传文章到平台

```
/geo-hub article
```

- 将创作完成的文章上传至 GEO 平台
- 上传配套图片素材（需符合 OSS 文件名规范）

### Step 6: 收录检测

```
/geo-hub indexing
```

- 检测文章在 9 大 AI 平台的收录情况
- 查看上榜率、排名等关键指标
- 根据检测结果进行后续优化

### Step 7: 数据分析

```
/geo-workflow-hub analysis
```

- 证据链分析、平台逆向工程
- 项目仪表盘生成
- 根据分析结果制定优化策略

> **完整推荐工作流**：品牌创建 → 知识库搭建 → 内容创作 → 文件治理 → 上传平台 → 收录检测 → 数据分析，7 个步骤闭环运营。

## 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| **401 错误** | `openKey` 过期或无效 | 登录 GEO 管理平台重新获取 openKey，更新 `geo-config.json` |
| **companyId 为 0** | 首次使用未完成配置 | 重新执行 `/geo-hub` 或 `/geo-workflow-hub`，按引导选择 |
| **图片上传失败** | OSS 权限不足或文件名不合规 | 检查文件名是否仅含英文/数字/._-，确认 OSS 预签名获取成功 |
| **飞书同步失败** | 缺少飞书依赖或 Token 配置错误 | 安装 `baseopensdk`，检查 `.env` 中的 `APP_TOKEN`、`PERSONAL_BASE_TOKEN`、`TABLE_KEYWORDS` 是否正确 |
| **AI 图片生成失败** | 芳信 API Key 未配置 | 将 API Key 存放于 `~/.geo-skills/credentials/fangxin_image_api_key`（也可通过 `shared/credentials.py` 统一管理） |
| **收录检测超时** | AI 平台响应慢或网络不稳定 | 重试或分批检测，避免一次检测过多问题 |

更多问题请参阅 [FAQ.md](./FAQ.md)。
