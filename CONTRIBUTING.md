# 必火 GEO Skills 协作指南

## 推荐权限模型

- 仓库所有者：负责仓库设置、发布和敏感变更。
- GEO Maintainers：`Maintain`，负责日常合并、Issue 和发布准备。
- GEO Contributors：`Write`，负责通过分支和 Pull Request 提交代码。
- 课程/交付同事：`Read` 或 `Triage`，可以查看、提 Issue、参与评审，但不能直接改 `main`。

## 开发流程

1. 从最新 `main` 创建分支，例如 `feat/cli-migration`、`fix/indexing-schema`。
2. 只修改与任务相关的技能和文档，不直接提交学员密钥、平台地址或本机路径。
3. 本地运行：

   ```bash
   find geo-* -path '*/scripts/*.js' -type f -print0 | xargs -0 -n1 node --check
   git diff --check
   node geo-runtime/scripts/doctor.js --json
   node geo-runtime/scripts/regression_publication_chain.js
   ```

4. 涉及平台能力时只做 CLI 只读调用或 `--dry-run`；不要把真实上传、发布、删除写入 CI。
5. 提交 Pull Request 到 `main`，填写变更范围、测试结果、是否影响学员升级器。
6. 至少一名维护者审核后再合并。涉及 `upgrade-geo-skills.js`、认证说明或安装流程的改动，必须由仓库所有者复核。

## 发布与学员升级

`main` 是开发和可审查来源；学员安装使用已验证的 Release/tag 或仓库中的 `upgrade-geo-skills.js`。合并后先通过 CI，再由维护者创建版本标签并通知学员升级。不要让学员直接跟踪未验证的开发分支。

升级器会先备份旧技能、清理旧 `geo-*`、安装新版，并在缺失时安装 `best-geo` CLI；它不会迁移旧平台密钥。
