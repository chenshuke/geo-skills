#!/usr/bin/env python3
"""
GEO 技能包 — 统一凭证管理模块

所有 Python 脚本统一使用本模块加载凭证，替代各自分散的 .env 搜索逻辑。

用法:
    from shared.credentials import get_geo_config, get_fangxin_api_key, get_feishu_config

凭证发现优先级:
    1. 环境变量（最高优先级）
    2. 项目级 .env 文件
    3. 用户级配置文件 (~/.geo-skills/)
"""

import os
import json
from pathlib import Path
from typing import Dict, Optional, Tuple
from dotenv import load_dotenv

# ── 路径常量 ──────────────────────────────────────────────
GEO_SKILLS_HOME = Path.home() / ".geo-skills"
CREDENTIALS_DIR = GEO_SKILLS_HOME / "credentials"
GEO_CONFIG_FILE = CREDENTIALS_DIR / "geo-config.json"
FANGXIN_KEY_FILE = CREDENTIALS_DIR / "fangxin_image_api_key"
FEISHU_ENV_FILE = CREDENTIALS_DIR / "feishu.env"

# ── 默认值 ──────────────────────────────────────────────
DEFAULT_GEO_BASE_URL = "https://nbgeo.aimusiclj.com"
DEFAULT_GEO_REFERER = "https://geo.bihuoai.com/"
DEFAULT_FANGXIN_BASE_URL = "https://fangxinapi.com"


def _find_env_file() -> Optional[Path]:
    """搜索 .env 文件，按优先级返回路径"""
    candidates = [
        Path.cwd() / '.env',
        Path(__file__).parent.parent.parent.parent / '.env',
        Path(__file__).parent.parent.parent / '.env',
        Path.home() / '.env',
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _load_env():
    """加载环境变量（兼容多个 .env 位置）"""
    env_file = _find_env_file()
    if env_file:
        load_dotenv(env_file)
    else:
        load_dotenv()  # fallback to default behavior


# 初始化时加载环境变量
_load_env()


def get_geo_config() -> Dict:
    """
    加载 GEO 平台配置

    优先级: 环境变量 > geo-config.json > 默认值

    Returns:
        dict: {base_url, open_key, referer, company_id, product_id}
    """
    config = {
        "base_url": os.getenv("GEO_BASE_URL", DEFAULT_GEO_BASE_URL),
        "open_key": os.getenv("GEO_OPEN_KEY", ""),
        "referer": os.getenv("GEO_REFERER", DEFAULT_GEO_REFERER),
        "company_id": int(os.getenv("GEO_COMPANY_ID", "0")),
        "product_id": int(os.getenv("GEO_PRODUCT_ID", "0")),
    }

    # 从 geo-config.json 补充缺失值
    json_paths = [
        GEO_CONFIG_FILE,  # ~/.geo-skills/credentials/geo-config.json
        Path(__file__).parent.parent / "geo-config" / "geo-config.json",  # 技能包内
    ]
    for json_path in json_paths:
        if json_path.exists() and not config["open_key"]:
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                geo = data.get("geo", {})
                if not config["open_key"] and geo.get("openKey"):
                    config["open_key"] = geo["openKey"]
                if not config.get("base_url") or config["base_url"] == DEFAULT_GEO_BASE_URL:
                    config["base_url"] = geo.get("baseUrl", config["base_url"])
                if config["referer"] == DEFAULT_GEO_REFERER:
                    config["referer"] = geo.get("referer", config["referer"])
                defaults = data.get("defaults", {})
                if config["company_id"] == 0 and defaults.get("companyId", 0) != 0:
                    config["company_id"] = defaults["companyId"]
                if config["product_id"] == 0 and defaults.get("productId", 0) != 0:
                    config["product_id"] = defaults["productId"]
            except (json.JSONDecodeError, KeyError):
                pass

    return config


def get_fangxin_api_key() -> Optional[str]:
    """
    加载芳信图片生成 API Key

    优先级: 环境变量 > key 文件
    """
    # 环境变量
    key = os.getenv("FANGXIN_IMAGE_API_KEY") or os.getenv("FANGXIN_API_KEY")
    if key:
        return key

    # Key 文件（兼容多个路径）
    key_files = [
        FANGXIN_KEY_FILE,
        Path.home() / ".geo-skills" / "credentials" / "fangxin_image_api_key",
    ]
    for kf in key_files:
        if kf.exists():
            try:
                return kf.read_text().strip()
            except IOError:
                pass

    return None


def get_feishu_config() -> Optional[Dict]:
    """
    加载飞书同步配置

    优先级: 环境变量 > .env 文件

    Returns:
        dict with app_token, personal_base_token, table_keywords_id
        or None if not configured
    """
    config = {
        "app_token": os.getenv("APP_TOKEN", ""),
        "personal_base_token": os.getenv("PERSONAL_BASE_TOKEN", ""),
        "table_keywords_id": os.getenv("TABLE_KEYWORDS", ""),
    }

    if all(config.values()):
        return config

    # Try feishu.env
    if FEISHU_ENV_FILE.exists():
        load_dotenv(FEISHU_ENV_FILE, override=True)
        config["app_token"] = os.getenv("APP_TOKEN", config["app_token"])
        config["personal_base_token"] = os.getenv("PERSONAL_BASE_TOKEN", config["personal_base_token"])
        config["table_keywords_id"] = os.getenv("TABLE_KEYWORDS", config["table_keywords_id"])

    if all(config.values()):
        return config

    return None


# ── 便捷函数 ──────────────────────────────────────────────

def get_geo_headers() -> Dict[str, str]:
    """获取 GEO API 请求头（含认证信息）"""
    config = get_geo_config()
    return {
        "Authorization": f"Bearer {config['open_key']}",
        "Referer": config["referer"],
        "Content-Type": "application/json",
    }


def ensure_credentials_dir():
    """确保凭证目录存在"""
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    if not GEO_CONFIG_FILE.exists():
        template = {
            "geo": {
                "baseUrl": DEFAULT_GEO_BASE_URL,
                "openKey": "YOUR_OPEN_KEY_HERE",
                "referer": DEFAULT_GEO_REFERER,
            },
            "defaults": {
                "companyId": 0,
                "productId": 0,
            }
        }
        with open(GEO_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)
        print(f"已创建配置模板: {GEO_CONFIG_FILE}")
        print("请编辑此文件，填入你的 openKey")
