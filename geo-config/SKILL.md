---
name: geo-config
description: "GEO 配置和首次开通向导技能。Use when the user says 配置/更新 openKey/API 密钥、自动识别 Base URL/referer、设置 baseUrl/referer、获取公司和产品列表、设置 companyId/productId、companyId 为 0、productId 为 0、首次安装后配置账号、创建公司、创建产品、选择默认公司/产品、查看或重置 ~/.geo-skills/credentials/geo-config.json. Do not use for article upload or publishing."
license: MIT
compatibility: Works with Claude Code, Codex, and other Agent Skills-compatible clients when all sibling geo-* skill folders are installed together.
metadata:
  suite: geo-skills
  version: "3.3.0"
  category: api
---

> **外部依赖**: GEO 平台 openKey

# GEO 配置管理

> **通用兼容**：适用于 Claude Code、Codex 和兼容 Agent Skills 的工具；建议完整安装同级 `geo-*` 技能，运行诊断请使用 `../geo-runtime/SKILL.md`。

统一管理 GEO 平台的所有 API 配置信息，包括认证密钥、API 基础地址、Referer 来源、默认公司/产品 ID。所有 GEO 技能均从此模块读取配置，是整个 GEO 技能体系的配置基座。

---

## 通用安全规则

## Base URL 输出规则

- Base URL 属于内部接口配置：脚本可以读取、测试和写入配置文件，但默认回复、日志、dry-run、JSON 预览中不得展示具体 Base URL。
- 用户侧可以展示 Referer、脱敏 openKey、companyId/productId、接口路径（如 `/v1/geo-company`），但不要展示接口域名。
- 用户只提供 openKey 时，先调用 `geo-config/scripts/configure_openkey.js` 自动识别平台接口与 Referer。

- 真实 openKey 只能读取自 `~/.geo-skills/credentials/geo-config.json` 或环境变量，回复和日志中必须脱敏展示。
- 删除、发布、批量导入、覆盖配置等操作必须先展示预览，并等待用户明确确认。
- 支持 dry-run / preview 时优先使用 dry-run / preview。
- 写入或删除 GEO API 数据后，必须通过对应 GET/list 接口回查确认，不只相信 POST/DELETE 返回值。
- 有专用 Node 脚本时优先使用脚本；没有专用脚本时使用 `geo-runtime/scripts/api_request.js`，`curl` 只作为低级调试，不作为中文正文或批量写操作默认方案。

---

## 能力总览

- 查看当前配置
- 更新 openKey（解决密钥失效问题）
- 自动识别 Base URL + Referer：自动测试新旧 Base URL，并优先测试 `https://geo.bihuogeo.com`，失败后回退 `https://geo.bihuoai.com`
- 更新默认 companyId / productId
- 首次使用时自动获取公司/产品列表，引导学员选择并写入 defaults
- 如果账号下没有公司/产品，可在用户确认后创建公司和产品
- 重置为默认配置结构

---

## 配置文件

**路径**：`~/.geo-skills/credentials/geo-config.json`（用户级配置，Claude Code 与 Codex 共用；不要把真实密钥写进技能目录）

**模板**：
```json
{
  "geo": {
    "baseUrl": "<内部接口地址>",
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
| geo.baseUrl | API 基础地址 | 内部自动识别，不对用户展示 |
| geo.openKey | 接口密钥（管理平台 > 密钥管理 > 创建） | sk-xxxxxxxx |
| geo.referer | 请求来源标识 | https://geo.bihuoai.com/ |
| defaults.companyId | 默认公司 ID（0 表示未设置） | 从 API 获取 |
| defaults.productId | 默认产品 ID（0 表示未设置） | 从 API 获取 |

> openKey 获取方式：登录 GEO 管理平台 > 密钥管理 > 创建新密钥

### openKey 自动识别 Base URL + Referer（双平台无感适配）

当用户直接提供新的 openKey，且没有明确指定 Base URL / Referer 时，必须优先使用脚本自动测试 Base URL + Referer，而不是让用户手动判断：

```bash
# 相对于 GEO Skills Suite 根目录
node geo-config/scripts/configure_openkey.js --open-key '<用户提供的openKey>' --force
```

默认测试顺序：

Base URL 候选：

1. 当前配置中的 `baseUrl`
2. `<内部接口地址>`
3. `<内部接口地址>`

Referer 候选：

1. `https://geo.bihuogeo.com`
2. `https://geo.bihuoai.com`

