# 更新日志

本文件记录 GEO 技能包的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

---

## [3.0.0] - 2026-05-08

### 重构
- 59 个子技能合并为 9 个功能模块
- 双入口架构：geo-hub（平台操作）+ geo-workflow-hub（运营工作流）
- 新增 geo-content-archive 内容归档模块
- 统一目录结构，每个模块独立目录

### 新增
- `shared/credentials.py` 统一凭证管理
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
