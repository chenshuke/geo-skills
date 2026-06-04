# 更新日志

本文件记录 GEO 技能包的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

---

## [3.3.0] - 2026-06-04

### 新增
- 新增 `GEO-SKILLS-EXECUTION-PROTOCOL.md` 和 `QUICK_COMMANDS.md`，统一不同 AI 模型/系统的默认执行方式。
- 新增 `geo-runtime/scripts/api_request.js`，作为跨平台、UTF-8 安全的通用 GEO API 调用工具，替代默认 curl 流程。
- 新增 `geo-config/scripts/setup_defaults.js`，用于学员首次安装后获取公司/产品列表并写入默认 `companyId/productId`。
- 新增 `geo-article/scripts/upload_article.js`，支持中文 Markdown UTF-8 检测、疑似乱码拦截、上传后回查。
- 新增 `geo-indexing/scripts/import_questions.js`，支持本地问题导入自定义 AI 收录任务、产品主题库，以及主题生成任务搜索问题选择插入。
- 新增 `geo-content-archive/scripts/project_paths.js`，统一所有 GEO 技能产物的标准输出路径，确保文件在创建时直接落到正确目录。

### 优化
- 文生图/封面默认使用 GEO `/v1/text-to-img`，默认 `model=v2`，不再使用本地 SVG 封面 fallback。
- `doctor.js` 增强 Node 版本、默认 companyId/productId、核心脚本语法和 API 连通性检查。
- 文生图轮询改为较短初始间隔 + 退避，减少等待体感同时控制 API 压力。
- 文档统一强调 Node/no-Python 默认路径、写操作 dry-run、GET/list 回查和中文上传防乱码。
- 所有会产出文件的 GEO 技能增加“输出归位硬规则”，要求知识库、关键词方案、标题方案、文章、审核记录、发布记录和分析报告直接写入项目标准目录。

### 修复
- 统一 JSON 请求头为 `application/json; charset=utf-8`，降低中文内容乱码风险。
- 修正 Windows/macOS 路径与 file URL 兼容问题说明。

## [3.2.0] - 2026-05-16

### 新增
- 新增 `geo-runtime` 技能，提供共享凭证读取、依赖诊断、安装完整性检查和 API 连通性检查。
- 新增 `geo-runtime/scripts/doctor.py`，支持 `--init-config` 与 `--check-api`。
- 新增用户级配置约定：`~/.geo-skills/credentials/geo-config.json`，供 Claude Code 与 Codex 共用。

### 优化
- 所有 `geo-*` 技能 frontmatter 增加跨客户端兼容说明、版本元数据和更精确的触发边界。
- 将 Claude/Codex 专属表述收敛为通用 Agent Skills 风格说明。
- 将内容生产脚本迁移到 `geo-content-production/scripts/`，并在 `geo-content/scripts/` 保留兼容包装器。
- README 与 QUICK_START 改为“直接复制/软链接所有 `geo-*` 文件夹”的安装方式。

### 修复
- 修复 `generate_image.py` 中的语法错误。
- 将真实凭证位置从技能目录改为用户级目录，降低学员升级和公开仓库泄密风险。

---

## [3.0.0] - 2026-05-08

### 重构
- 59 个子技能合并为 9 个功能模块
- 双入口架构：geo-hub（平台操作）+ geo-workflow-hub（运营工作流）
- 新增 geo-content-archive 内容归档模块
- 统一目录结构，每个模块独立目录

### 新增
- `geo-runtime/scripts/credentials.py` 统一凭证管理
- `QUICK_START.md` 快速上手指南
- `GEOSSARY.md` GEO 术语表
- `FAQ.md` 常见问题
- `CHANGELOG.md` 更新日志
- `LICENSE` MIT 许可证
- `requirements.txt` Python 依赖清单
- 配置引导流程（自动选择 companyId/productId）

### 修复
- 修复 `publish-geo-skills.sh` 中 openKey 硬编码安全问题
- 清理 `data-source-mapping.md` 中的真实客户数据
- 脱敏处理个人路径、Hermes 标识、服务器路径

---

## [2.1.0] - 2026-04-XX

### 新增
- 完整 GEO 运营技能体系（58 个子技能）
- geo-hub 平台操作入口
- geo-workflow-hub 运营工作流入口
- 收录检测支持 9 大 AI 平台
- 内容发布支持 8 个外部媒体平台