脚本使用 `GET /v1/geo-company?page=1&limit=1` 验证 openKey + Base URL + Referer 组合是否可用；第一个成功的组合会写入 `~/.geo-skills/credentials/geo-config.json`。

安全要求：

- 回复和日志中只能展示脱敏后的 openKey。
- 如果 openKey、Base URL 或 Referer 发生变化，默认将 `defaults.companyId/productId` 重置为 `0`，避免沿用另一个平台的公司/产品 ID。
- Base URL + Referer 识别成功后，继续执行 `setup_defaults.js --list` 或 `--auto` 获取并选择默认公司/产品。
- 如果所有 Base URL + Referer 组合都失败，提示用户检查 openKey、baseUrl 或平台白名单，不要编造配置。

可选预览：

```bash
node geo-config/scripts/configure_openkey.js --open-key '<用户提供的openKey>' --dry-run
```


### 多 openKey / 多平台 Profile

当用户有多个 openKey 时，不要反复覆盖同一个默认配置；优先把每个 openKey 保存成独立 profile：

```bash
# 为平台 A 保存一个 profile，并自动识别 Base URL/referer
node geo-config/scripts/configure_openkey.js --profile platform-a --open-key '<平台A openKey>' --force

# 为平台 B 保存一个 profile，并自动识别 Base URL/referer
node geo-config/scripts/configure_openkey.js --profile platform-b --open-key '<平台B openKey>' --force
```

profile 会保存到：

```text
~/.geo-skills/credentials/geo-config.platform-a.json
~/.geo-skills/credentials/geo-config.platform-b.json
```

后续调用任何 GEO 技能时，通过环境变量选择 profile：

```bash
GEO_PROFILE=platform-a node geo-config/scripts/setup_defaults.js --list
GEO_PROFILE=platform-b node geo-config/scripts/setup_defaults.js --list
```

如果不设置 `GEO_PROFILE`，仍然读取默认配置：

```text
~/.geo-skills/credentials/geo-config.json
```

Profile 规则：

- `GEO_PROFILE=<name>` 会读取 `~/.geo-skills/credentials/geo-config.<name>.json`。
- `GEO_CONFIG_FILE=/absolute/path/config.json` 优先级更高，可显式指定任意配置文件。
- 每个 profile 都有独立的 `openKey`、`referer`、`defaults.companyId`、`defaults.productId`。
- 用户只提供多个 openKey 但没给 profile 名时，AI 可以根据平台或用途命名，如 `bihuogeo`、`bihuoai`、`client-a`、`client-b`，但回复中不得展示完整 openKey。

首次初始化用户级配置模板（如当前环境支持 shell）：

```bash
node ../geo-runtime/scripts/doctor.js --init-config
```

首次选择默认公司和产品（推荐）：

```bash
# 相对于 GEO Skills Suite 根目录
node geo-config/scripts/setup_defaults.js --list
node geo-config/scripts/setup_defaults.js --company-id <公司ID> --product-id <产品ID> --force

# 如果账号下只有一个公司/产品，可以自动写入
node geo-config/scripts/setup_defaults.js --auto
```

如果账号没有公司或产品，也可以先预览再创建：

