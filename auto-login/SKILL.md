---
name: geo-auth
description: 必火GEO平台认证管理，使用接口密钥openKey
---

# GEO平台认证管理（geo-auth）

> **技能名称**：geo-auth
> **用途**：使用接口密钥（openKey）认证必火GEO平台，管理API访问权限
> **作者**：GEO执行助理
> **版本**：v2.0
> **日期**：2026-04-15

## 技能说明

通过接口密钥（openKey）认证必火GEO平台，替代传统的账号密码JWT登录方式：
- 使用长期有效的 openKey 密钥，无需定期刷新
- 统一配置文件管理，所有GEO技能共享
- 自动获取并设置默认公司和产品ID
- 保留账号密码登录作为备用方案

---

## 配置说明

### 配置文件

所有GEO技能统一从项目根目录的 `geo-config/geo-config.json` 读取配置。

### 配置结构

```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "YOUR_OPEN_KEY_HERE",
    "referer": "https://geo.bihuoai.com/"
  },
  "defaults": {
    "productId": 0,
    "companyId": 0
  }
}
```

**字段说明**：
| 字段 | 说明 |
|------|------|
| `geo.baseUrl` | API服务地址 |
| `geo.openKey` | 接口密钥，在管理平台创建 |
| `geo.referer` | 请求来源标识，固定值 |
| `defaults.productId` | 默认产品ID，0表示未设置 |
| `defaults.companyId` | 默认公司ID，0表示未设置 |

**安全提醒**：
- openKey 是敏感凭证，请勿分享配置文件
- 建议将 `.claude/` 目录添加到 `.gitignore`
- openKey 为长期有效，无需定期更换（除非主动在管理平台撤销）

---

## 认证方式

### 统一请求头

所有API请求必须携带以下Header：

```
Authorization: Bearer {{openKey}}
Referer: https://geo.bihuoai.com/
```

### openKey 说明

- **类型**：长期有效的接口密钥
- **创建位置**：管理平台 → 密钥管理
- **前提条件**：需在套餐管理 > 套餐模版管理 > 限制中开启"创建接口密钥"
- **绑定关系**：openKey 绑定授权公司，创建后即关联指定公司权限
- **有效期**：长期有效，除非主动撤销或重新生成

---

## 执行步骤

当调用此技能时，请按以下步骤执行：

### 步骤1：读取配置文件

读取 `geo-config/geo-config.json`，检查 `geo.openKey` 是否已配置：

```json
{
  "geo": {
    "openKey": "sk-xxxxxxxxxxxxxxxxxx"
  }
}
```

- 如配置文件不存在，提示用户创建配置文件
- 如 `openKey` 为空或为 `"YOUR_OPEN_KEY_HERE"` 占位符，进入步骤2

### 步骤2：提示配置 openKey

如未配置 openKey，向用户说明：

```
⚠️ 未检测到有效的接口密钥（openKey）

请按以下步骤创建：
1. 登录必火GEO管理平台
2. 进入「套餐管理」→「套餐模版管理」
3. 在对应套餐的「限制」中开启「创建接口密钥」
4. 进入「密钥管理」创建新的接口密钥
5. 将密钥填入 geo-config/geo-config.json 的 geo.openKey 字段
```

等待用户提供 openKey 后，更新配置文件并继续步骤3。

### 步骤3：验证 openKey 有效性

调用权限接口测试密钥是否有效：

```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/user/permissions" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**成功响应**（statusCode == 0）：
```json
{
  "statusCode": 0,
  "message": "success",
  "data": { ... }
}
```

**失败响应**：
- statusCode != 0：openKey 无效或已撤销，提示用户检查
- 网络错误：检查网络连接

### 步骤4：获取公司和产品列表

openKey 验证通过后，获取可用资源：

**获取公司列表**：
```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/geo-company?page=1&limit=30" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

**获取产品列表**：
```bash
curl -X GET "https://nbgeo.aimusiclj.com/v1/geo-product?page=1&limit=30" \
  -H "Authorization: Bearer ${openKey}" \
  -H "Referer: https://geo.bihuoai.com/"
```

### 步骤5：自动设置默认值

根据获取到的列表自动设置默认值：

- **只有一个公司**：自动设置 `defaults.companyId` 为该公司ID
- **只有一个产品**：自动设置 `defaults.productId` 为该产品ID
- **有多个**：展示列表让用户选择，然后更新配置文件

