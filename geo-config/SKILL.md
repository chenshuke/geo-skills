---
name: geo-config
description: GEO配置与凭证管理技能。Use this skill when setting up, viewing, updating, validating, or resetting GEO API credentials, base URL, referer, default companyId/productId, or the shared config at ~/.geo-skills/credentials/geo-config.json. Use geo-runtime for installation and dependency diagnostics.
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.2.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey

# GEO 配置管理

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

统一管理 GEO 平台的所有 API 配置信息，包括认证密钥、API 基础地址、Referer 来源、默认公司/产品 ID。所有 GEO 技能均从此模块读取配置，是整个 GEO 技能体系的配置基座。

---

## 通用安全规则

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。

---

## 能力总览

- 查看当前配置
- 更新 openKey（解决密钥失效问题）
- 更新默认 companyId / productId
- 重置为默认配置结构

---

## 配置文件

**路径**：`~/.geo-skills/credentials/geo-config.json`（用户级配置，Claude Code 与 Codex 共用；不要把真实密钥写进技能目录）

**模板**：
```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "your-openKey-here",
    "referer": "https://geo.bihuoai.com/"
  },
  "defaults": {
    "companyId": 0,
    "productId": 0
  }
}
```

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| geo.baseUrl | API 基础地址 | https://nbgeo.aimusiclj.com |
| geo.openKey | 接口密钥（管理平台 > 密钥管理 > 创建） | sk-xxxxxxxx |
| geo.referer | 请求来源标识 | https://geo.bihuoai.com/ |
| defaults.companyId | 默认公司 ID（0 表示未设置） | 从 API 获取 |
| defaults.productId | 默认产品 ID（0 表示未设置） | 从 API 获取 |

> openKey 获取方式：登录 GEO 管理平台 > 密钥管理 > 创建新密钥

首次初始化用户级配置模板（如当前环境支持 shell）：

```bash
python3 ../geo-runtime/scripts/doctor.py --init-config
```

---

## 统一认证方式

所有 GEO 技能使用相同的请求头：

```bash
curl -H "Authorization: Bearer ${geo.openKey}" \
     -H "Referer: ${geo.referer}" \
     "${geo.baseUrl}/v1/..."
```

配置读取方式：
```json
// 从 ~/.geo-skills/credentials/geo-config.json 读取
baseUrl = geo.baseUrl
openKey = geo.openKey
referer = geo.referer
companyId = defaults.companyId
productId = defaults.productId
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--action` | 操作类型：view / update / reset | 是 | view |
| `--openKey` | 新的接口密钥 | action=update 时建议 | - |
| `--referer` | 新的 Referer 来源 | 否 | https://geo.bihuoai.com/ |
| `--company-id` | 默认公司 ID | 否 | 0 |
| `--product-id` | 默认产品 ID | 否 | 0 |
| `--api-url` | API 基础地址 | 否 | https://nbgeo.aimusiclj.com |

---

## 执行步骤

### action=view（查看配置）

1. 读取 `~/.geo-skills/credentials/geo-config.json`
2. 展示当前配置信息（openKey 部分脱敏显示，如 `2ebd****b294d`）
3. 如果 companyId 或 productId 为 0，提示用户需要设置

### action=update（更新配置）

1. 读取当前 `~/.geo-skills/credentials/geo-config.json`
2. 更新指定配置项（仅更新用户指定的字段，其他保持不变）
3. 写回文件
4. 显示更新结果

### action=reset（重置配置）

1. 恢复默认配置结构（openKey 置空，companyId/productId 置 0）
2. 写入文件
3. 提示用户填入新的 openKey

---

## 配置引导规则（重要）

调用任何需要 API 的 GEO 技能前，**必须先完成配置引导**：

1. 从 `~/.geo-skills/credentials/geo-config.json` 读取 `geo.openKey`、`geo.baseUrl`、`geo.referer`
2. 检查 `defaults.companyId` 和 `defaults.productId` 是否为 0
3. 若为 0，调用 API 获取列表供用户选择：
   - `GET /v1/geo-company?page=1&limit=10` → 获取公司列表 → 用户选择 companyId
   - `GET /v1/geo-product?page=1&limit=10&companyId=${companyId}` → 获取产品列表 → 用户选择 productId
   > **注意**：这两个接口必须传 `page` 和 `limit` 参数，否则返回 NaN 错误
4. 将选择结果写回 `~/.geo-skills/credentials/geo-config.json` 的 `defaults` 字段
5. 后续子技能调用自动携带 companyId 和 productId

> **注意**：`geo-hub` 和 `geo-workflow-hub` 已内置此流程（Step 0），会自动执行。直接调用子技能时也需遵守此规则。

---

## 错误处理

| 错误码 | 含义 | 处理方式 |
|--------|------|---------|
| 401 / 403 | openKey 无效或过期 | 提示用户更新 openKey |
| 无响应 | baseUrl 不可达 | 提示用户检查网络和 baseUrl |

更新 openKey 时，直接对 AI 说：

```text
使用 geo-config，把我的 GEO openKey 更新为“新的openKey”，并更新到用户级配置文件。
```

---

## 注意事项

1. **密钥安全**：`~/.geo-skills/credentials/geo-config.json` 包含敏感信息，只保存在用户电脑；技能仓库中的 `geo-config/geo-config.json` 仅作为占位模板，不能写入真实密钥
2. **配置同步**：更新配置后，所有技能自动使用新值
3. **统一认证**：所有 GEO 技能共用 Bearer openKey + Referer 双重认证
4. **模板发布**：发布技能包时，openKey 会被自动替换为 `your-openKey-here`
5. **Python 脚本凭证**：所有 Python 脚本统一通过 `../geo-runtime/scripts/credentials.py` 加载凭证，支持三级回退（环境变量 > 用户级配置 > 技能包模板）。脚本开发者应先将 `../geo-runtime/scripts` 加入 Python path，再 `from credentials import get_geo_config, get_geo_headers`
