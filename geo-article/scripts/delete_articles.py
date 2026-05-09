#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GEO文章删除工具
支持单个删除和批量删除GEO平台上的文章
"""

import os
import sys
import requests
from pathlib import Path
from typing import List, Dict, Tuple
from dotenv import load_dotenv

# 加载环境变量（支持从多个位置查找.env文件）
env_paths = [
    Path.cwd() / '.env',
    Path(__file__).parent.parent.parent.parent / '.env',
    Path(__file__).parent.parent.parent / '.env',
    Path.home() / '.env'
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break
else:
    load_dotenv()  # 默认行为


class GEOArticleDeleter:
    """GEO文章删除器"""

    def __init__(self):
        """初始化配置"""
        self.open_key = os.getenv('GEO_OPEN_KEY')
        self.base_url = os.getenv('GEO_BASE_URL', 'https://nbgeo.aimusiclj.com')
        self.referer = os.getenv('GEO_REFERER', 'https://geo.bihuoai.com/')

        if not self.open_key:
            raise ValueError("错误：未找到 GEO_OPEN_KEY 环境变量")

        self.headers = {
            'Authorization': f'Bearer {self.open_key}',
            'Referer': self.referer,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

    def get_article_info(self, article_id: int) -> Dict:
        """获取文章信息"""
        url = f"{self.base_url}/v1/article/{article_id}"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 200 and data.get('data'):
                    return data['data']
            return None
        except Exception as e:
            print(f"  ⚠️  获取文章信息失败: {e}")
            return None

    def delete_article(self, article_id: int) -> Tuple[bool, str]:
        """
        删除单个文章

        Args:
            article_id: 文章ID

        Returns:
            (是否成功, 消息)
        """
        url = f"{self.base_url}/v1/article/{article_id}"

        try:
            response = requests.delete(url, headers=self.headers, timeout=10)

            # 打印调试信息
            print(f"  📍 HTTP状态码: {response.status_code}")
            print(f"  📍 响应内容: {response.text[:200]}")

            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('code') == 200 or data.get('success') == True:
                        return True, "删除成功"
                    else:
                        return False, data.get('message', '未知错误')
                except:
                    # 如果不是JSON响应，HTTP 200也视为成功
                    return True, "删除成功"
            elif response.status_code == 204:
                # 204 No Content 也是成功的删除操作
                return True, "删除成功"
            elif response.status_code == 404:
                return False, "文章不存在"
            elif response.status_code == 403:
                return False, "权限不足（请检查openKey）"
            elif response.status_code == 401:
                return False, "认证失败（请检查openKey）"
            else:
                return False, f"HTTP {response.status_code}"

        except requests.exceptions.Timeout:
            return False, "网络连接超时"
        except requests.exceptions.ConnectionError:
            return False, "网络连接失败"
        except Exception as e:
            return False, f"异常: {str(e)}"

    def delete_batch(self, article_ids: List[int], dry_run: bool = False) -> Dict:
        """
        批量删除文章

        Args:
            article_ids: 文章ID列表
            dry_run: 是否模拟运行

        Returns:
            删除结果统计
        """
        results = {
            'total': len(article_ids),
            'success': [],
            'failed': [],
            'success_count': 0,
            'failed_count': 0
        }

        print(f"\n🔄 准备{'查看' if dry_run else '删除'} {len(article_ids)} 篇文章...\n")

        for idx, article_id in enumerate(article_ids, 1):
            print(f"[{idx}/{len(article_ids)}] ", end="")

            # 获取文章信息
            article_info = self.get_article_info(article_id)
            if article_info:
                title = article_info.get('title', '未知标题')
                status = article_info.get('status', '未知')
                print(f"文章 {article_id}: {title[:50]}... (状态: {status})")
            else:
                print(f"文章 {article_id}: (无法获取信息)")

            # 如果是模拟运行，只显示信息不删除
            if dry_run:
                print(f"   💡 模拟模式：跳过删除\n")
                continue

            # 执行删除
            success, message = self.delete_article(article_id)

            if success:
                print(f"   ✅ 删除成功: {message}\n")
                results['success'].append({
                    'id': article_id,
                    'title': article_info.get('title', '') if article_info else ''
                })
                results['success_count'] += 1
            else:
                print(f"   ❌ 删除失败: {message}\n")
                results['failed'].append({
                    'id': article_id,
                    'error': message
                })
                results['failed_count'] += 1

        return results

    def print_summary(self, results: Dict):
        """打印删除结果汇总"""
        print("\n" + "="*60)
        print("📊 删除结果汇总")
        print("="*60)

        total = results['total']
        success_count = results['success_count']
        failed_count = results['failed_count']
        success_rate = (success_count / total * 100) if total > 0 else 0

        print(f"\n总计：{total} 篇文章")
        print(f"✅ 成功：{success_count} 篇")
        print(f"❌ 失败：{failed_count} 篇")
        print(f"📈 成功率：{success_rate:.1f}%")

        if results['success']:
            print("\n✅ 成功删除的文章：")
            for item in results['success']:
                title = item.get('title', '')
                title_short = title[:40] + "..." if len(title) > 40 else title
                print(f"   [{item['id']}] {title_short}")

        if results['failed']:
            print("\n❌ 删除失败的文章：")
            for item in results['failed']:
                print(f"   [{item['id']}] {item['error']}")

        print("\n" + "="*60 + "\n")


def parse_article_ids(input_str: str) -> List[int]:
    """解析文章ID字符串"""
    ids = []

    # 从文件读取
    if input_str.endswith('.txt') or os.path.exists(input_str):
        try:
            with open(input_str, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and line.isdigit():
                        ids.append(int(line))
            return ids
        except Exception as e:
            print(f"❌ 读取文件失败: {e}")
            sys.exit(1)

    # 从逗号分隔的字符串读取
    if ',' in input_str:
        for item in input_str.split(','):
            item = item.strip()
            if item.isdigit():
                ids.append(int(item))
        return ids

    # 单个ID
    if input_str.isdigit():
        return [int(input_str)]

    return []


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(
        description='删除GEO平台上的文章',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  # 删除单个文章
  python delete_articles.py --id 5763

  # 批量删除
  python delete_articles.py --ids 5763,5764,5765

  # 从文件读取ID列表
  python delete_articles.py --file article_ids.txt

  # 模拟运行（不实际删除）
  python delete_articles.py --ids 5763,5764 --dry-run
        """
    )

    parser.add_argument('--id', type=int, help='单个文章ID')
    parser.add_argument('--ids', type=str, help='多个文章ID（逗号分隔）')
    parser.add_argument('--file', type=str, help='包含文章ID的文件路径')
    parser.add_argument('--dry-run', action='store_true', help='模拟运行，不实际删除')
    parser.add_argument('--force', action='store_true', help='强制删除，不二次确认')

    args = parser.parse_args()

    # 解析文章ID
    article_ids = []

    if args.id:
        article_ids = [args.id]
    elif args.ids:
        article_ids = parse_article_ids(args.ids)
    elif args.file:
        article_ids = parse_article_ids(args.file)
    else:
        parser.print_help()
        print("\n❌ 错误：必须指定 --id、--ids 或 --file 参数")
        sys.exit(1)

    if not article_ids:
        print("\n❌ 错误：未找到有效的文章ID")
        sys.exit(1)

    # 去重
    article_ids = list(set(article_ids))
    article_ids.sort()

    print(f"\n{'🔍 模拟运行模式' if args.dry_run else '🗑️  删除模式'}")
    print(f"文章数量：{len(article_ids)} 篇")
    print(f"文章ID：{', '.join(map(str, article_ids))}")

    # 二次确认（非强制且非模拟模式）
    if not args.force and not args.dry_run:
        print("\n⚠️  警告：删除操作不可撤销！")
        confirm = input("确认删除这些文章吗？(yes/no): ").strip().lower()
        if confirm not in ['yes', 'y']:
            print("❌ 取消删除操作")
            sys.exit(0)

    # 执行删除
    try:
        deleter = GEOArticleDeleter()
        results = deleter.delete_batch(article_ids, dry_run=args.dry_run)
        deleter.print_summary(results)

        # 返回退出码
        if results['failed_count'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)

    except ValueError as e:
        print(f"\n❌ {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
