---
name: geo-config
description: GEO平台配置管理工具，用于查看、更新API openKey等配置信息
---

# GEO配置管理

> **技能名称**：geo-config
> **用途**：管理GEO平台API配置（openKey、默认值等）
> **作者**：GEO执行助理

---

## 配置
所有GEO技能统一从 `geo-config.json` 读取认证信息：
- 配置路径：`geo-config/geo-config.json`（项目根目录）
- openKey：接口密钥，在管理平台 > 密钥管理中创建
- 统一请求头：Authorization: Bearer ${openKey} + Referer: https://geo.bihuoai.com/

---

## 技能说明

统一管理GEO平台的所有API配置信息，包括：
- API基础地址
- openKey（接口密钥）
- 默认公司ID、产品ID等

**功能特点**：
- 查看当前配置
- 更新 openKey（解决密钥失效问题）
- 重置为默认值
- 配置文件位置管理

---

## 使用方法

### 方式1：查看当前配置
```
/skill geo-config --action=view
```

### 方式2：更新 openKey
```
/skill geo-config --action=update --openKey="新的openKey"
```

### 方式3：更新多项配置
```
/skill geo-config --action=update --openKey="新openKey" --company-id=36 --product-id=88
```

### 方式4：重置配置
```
/skill geo-config --action=reset
```

---

## 参数说明

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--action` | 操作类型：view/update/reset | 是 | view |
| `--openKey` | 新的接口密钥 | action=update时建议 | - |
| `--company-id` | 默认公司ID | 否 | 36 |
| `--product-id` | 默认产品ID | 否 | 88 |
| `--api-url` | API基础地址 | 否 | https://nbgeo.aimusiclj.com |

---

## 执行步骤

### 1. 配置文件位置
- **配置文件**：`geo-config/geo-config.json`（项目根目录）

### 2. 根据 action 执行不同操作

#### action=view（查看配置）
使用 Read 工具读取 `geo-config.json` 文件，显示当前配置

#### action=update（更新配置）
1. 读取当前 `geo-config.json` 文件
2. 更新指定的配置项
3. 写回 `geo-config.json` 文件
4. 显示更新结果

#### action=reset（重置配置）
1. 恢复默认配置结构
2. 写入 `geo-config.json` 文件
3. 提示用户填入新的 openKey

### 3. 配置文件格式

**geo-config.json**：
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

> **openKey 获取方式**：登录 GEO 管理平台 → 密钥管理 → 创建新密钥

---

## 示例

### 示例1：查看当前配置

**输入**：
```
/skill geo-config --action=view
```

**输出**：
```
📋 GEO平台当前配置

🔗 API基础地址：https://nbgeo.aimusiclj.com
🔑 openKey：sk-xxx...（已截断）
🏢 默认公司ID：36
📦 默认产品ID：88

📝 配置文件：geo-config/geo-config.json
🕒 最后更新：2026-04-15 10:30:00

💡 提示：openKey 失效后，请在管理平台 > 密钥管理中重新创建
```

---

### 示例2：更新 openKey

**输入**：
```
/skill geo-config --action=update --openKey="sk-新的openKey"
```

**输出**：
```
✅ 配置更新成功！

🔄 更新内容：
- 🔑 openKey：已更新

📋 当前配置：
🔗 API基础地址：https://nbgeo.aimusiclj.com
🏢 默认公司ID：36
📦 默认产品ID：88

💡 其他skills现在会使用新的 openKey
```

---

### 示例3：更新多项配置

**输入**：
```
/skill geo-config --action=update --company-id=36 --product-id=88
```

**输出**：
```
✅ 配置更新成功！

🔄 更新内容：
- 🏢 默认公司ID：36
- 📦 默认产品ID：88

💡 配置已保存，其他skills会使用新值
```

---

### 示例4：openKey 失效提醒

当API返回401或403错误时，自动提示：

```
⚠️ 认证失败！openKey 可能已失效

请执行以下命令更新：
/skill geo-config --action=update --openKey="你的新openKey"

🔑 获取新 openKey：登录管理平台 → 密钥管理 → 创建新密钥
```

---

## 配置项说明

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| geo.apiBaseUrl | API基础地址 | https://nbgeo.aimusiclj.com |
| geo.openKey | 接口密钥 | sk-xxxxxxxx |
| geo.defaultCompanyId | 默认公司ID | 36 |
| geo.defaultProductId | 默认产品ID | 88 |

---

## 注意事项

1. **密钥安全**：geo-config.json 包含敏感信息，请勿提交到 git（已加入 .gitignore）
2. **openKey 获取**：在 GEO 管理平台 > 密钥管理中创建
3. **配置同步**：更新配置后，所有 skills 会自动使用新值
4. **统一认证**：所有 GEO 技能使用相同的认证方式（Bearer ${openKey} + Referer）

---

## 技能版本

- **版本**：v2.0
- **创建日期**：2025-03-11
- **最后更新**：2026年4月15日
