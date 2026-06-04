#!/usr/bin/env python3
"""GEO Skills Suite doctor.

Checks a direct installation of all `geo-*` skill folders for Claude Code,
Codex, and other Agent Skills-compatible clients. It performs diagnostics only;
it does not install or overwrite skills.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

THIS_FILE = Path(__file__).resolve()
RUNTIME_DIR = THIS_FILE.parents[1]
SUITE_ROOT = THIS_FILE.parents[2]
sys.path.insert(0, str(RUNTIME_DIR / "scripts"))

try:
    from credentials import (  # type: ignore
        DEFAULT_GEO_BASE_URL,
        GEO_CONFIG_FILE,
        candidate_geo_config_files,
        ensure_credentials_dir,
        get_geo_config,
        get_geo_headers,
        mask_secret,
    )
except Exception as exc:  # pragma: no cover
    print(f"[FAIL] Cannot import geo-runtime credentials.py: {exc}")
    sys.exit(2)

REQUIRED_SKILLS = [
    "geo-runtime",
    "geo-hub",
    "geo-workflow-hub",
    "geo-config",
    "geo-account",
    "geo-article",
    "geo-indexing",
    "geo-publish",
    "geo-brand",
    "geo-knowledge",
    "geo-content",
    "geo-content-production",
    "geo-content-audit",
    "geo-content-archive",
    "geo-analysis",
]

OPTIONAL_IMPORTS = {
    "requests": "GEO API calls and image generation helpers",
    "dotenv": "loading .env files; install python-dotenv if missing",
    "baseopensdk": "Feishu/Bitable sync in geo-analysis; optional",
}


def frontmatter(text: str) -> Dict[str, str]:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return {}
    data: Dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def check_skills() -> Tuple[List[Dict[str, Any]], bool]:
    results = []
    ok = True
    for name in REQUIRED_SKILLS:
        skill_dir = SUITE_ROOT / name
        skill_file = skill_dir / "SKILL.md"
        item: Dict[str, Any] = {"name": name, "path": str(skill_dir), "exists": skill_file.exists()}
        if not skill_file.exists():
            item["status"] = "FAIL"
            item["message"] = "missing SKILL.md"
            ok = False
        else:
            fm = frontmatter(skill_file.read_text(encoding="utf-8", errors="ignore"))
            missing = [k for k in ["name", "description"] if not fm.get(k)]
            if missing:
                item["status"] = "FAIL"
                item["message"] = f"missing frontmatter fields: {', '.join(missing)}"
                ok = False
            elif fm.get("name") != name:
                item["status"] = "WARN"
                item["message"] = f"frontmatter name={fm.get('name')!r} differs from folder"
            else:
                item["status"] = "OK"
                item["message"] = "ready"
        results.append(item)
    return results, ok


def check_python() -> Dict[str, Any]:
    version = sys.version_info
    ok = version >= (3, 9)
    return {
        "status": "OK" if ok else "FAIL",
        "version": f"{version.major}.{version.minor}.{version.micro}",
        "message": "Python 3.9+ recommended" if ok else "Please upgrade to Python 3.9+",
    }


def check_imports() -> List[Dict[str, Any]]:
    rows = []
    for module, purpose in OPTIONAL_IMPORTS.items():
        found = importlib.util.find_spec(module) is not None
        required = module in {"requests"}
        status = "OK" if found else ("WARN" if not required else "FAIL")
        rows.append({"module": module, "status": status, "purpose": purpose})
    return rows


def check_config(init_config: bool = False) -> Dict[str, Any]:
    if init_config:
        ensure_credentials_dir()
    cfg = get_geo_config()
    config_files = [str(p) for p in candidate_geo_config_files()]
    configured = bool(cfg.get("open_key")) and cfg.get("open_key") != "your-openKey-here"
    return {
        "status": "OK" if configured else "WARN",
        "user_config_path": str(GEO_CONFIG_FILE),
        "checked_paths": config_files,
        "source": cfg.get("source"),
        "base_url": cfg.get("base_url") or DEFAULT_GEO_BASE_URL,
        "open_key_masked": mask_secret(cfg.get("open_key", "")),
        "company_id": cfg.get("company_id", 0),
        "product_id": cfg.get("product_id", 0),
        "message": "GEO credentials configured" if configured else "openKey is not configured; use geo-config to initialize ~/.geo-skills/credentials/geo-config.json",
    }


def check_api_connectivity() -> Dict[str, Any]:
    cfg = get_geo_config()
    if not cfg.get("open_key") or cfg.get("open_key") == "your-openKey-here":
        return {"status": "SKIP", "message": "No openKey configured"}
    try:
        import requests  # type: ignore
    except Exception as exc:
        return {"status": "FAIL", "message": f"requests is not available: {exc}"}

    url = f"{str(cfg.get('base_url') or DEFAULT_GEO_BASE_URL).rstrip('/')}/v1/geo-company?page=1&limit=1"
    try:
        resp = requests.get(url, headers=get_geo_headers(), timeout=15)
        status = "OK" if 200 <= resp.status_code < 300 else "WARN"
        body_preview = resp.text[:300]
        return {"status": status, "http_status": resp.status_code, "url": url, "message": body_preview}
    except Exception as exc:
        return {"status": "FAIL", "url": url, "message": str(exc)}


def as_text(report: Dict[str, Any]) -> str:
    lines = []
    lines.append("GEO Skills Suite Doctor")
    lines.append(f"Suite root: {SUITE_ROOT}")
    lines.append("")
    py = report["python"]
    lines.append(f"Python: [{py['status']}] {py['version']} — {py['message']}")
    lines.append("")
    lines.append("Skills:")
    for item in report["skills"]:
        lines.append(f"  [{item['status']}] {item['name']} — {item['message']}")
    lines.append("")
    lines.append("Python modules:")
    for item in report["imports"]:
        lines.append(f"  [{item['status']}] {item['module']} — {item['purpose']}")
    lines.append("")
    cfg = report["config"]
    lines.append(f"Config: [{cfg['status']}] {cfg['message']}")
    lines.append(f"  user config: {cfg['user_config_path']}")
    lines.append(f"  source: {cfg['source']}")
    lines.append(f"  openKey: {cfg['open_key_masked'] or '(empty)'}")
    lines.append(f"  companyId/productId: {cfg['company_id']} / {cfg['product_id']}")
    if "api" in report:
        api = report["api"]
        lines.append("")
        lines.append(f"API: [{api['status']}] {api.get('message', '')}")
    lines.append("")
    lines.append("Next steps:")
    steps = []
    if cfg["status"] != "OK":
        steps.append("Ask your agent: 使用 geo-config 帮我初始化 GEO openKey 配置。")
    if any(i["status"] == "FAIL" for i in report["imports"]):
        steps.append("Install required modules: python3 -m pip install requests python-dotenv")
    elif any(i["status"] == "WARN" for i in report["imports"]):
        steps.append("Optional modules are missing; install them only if you need the related feature.")
    steps.append("For API write/delete operations, preview first and confirm explicitly.")
    for i, step in enumerate(steps, 1):
        lines.append(f"  {i}. {step}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check GEO Skills Suite readiness")
    parser.add_argument("--init-config", action="store_true", help="create ~/.geo-skills/credentials/geo-config.json template if missing")
    parser.add_argument("--check-api", action="store_true", help="also call a lightweight GEO API endpoint")
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON")
    args = parser.parse_args()

    skills, skills_ok = check_skills()
    report: Dict[str, Any] = {
        "suite_root": str(SUITE_ROOT),
        "python": check_python(),
        "skills": skills,
        "imports": check_imports(),
        "config": check_config(init_config=args.init_config),
    }
    if args.check_api:
        report["api"] = check_api_connectivity()

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(as_text(report))

    hard_fail = report["python"]["status"] == "FAIL" or not skills_ok or any(i["status"] == "FAIL" for i in report["imports"])
    return 1 if hard_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