更新配置文件示例：
```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "sk-xxxxxxxxxxxxxxxxxx",
    "referer": "https://geo.bihuoai.com/"
  },
  "defaults": {
    "productId": 98,
    "companyId": 36
  }
}
```

---

## 输出结果

### 认证成功
```
✅ GEO平台认证成功

🔑 认证方式：openKey
🔗 API地址：https://nbgeo.aimusiclj.com

🏢 公司列表：
[1] 海顿 (ID: 165)
[2] 深圳市必火人工智能有限公司 (ID: 36)
→ 已自动选择默认公司：深圳市必火人工智能有限公司 (ID: 36)

📦 产品列表：
[1] 必火AI品牌GEO优化 (ID: 98)
[2] 必火GEO (ID: 88)
→ 已自动选择默认产品：必火AI品牌GEO优化 (ID: 98)

💾 配置已保存到 geo-config/geo-config.json
```

### 认证失败
```
❌ openKey 验证失败

可能原因：
- openKey 无效或已被撤销
- openKey 对应的套餐已过期
- 网络连接异常

请检查 geo-config/geo-config.json 中的 geo.openKey 配置
```

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 配置文件不存在 | 未创建 geo-config.json | 提示用户创建配置文件 |
| openKey 为空 | 未填写接口密钥 | 引导用户去管理平台创建 |
| openKey 无效 | 密钥错误或已撤销 | 重新创建密钥并更新配置 |
| 权限不足 | 套餐未开启接口密钥功能 | 联系管理员开启权限 |
| 网络错误 | 无法连接API服务器 | 检查网络连接 |

---

## 备用方案：账号密码登录（旧方式）

> ⚠️ 优先使用 openKey 方式。以下旧方式仅作为备用，当无法获取 openKey 时使用。

### 登录接口

```bash
curl -X POST "https://nbgeo.aimusiclj.com/v1/user/login" \
  -H "Content-Type: application/json" \
  -H "Referer: https://geo.bihuoai.com/" \
  -d '{
    "username": "手机号",
    "password": "<SHA256前18位>",
    "geeTestForm": {}
  }'
```

### 密码加密

原始密码需要经过 SHA256 哈希并截取前18位：

```bash
encrypted_password=$(echo -n "$password" | sha256sum | cut -c1-18)
```

**注意**：
- JWT token 有效期约24小时，过期需重新登录
- 旧方式不支持长期免登录，建议尽快迁移到 openKey

---

## 使用示例

### 示例1：首次配置
```bash
# 创建配置文件
# 编辑 geo-config/geo-config.json，填入 openKey
/skill geo-auth
# 自动验证密钥、获取列表、设置默认值
```

### 示例2：日常使用
```bash
# 其他GEO技能会自动从配置文件读取 openKey
# 无需重复认证（openKey 长期有效）
/skill upload-image --file="test.png"
/skill publish-article --title="测试文章"
```

### 示例3：验证认证状态
```bash
/skill geo-auth --check
```

---

## 完整配置示例

```json
{
  "geo": {
    "baseUrl": "https://nbgeo.aimusiclj.com",
    "openKey": "sk-abc123def456ghi789jkl012mno345pqr",
    "referer": "https://geo.bihuoai.com/"
  },
  "defaults": {
    "productId": 98,
    "companyId": 36
  }
}
```

---

## 安全建议

1. **密钥安全**：
   - openKey 是长期凭证，务必妥善保管
   - 不要在公开场合（代码仓库、聊天记录等）暴露 openKey
   - 建议为不同环境使用不同的 openKey

2. **配置文件**：
   - 将 `.claude/` 目录添加到 `.gitignore`
   - 不要将含有 openKey 的配置文件提交到版本控制

3. **密钥管理**：
   - 如怀疑密钥泄露，立即在管理平台撤销并重新创建
   - 定期检查管理平台中的密钥使用情况

---

## 技能版本

- **版本**：v2.0
- **更新日期**：2026-04-15
- **变更说明**：
  - 从JWT账号密码登录改为 openKey 接口密钥认证
  - 配置文件从 `skills-config.json` 迁移到 `geo-config.json`
  - 移除验证码处理、token过期检测等不再需要的逻辑
  - 保留账号密码登录作为备用方案
- **支持平台**：必火GEO平台
