# GEO 知识库接口

API 文档：`https://nbgeo.aimusiclj.com/api/api/`

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/v1/knowledge-base` | 知识库列表；支持 page、limit、id、tags、productId、companyId、status、name |
| POST | `/v1/knowledge-base` | 创建知识库 |
| POST | `/v1/knowledge-base/batch` | 批量创建知识库 |
| GET | `/v1/knowledge-base/{id}` | 获取知识库详情及 documents |
| POST | `/v1/knowledge-base/{id}/files` | 追加文件 |
| PATCH | `/v1/knowledge-base/{id}` | 更新名称和标签 |
| DELETE | `/v1/knowledge-base/{id}/files/{documentId}` | 删除文档 |
| DELETE | `/v1/knowledge-base/{id}` | 删除知识库 |

创建结构：

```json
{
  "name": "知识库名称",
  "companyId": 101,
  "productId": 93,
  "tags": ["品牌", "产品"],
  "files": [{ "name": "品牌介绍.md", "file": "Markdown文本或平台可访问URL" }]
}
```

详情中的 `documents[].fileUrl` 是当前可用于下载的字段，但文档标记为兼容字段，可能为空。为空时只能备份元数据。