```bash
# 创建公司预览
node geo-config/scripts/setup_defaults.js \
  --create-company \
  --company-name "公司名" \
  --company-description "公司描述" \
  --dry-run

# 创建产品预览
node geo-config/scripts/setup_defaults.js \
  --create-product \
  --company-id <公司ID> \
  --product-name "产品名" \
  --keywords "关键词1,关键词2" \
  --target-words "目标词1,目标词2" \
  --product-type 1 \
  --dry-run
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
| `--api-url` | API 基础地址 | 否 | 内部参数，默认自动识别 |

---

## 执行步骤

### action=view（查看配置）

1. 读取 `~/.geo-skills/credentials/geo-config.json`
2. 展示当前配置信息（openKey 部分脱敏显示，如 `2ebd****b294d`）
3. 如果 companyId 或 productId 为 0，提示用户需要设置

### action=update（更新配置）

1. 读取当前 `~/.geo-skills/credentials/geo-config.json`
2. 如果用户提供了 openKey 但没有明确指定 referer：
   - 运行 `node geo-config/scripts/configure_openkey.js --open-key '<用户提供的openKey>' --force`
   - 脚本自动测试当前 Base URL、`<内部接口地址>`、`<内部接口地址>`
   - 每个 Base URL 下先测试 `https://geo.bihuogeo.com`，失败后回退 `https://geo.bihuoai.com`
   - 识别成功后写回 `openKey`、`baseUrl`、`referer`，并将 defaults 重置为 `0/0`
3. 如果用户明确指定了 referer/baseUrl/companyId/productId，则仅更新用户指定字段
4. 写回文件
5. 显示更新结果（openKey 必须脱敏）

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

### 学员首次安装后的主动处理

学员刚安装技能时，`companyId/productId` 通常都是 `0`。AI 助手不要让学员手猜 ID，应主动执行：

```bash
node geo-config/scripts/setup_defaults.js --list
```

然后把返回的公司/产品列表展示给学员选择；学员选择后执行：

```bash
node geo-config/scripts/setup_defaults.js --company-id <公司ID> --product-id <产品ID> --force
```

如果公司和产品都只有一个，可直接执行：

```bash
node geo-config/scripts/setup_defaults.js --auto
```

脚本会把选择结果写入用户级配置 `~/.geo-skills/credentials/geo-config.json`，后续所有 GEO 技能自动使用。

如果没有可用公司或产品，AI 助手可以引导学员创建，但必须先 dry-run 展示 payload，等待学员确认后再执行 `--force`：

```bash
# 创建公司
node geo-config/scripts/setup_defaults.js \
  --create-company \
  --company-name "公司名" \
  --company-description "公司描述" \
  --force

# 创建产品并写入 defaults
node geo-config/scripts/setup_defaults.js \
  --create-product \
  --company-id <公司ID> \
  --product-name "产品名" \
  --keywords "关键词1,关键词2" \
  --target-words "目标词1,目标词2" \
  --product-type 1 \
  --force
```

产品创建需要的信息来自平台接口 `POST /v1/geo-product`：`name`、`keyword[]`、`type`、`targetWord[]`、`companyId`。如果学员不确定这些字段，先让学员确认产品名、核心关键词和目标词，不要替学员编造。

---

## 错误处理

| 错误码 | 含义 | 处理方式 |
|--------|------|---------|
| 401 / 403 | openKey 无效或过期 | 提示用户更新 openKey |
| 无响应 | baseUrl 不可达 | 提示用户检查网络和 baseUrl |

更新 openKey 时，直接对 AI 说：

```text
使用 geo-config，把我的 GEO openKey 更新为“新的openKey”，并自动识别 Base URL 和 Referer。
```

AI 助手收到 openKey 后应自动执行 `configure_openkey.js`，自动测试 Base URL + Referer 组合；当前支持新平台 `<内部接口地址>` 和旧平台 `<内部接口地址>`。

---

## 注意事项

1. **密钥安全**：`~/.geo-skills/credentials/geo-config.json` 包含敏感信息，只保存在用户电脑；技能仓库中的 `geo-config/geo-config.json` 仅作为占位模板，不能写入真实密钥
2. **配置同步**：更新配置后，所有技能自动使用新值
3. **统一认证**：所有 GEO 技能共用 Bearer openKey + Referer 双重认证
4. **模板发布**：发布技能包时，openKey 会被自动替换为 `your-openKey-here`
5. **无 Python 凭证读取**：新脚本统一通过 `../geo-runtime/scripts/credentials.js` 加载凭证，支持环境变量 > 用户级配置。旧 Python 脚本仍可用 `credentials.py`，但学员端不再要求安装 Python。
