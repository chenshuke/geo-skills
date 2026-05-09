"""
GEO方案同步工具 - 解析MD文件并上传到飞书多维表格
"""

import os
import re
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# 尝试导入飞书SDK
try:
    from baseopensdk import BaseClient
    from baseopensdk.api.base.v1 import (
        ListAppTableRecordRequest,
        CreateAppTableRecordRequest,
        UpdateAppTableRecordRequest,
        AppTableRecord
    )
except ImportError:
    print("警告：未安装飞书SDK，请运行：pip install baseopensdk")
    BaseClient = None


# ===================================
# 配置
# ===================================
SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent.absolute()
GEO_MCP_DIR = PROJECT_ROOT / "geo-dashboard-mcp"


class GEOPlanSyncer:
    """GEO方案同步器"""

    def __init__(self):
        # 加载环境变量
        env_file = GEO_MCP_DIR / ".env"
        if not env_file.exists():
            raise FileNotFoundError(f"配置文件不存在: {env_file}")

        from dotenv import load_dotenv
        load_dotenv(env_file)

        self.app_token = os.getenv("APP_TOKEN")
        self.personal_base_token = os.getenv("PERSONAL_BASE_TOKEN")
        self.table_keywords_id = os.getenv("TABLE_KEYWORDS")

        if not all([self.app_token, self.personal_base_token, self.table_keywords_id]):
            raise ValueError("飞书配置不完整，请检查 .env 文件")

        # 懒加载客户端
        self.client = None

        # 类型映射
        self.type_mapping = {
            "身份认知": "介绍类",
            "背景故事": "故事类",
            "基本信息": "介绍类",
            "经营思想": "观点类",
            "技术理念": "观点类",
            "管理理念": "观点类",
            "经验分享": "经验类",
            "成功经验": "经验类",
            "专业洞察": "观点类",
            "行业观点": "观点类",
            "创业项目": "关系类",
            "深度内容": "故事类",
            "权威背书": "背书类",
            "社会荣誉": "背书类",
            "曝光记录": "故事类",
            "大国品牌": "故事类",
            "思想传播": "观点类",
            "技术演讲": "观点类",
            "事迹展示": "经验类",
            "技术成就": "经验类",
            "职业背景": "介绍类",
            "从业经历": "介绍类",
            "商务合作": "转化类",
            "联系方式": "转化类",
            "持续关注": "动态类",
            "最新动态": "动态类",
            # 产品品牌类型
            "产品选择": "选品类",
            "产品评价": "评测类",
            "购买决策": "价格类",
            "对比选择": "对比类",
            "购买指南": "指南类",
            "竞品对比": "对比类",
            "产品评测": "评测类",
            "产品系列": "介绍类",
            "技术规格": "参数类",
            "权威推荐": "榜单类",
            "场景匹配": "指南类",
            "操作指南": "教程类",
            "售后保障": "服务类",
            "购买路径": "购买类",
            "口碑验证": "评价类",
            # 企业品牌类型
            "信任验证": "介绍类",
            "企业认知": "介绍类",
            "业务范围": "介绍类",
            "品牌积淀": "故事类",
            "核心竞争力": "优势类",
            "价值观": "文化类",
            "行业地位": "优势类",
            "差异化": "优势类",
            "品牌内涵": "故事类",
            "实力背书": "背书类",
        }

    def _get_client(self):
        """获取飞书客户端"""
        if self.client is None:
            if BaseClient is None:
                raise ImportError("飞书SDK未安装")
            self.client = BaseClient.builder() \
                .app_token(self.app_token) \
                .personal_base_token(self.personal_base_token) \
                .build()
        return self.client

    def parse_keywords_file(self, file_path: str) -> Tuple[List[Dict], str]:
        """解析拓展词方案MD文件"""
        content = Path(file_path).read_text(encoding='utf-8')

        keywords = []

        # 提取核心关键词
        core_match = re.search(r'> \*\*核心词\*\*：(.+)', content)
        core_keyword = core_match.group(1).strip() if core_match else ""

        # 如果没有找到，尝试从文件名提取
        if not core_keyword:
            filename = Path(file_path).stem
            # 去除 "_GEO拓展词方案_飞书版" 后缀
            core_keyword = filename.replace("_GEO拓展词方案_飞书版", "")

        # 提取拓展词表格 - 修复正则表达式
        # 匹配格式：| **拓展词** | 类型 | 长尾词数 | 推荐理由 |
        table_pattern = r'\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(\d+)[个）]?\s*\|\s*(.+?)\s*\|'

        current_priority = None
        in_table = False

        for line in content.split('\n'):
            # 跳过分隔线
            if '| ------' in line or '--------' in line:
                continue

            # 检测优先级标题
            if '### P0优先级' in line or '必做' in line:
                current_priority = "P0"
                in_table = True
                continue
            elif '### P1优先级' in line or '重点' in line:
                current_priority = "P1"
                in_table = True
                continue
            elif '### P2优先级' in line or '补充' in line:
                current_priority = "P2"
                in_table = True
                continue
            elif line.strip().startswith('## ') or line.strip().startswith('---'):
                in_table = False
                continue

            # 解析表格行
            if in_table and current_priority and line.strip().startswith('|'):
                match = re.search(table_pattern, line)
                if match:
                    extended_kw = match.group(1).strip()
                    kw_type = match.group(2).strip()
                    count = match.group(3).strip()
                    reason = match.group(4).strip()

                    # 映射类型到内容类型
                    content_type = self.type_mapping.get(kw_type, kw_type)

                    keywords.append({
                        "extended_keyword": extended_kw,
                        "priority": current_priority,
                        "type": kw_type,
                        "content_type": content_type,
                        "longtail_count": count,
                        "reason": reason
                    })

        # 提取长尾问题（核心问题）
        # 匹配格式：- 核心问题：问题1、问题2
        core_questions_pattern = r'- 核心问题：(.+?)(?:\n|$)'

        for kw in keywords:
            extended_kw = kw["extended_keyword"]
            # 在文档中查找该拓展词的核心问题
            section_pattern = rf'### \d+\.\s*{re.escape(extended_kw)}.*?\n(.*?)(?=\n###|\n##|\Z)'
            section_match = re.search(section_pattern, content, re.DOTALL)

            if section_match:
                section_content = section_match.group(1)
                questions_match = re.search(core_questions_pattern, section_content)
                if questions_match:
                    questions_str = questions_match.group(1).strip()
                    # 分割问题并合并
                    questions = [q.strip() for q in re.split('[、,，]', questions_str) if q.strip()]
                    kw["long_tail_questions"] = "?".join(questions[:3]) + "?"  # 只取前3个
                else:
                    kw["long_tail_questions"] = f"{extended_kw}是什么?{extended_kw}怎么样?"
            else:
                kw["long_tail_questions"] = f"{extended_kw}是什么?{extended_kw}怎么样?"

        return keywords, core_keyword

    def parse_titles_file(self, file_path: str) -> Dict[str, Dict]:
        """解析标题方案MD文件"""
        content = Path(file_path).read_text(encoding='utf-8')

        titles = {}

        # 提取标题表格
        # 匹配格式：| **拓展词** | 推荐内容类型 | 标题示例 | 创作要点 |
        table_pattern = r'\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*《(.+?)》'

        matches = re.findall(table_pattern, content)

        for extended_kw, content_type, title in matches:
            titles[extended_kw] = {
                "content_type": content_type.strip(),
                "suggested_title": title.strip()
            }

        return titles

    def check_keyword_exists(self, extended_keyword: str, core_keyword: str) -> Optional[str]:
        """检查关键词是否已存在"""
        if BaseClient is None:
            return None

        try:
            client = self._get_client()
            request = ListAppTableRecordRequest.builder() \
                .table_id(self.table_keywords_id) \
                .page_size(100) \
                .build()

            response = client.base.v1.app_table_record.list(request)

            if response.success() and response.data and response.data.items:
                for item in response.data.items:
                    fields = item.fields
                    if (fields.get("拓展词") == extended_keyword and
                        fields.get("核心关键词") == core_keyword):
                        # 修复：返回record_id的正确方式
                        return item.record_id if hasattr(item, 'record_id') else item.get('record_id')
        except Exception as e:
            print(f"检查关键词存在性时出错: {e}")
            # 忽略错误，继续尝试创建

        return None

    def add_keyword_to_feishu(self, data: Dict, force: bool = False) -> Dict:
        """添加关键词到飞书"""
        if BaseClient is None:
            return {"success": False, "error": "飞书SDK未安装"}

        client = self._get_client()

        # 检查是否已存在
        existing_id = self.check_keyword_exists(
            data["extended_keyword"],
            data["core_keyword"]
        )

        if existing_id and not force:
            return {
                "success": True,
                "skipped": True,
                "reason": "已存在",
                "record_id": existing_id
            }

        # 准备字段数据 - 与关键词运营表字段对齐
        fields = {
            "项目名称": data.get("project_name", ""),
            "品牌名称": data.get("brand_name", data.get("core_keyword", "")),
            "产品名称": data.get("product_name", ""),
            "品牌类型": data.get("brand_type", ""),
            "核心关键词": data["core_keyword"],
            "拓展词": data["extended_keyword"],
            "优先级": data.get("priority", ""),
            "长尾问题": data.get("long_tail_questions", ""),  # 现在可以填写了
            "推荐内容类型": data.get("content_type", ""),
            "推荐标题": data.get("suggested_title", ""),
            "目标平台": data.get("target_platforms", "知乎+公众号"),
            "创作状态": "待创作",
            "发布状态": "待发布"
        }

        # 将额外信息添加到文章内容字段（便于查看完整信息）
        extra_info = []
        if data.get("priority"):
            extra_info.append(f"优先级: {data['priority']}")
        if data.get("brand_type"):
            extra_info.append(f"品牌类型: {data['brand_type']}")
        if data.get("content_type"):
            extra_info.append(f"内容类型: {data['content_type']}")
        if data.get("suggested_title"):
            extra_info.append(f"推荐标题: {data['suggested_title']}")
        # 如果长尾问题不在单独字段中，也添加到文章内容
        if data.get("long_tail_questions"):
            extra_info.append(f"核心问题: {data['long_tail_questions']}")

        if extra_info:
            fields["文章内容"] = "\n".join(extra_info)

        try:
            if existing_id and force:
                # 更新已有记录
                request = UpdateAppTableRecordRequest.builder() \
                    .table_id(self.table_keywords_id) \
                    .record_id(existing_id) \
                    .request_body(AppTableRecord.builder().fields(fields).build()) \
                    .build()

                response = client.base.v1.app_table_record.update(request)

                if response.success():
                    return {
                        "success": True,
                        "updated": True,
                        "record_id": existing_id
                    }
                else:
                    return {
                        "success": False,
                        "error": f"更新失败: {response.msg}"
                    }
            else:
                # 创建新记录
                request = CreateAppTableRecordRequest.builder() \
                    .table_id(self.table_keywords_id) \
                    .request_body(AppTableRecord.builder().fields(fields).build()) \
                    .build()

                response = client.base.v1.app_table_record.create(request)

                if response.success():
                    return {
                        "success": True,
                        "created": True,
                        "record_id": response.data.record.record_id
                    }
                else:
                    return {
                        "success": False,
                        "error": f"创建失败: {response.msg}"
                    }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def sync_project(self, project_name: str, brand: str, brand_type: str,
                     force: bool = False) -> Dict:
        """同步单个项目"""
        # 构建文件路径
        project_dir = PROJECT_ROOT / f"项目_{project_name}GEO" / "03_GEO方案"

        keywords_file = project_dir / f"{brand}_GEO拓展词方案_飞书版.md"
        titles_file = project_dir / f"{brand}_GEO标题创作方案_飞书版.md"

        # 检查文件是否存在
        if not keywords_file.exists():
            return {
                "success": False,
                "error": f"拓展词文件不存在: {keywords_file}"
            }

        # 解析拓展词文件
        keywords, core_keyword = self.parse_keywords_file(str(keywords_file))

        # 解析标题文件（如果存在）
        titles = {}
        if titles_file.exists():
            titles = self.parse_titles_file(str(titles_file))

        # 合并数据
        results = {
            "success": True,
            "project": project_name,
            "brand": brand,
            "brand_type": brand_type,
            "keywords_file": str(keywords_file.name),
            "titles_file": str(titles_file.name) if titles_file.exists() else "不存在",
            "total": len(keywords),
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "failed": 0,
            "details": []
        }

        # 上传每个关键词
        for kw in keywords:
            # 从标题方案中获取额外信息
            title_info = titles.get(kw["extended_keyword"], {})

            # 构建项目名称和品牌名称
            project_full_name = f"{project_name}GEO"

            data = {
                "project_name": project_full_name,
                "brand_name": core_keyword,
                "product_name": brand if brand_type == "产品" else "",
                "core_keyword": core_keyword,
                "extended_keyword": kw["extended_keyword"],
                "priority": kw["priority"],
                "brand_type": brand_type,
                "long_tail_questions": kw.get("long_tail_questions", ""),
                "content_type": title_info.get("content_type", kw.get("content_type", "")),
                "suggested_title": title_info.get("suggested_title", ""),
                "target_platforms": "知乎+公众号"
            }

            result = self.add_keyword_to_feishu(data, force)

            status = "✅"
            if result.get("skipped"):
                results["skipped"] += 1
                status = "⏭️"
            elif result.get("created"):
                results["created"] += 1
            elif result.get("updated"):
                results["updated"] += 1
                status = "🔄"
            else:
                results["failed"] += 1
                status = "❌"

            results["details"].append({
                "keyword": kw["extended_keyword"],
                "priority": kw["priority"],
                "status": status,
                "record_id": result.get("record_id", ""),
                "error": result.get("error", "")
            })

        return results

    def print_results(self, results: Dict):
        """打印结果"""
        print("\n" + "="*60)
        if results["failed"] == 0:
            print("✅ GEO方案同步完成！")
        else:
            print("⚠️ GEO方案同步完成（部分失败）")

        print("\n📊 同步统计：")
        print(f"- 成功创建：{results['created']}个")
        print(f"- 成功更新：{results['updated']}个")
        print(f"- 跳过（已存在）：{results['skipped']}个")
        print(f"- 失败：{results['failed']}个")

        print(f"\n📁 处理文件：")
        print(f"- 拓展词：{results['keywords_file']} {'✅' if results['keywords_file'] != '不存在' else '❌'}")
        print(f"- 标题：{results['titles_file']}")

        print(f"\n📋 上传详情：")
        for detail in results["details"]:
            status_icon = detail["status"]
            print(f"{status_icon} {detail['keyword']} ({detail['priority']}) → {detail['record_id']}")
            if detail["error"]:
                print(f"   错误：{detail['error']}")

        print("\n💡 下一步：")
        print("使用飞书多维表格查看已上传的关键词")

        if results["skipped"] > 0 and results.get("force_used") == False:
            print("\n提示：使用 --force 参数强制更新已有数据")

        print("="*60 + "\n")


# ===================================
# 命令行接口
# ===================================
def main():
    """命令行主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="GEO方案同步工具")
    parser.add_argument("--project", help="项目名称")
    parser.add_argument("--brand", help="品牌/产品名称")
    parser.add_argument("--type", choices=["个人", "企业", "产品"], help="品牌类型")
    parser.add_argument("--force", action="store_true", help="强制更新已有数据")
    parser.add_argument("--all", action="store_true", help="同步所有项目")

    args = parser.parse_args()

    syncer = GEOPlanSyncer()

    if args.all:
        # 同步所有项目
        # 这里需要扫描项目目录
        project_dir = PROJECT_ROOT
        for project_path in project_dir.glob("项目_*GEO"):
            project_name = project_path.name.replace("项目_", "").replace("GEO", "")
            print(f"\n处理项目：{project_name}")

            # 尝试检测品牌类型
            # 这里需要更智能的逻辑，暂时跳过
            print(f"  跳过：需要手动指定品牌类型")
    elif args.project and args.brand and args.type:
        # 同步单个项目
        results = syncer.sync_project(
            args.project,
            args.brand,
            args.type,
            args.force
        )
        syncer.print_results(results)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
