#!/usr/bin/env python3
"""GEO Skills Suite shared credential loader.

This module is intentionally stored inside the `geo-runtime` skill so a direct
install of all `geo-*` folders works in both Claude Code and Codex. It never
prints full secrets.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Optional

try:  # python-dotenv is recommended but not required for basic config files.
    from dotenv import load_dotenv  # type: ignore
except Exception:  # pragma: no cover - dependency may be absent on fresh machines
    def load_dotenv(*_args, **_kwargs):  # type: ignore
        return False

# Runtime layout
THIS_FILE = Path(__file__).resolve()
RUNTIME_DIR = THIS_FILE.parents[1]
SUITE_ROOT = THIS_FILE.parents[2]
USER_HOME = Path.home() / ".geo-skills"
CREDENTIALS_DIR = USER_HOME / "credentials"
GEO_CONFIG_FILE = CREDENTIALS_DIR / "geo-config.json"
FANGXIN_KEY_FILE = CREDENTIALS_DIR / "fangxin_image_api_key"
FEISHU_ENV_FILE = CREDENTIALS_DIR / "feishu.env"

# Defaults
DEFAULT_GEO_BASE_URL = "https://nbgeo.aimusiclj.com"
DEFAULT_GEO_REFERER = "https://geo.bihuoai.com/"
DEFAULT_FANGXIN_BASE_URL = "https://fangxinapi.com"


def mask_secret(value: str, keep: int = 4) -> str:
    """Return a display-safe masked secret."""
    if not value:
        return ""
    if len(value) <= keep * 2:
        return value[:1] + "***" + value[-1:]
    return value[:keep] + "****" + value[-keep:]


def _find_env_file() -> Optional[Path]:
    """Find a local .env without assuming a specific client working directory."""
    candidates = [
        Path.cwd() / ".env",
        SUITE_ROOT / ".env",
        USER_HOME / ".env",
        Path.home() / ".env",
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def _load_env() -> None:
    env_file = _find_env_file()
    if env_file:
        load_dotenv(env_file)
    else:
        load_dotenv()


_load_env()


def candidate_geo_config_files() -> list[Path]:
    """Credential search order: env/user config first, bundled template last."""
    candidates = []
    explicit = os.getenv("GEO_CONFIG_FILE") or os.getenv("GEO_CONFIG_PATH")
    if explicit:
        candidates.append(Path(explicit).expanduser())
    candidates.extend([
        GEO_CONFIG_FILE,  # ~/.geo-skills/credentials/geo-config.json
        SUITE_ROOT / "geo-config" / "geo-config.json",  # bundled template/fallback
    ])
    # de-duplicate while preserving order
    seen = set()
    out = []
    for p in candidates:
        key = str(p)
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


def get_geo_config() -> Dict:
    """Load GEO API config.

    Priority: environment variables > user config > bundled template > defaults.
    """
    config = {
        "base_url": os.getenv("GEO_BASE_URL", DEFAULT_GEO_BASE_URL),
        "open_key": os.getenv("GEO_OPEN_KEY", ""),
        "referer": os.getenv("GEO_REFERER", DEFAULT_GEO_REFERER),
        "company_id": int(os.getenv("GEO_COMPANY_ID", "0") or "0"),
        "product_id": int(os.getenv("GEO_PRODUCT_ID", "0") or "0"),
        "source": "environment/defaults",
    }

    for json_path in candidate_geo_config_files():
        if not json_path.exists():
            continue
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        geo = data.get("geo", {})
        defaults = data.get("defaults", {})
        changed = False
        if not config["open_key"] and geo.get("openKey") and geo.get("openKey") != "your-openKey-here":
            config["open_key"] = geo["openKey"]
            changed = True
        if config["base_url"] == DEFAULT_GEO_BASE_URL and geo.get("baseUrl"):
            config["base_url"] = geo.get("baseUrl")
            changed = True
        if config["referer"] == DEFAULT_GEO_REFERER and geo.get("referer"):
            config["referer"] = geo.get("referer")
            changed = True
        if config["company_id"] == 0 and defaults.get("companyId", 0):
            config["company_id"] = int(defaults.get("companyId", 0))
            changed = True
        if config["product_id"] == 0 and defaults.get("productId", 0):
            config["product_id"] = int(defaults.get("productId", 0))
            changed = True
        if changed:
            config["source"] = str(json_path)
        # Continue so env still wins but later fields can fill missing values.

    return config


def get_geo_headers() -> Dict[str, str]:
    """Build GEO API headers. Do not log the returned Authorization value."""
    config = get_geo_config()
    return {
        "Authorization": f"Bearer {config['open_key']}",
        "Referer": config["referer"],
        "Content-Type": "application/json",
    }


def get_fangxin_api_key() -> Optional[str]:
    """Load Fangxin image API key from env or user credential file."""
    key = os.getenv("FANGXIN_IMAGE_API_KEY") or os.getenv("FANGXIN_API_KEY")
    if key:
        return key
    for path in [FANGXIN_KEY_FILE, USER_HOME / "credentials" / "fangxin_image_api_key"]:
        try:
            value = path.read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            continue
        except OSError:
            continue
        if value:
            return value
    return None


def get_feishu_config() -> Optional[Dict]:
    """Load Feishu config if present."""
    config = {
        "app_token": os.getenv("APP_TOKEN", ""),
        "personal_base_token": os.getenv("PERSONAL_BASE_TOKEN", ""),
        "table_keywords_id": os.getenv("TABLE_KEYWORDS", ""),
    }
    if all(config.values()):
        return config
    if FEISHU_ENV_FILE.exists():
        load_dotenv(FEISHU_ENV_FILE, override=True)
        config["app_token"] = os.getenv("APP_TOKEN", config["app_token"])
        config["personal_base_token"] = os.getenv("PERSONAL_BASE_TOKEN", config["personal_base_token"])
        config["table_keywords_id"] = os.getenv("TABLE_KEYWORDS", config["table_keywords_id"])
    return config if all(config.values()) else None


def ensure_credentials_dir() -> Path:
    """Create user credential template if missing and return its path."""
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    if not GEO_CONFIG_FILE.exists():
        template = {
            "geo": {
                "baseUrl": DEFAULT_GEO_BASE_URL,
                "openKey": "your-openKey-here",
                "referer": DEFAULT_GEO_REFERER,
            },
            "defaults": {
                "companyId": 0,
                "productId": 0,
            },
        }
        GEO_CONFIG_FILE.write_text(json.dumps(template, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return GEO_CONFIG_FILE
