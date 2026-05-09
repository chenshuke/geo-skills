---
name: geo-config
description: GEO平台配置管理工具，统一管理API认证信息、默认公司/产品ID等配置项
---

# GEO 配置管理

统一管理 GEO 平台的所有 API 配置信息，包括认证密钥、API 基础地址、默认公司/产品 ID。所有 GEO 技能均从此模块读取配置，是整个 GEO 技能体系的配置基座。

---

## 能力总览

- 查看当前配置
- 更新 openKey（解决密钥失效问题）
- 更新默认 companyId / productId
- 重置为默认配置结构

---

## 配置文件

**路径**：`geo-config/geo-config.json`（项目根目录）

**模板**：
```json
{
  "geo": {
    "apiBaseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "your-openKey-here",
    "defaultCompanyId": 36,
    "defaultProductId": 88
  }
}
```

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| geo.apiBaseUrl | API 基础地址 | https://nbgeo.aimusiclj.com |
| geo.openKey | 接口密钥（管理平台 > 密钥管理 > 创建） | sk-xxxxxxxx |
| geo.defaultCompanyId | 默认公司 ID | 36 |
| geo.defaultProductId | 默认产品 ID | 88 |

> openKey 获取方式：登录 GEO 管理平台 > 密钥管理 > 创建新密钥

---

## 统一认证方式

所有 GEO 技能使用相同的请求头：

```
Authorization: Bearer ${openKey}
Referer: https://geo.bihuoai.com/
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--action` | 操作类型：view / update / reset | 是 | view |
| `--openKey` | 新的接口密钥 | action=update 时建议 | - |
| `--company-id` | 默认公司 ID | 否 | 36 |
| `--product-id` | 默认产品 ID | 否 | 88 |
| `--api-url` | API 基础地址 | 否 | https://nbgeo.aimusiclj.com |

---

## 执行步骤

### action=view（查看配置）

使用 Read 工具读取 `geo-config.json`，展示当前配置信息。

### action=update（更新配置）

1. 读取当前 `geo-config.json`
2. 更新指定配置项
3. 写回文件
4. 显示更新结果

### action=reset（重置配置）

1. 恢复默认配置结构
2. 写入文件
3. 提示用户填入新的 openKey

---

## 配置引导规则（重要）

调用任何需要 API 的 GEO 技能前，**必须先完成配置引导**：

1. 从 `geo-config.json` 读取 `openKey`、`baseUrl`、`referer`
2. 检查 `defaultCompanyId` 和 `defaultProductId` 是否为 0
3. 若为 0，调用 API 获取列表供用户选择：
   - `GET /v1/geo-company` → 获取公司列表 → 用户选择 companyId
   - `GET /v1/geo-product` → 获取产品列表 → 用户选择 productId
4. 将选择结果写回 `geo-config.json` 的 `defaults` 字段
5. 后续子技能调用自动携带 companyId 和 productId

---

## 错误处理

当 API 返回 401 或 403 时，提示用户更新 openKey：
```
/skill geo-config --action=update --openKey="新的openKey"
```

---

## 注意事项

1. **密钥安全**：geo-config.json 包含敏感信息，请勿提交到 git（已加入 .gitignore）
2. **配置同步**：更新配置后，所有技能自动使用新值
3. **统一认证**：所有 GEO 技能共用 Bearer + Referer 双重认证
