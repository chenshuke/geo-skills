# Best GEO CLI 2 兼容说明

验证基线：2026-10-17，npm `best-geo@2.0.4`，Node.js 20 及以上。

## 平台执行入口

所有 `geo-*` 技能继续负责策略、写作、审核、分析和本地文件整理。需要查询或写入平台时，先读取同级 `best-geo/SKILL.md`，通过 CLI 当前 capability 和 guide 执行。

```bash
best-geo version --check
best-geo capabilities
best-geo guide list
best-geo guide get project
best-geo call projects.list
```

CLI 2 使用统一 `projectId`；不得把旧 `companyId`、`productId` 或默认值文件直接改名当作新项目 ID。必须从 `projects.list` 选择并验证。需要 `projectId` 的每次调用都显式传入它，全局目录按 schema 执行。

用户展示使用 `statusLabel` 等 Label；过滤和程序判断使用 schema 中的数值。批量写入应汇总所有 plan 摘要供用户确认，再 apply；任务排队不等于任务完成。

## 新能力

按实际需求读取一个 guide，能力清单以本机 CLI 输出为准：

- `indexing-query`：即时查询 AI 回答、引用来源和拆解词。
- `video`：数字人视频、智能剪辑及进度查询。
- `answer-card`：答案卡生成、导入及素材管理。
- `scheduled-monitor`：持续监测。
- `publication`：自媒体发布和媒体投稿。

## 旧包装脚本边界

部分仓库脚本仍是 CLI 1 的参数封装，尚未逐个适配 CLI 2。**不要运行包含公司/产品参数的旧包装脚本来操作 CLI 2**。使用本次随包发布的 `best-geo` 技能直接按当前 schema 调用；不要自动猜测参数映射，也不要回退旧接口。

本次同步发布本机已有内容规则更新、两层逆向分析和 CLI 2 官方技能。它不代表所有旧包装脚本已完成 CLI 2 迁移。回归测试只证明其对应本地逻辑，不能替代在线业务测试。

## 安装与授权

```bash
npm install --global best-geo@2.0.4
node upgrade-geo-skills.js
node upgrade-geo-skills.js --apply
best-geo auth status
```

升级器会一起安装 `best-geo` 和全部 `geo-*`。CLI 服务暂时不可达时应报告连通性异常，不把已安装的程序误判为缺失，不反复重装。授权只能通过本机 `best-geo auth login` 完成，不分发登录配置或密钥。
