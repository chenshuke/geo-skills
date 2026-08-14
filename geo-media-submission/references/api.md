# GEO 媒体投稿接口

API 文档：`https://nbgeo.aimusiclj.com/api/api/`

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/v1/publication-media` | 查询投稿媒体；支持 mediaName、taxonomy、area、platform、withLink、aiIncluded、onlyFavorite |
| GET | `/v1/publication-media/query-enums` | 查询地区、分类和平台枚举 |
| POST/DELETE | `/v1/publication-media/favorite/{mediaId}` | 收藏/取消收藏媒体 |
| POST | `/v1/publication-media/publish` | 单文章、单媒体投稿 |
| POST | `/v1/publication-media/publish/batch` | 批量投稿；最多20篇文章、50个媒体 |
| GET | `/v1/publication-media/publish` | 投稿记录列表 |

媒体字段包括：`id`、`mediaName`、`price`、`withLink`、`caseUrl`、`area`、`platform`、`taxonomy`、`titleLimit`、`mediaType`、`aiIncluded`、`remark`、`successRadio`、`isFavorite`。

批量投稿结构：

```json
{ "articleIds": [101, 102], "mediaIds": [2001, 2002] }
```

