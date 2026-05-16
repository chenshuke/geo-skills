#!/usr/bin/env python3
"""
GEO Image Generation — 基于 Fangxin OpenAI-compatible images API 生成图片，
可选自动上传到 GEO 阿里云 OSS。

改编自 fangxin-image-generation v1.3.0，新增 GEO OSS 自动上传能力。
"""

import argparse
import base64
import binascii
import json
import mimetypes
import os
import random
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Fangxin API defaults ──────────────────────────────────────────────
DEFAULT_BASE_URL = "https://fangxinapi.com"
GENERATIONS_PATH = "/v1/images/generations"
EDITS_PATH = "/v1/images/edits"
DEFAULT_MODEL = "gpt-image-2"
DEFAULT_SIZE = "1024x1024"
DEFAULT_TIMEOUT = 420
DEFAULT_DOWNLOAD_TIMEOUT = 120
DEFAULT_RETRIES = 1
DEFAULT_BACKOFF = 2.0
DEFAULT_OUTPUT_DIR = str(Path.home() / "Downloads")
DEFAULT_API_KEY_FILE = Path.home() / ".geo-skills" / "credentials" / "fangxin_image_api_key"
USER_AGENT = "GEO-Skill-Agent/1.1"
TRANSIENT_ERRORS = (
    "Empty reply from server",
    "SSL_ERROR_SYSCALL",
    "Connection reset by peer",
    "Remote end closed connection without response",
    "Operation timed out",
)

# ── GEO OSS defaults ──────────────────────────────────────────────────
DEFAULT_GEO_CONFIG_FILE = Path.home() / ".geo-skills" / "credentials" / "geo-config.json"


# ═══════════════════════════════════════════════════════════════════════
# Utility helpers (unchanged from fangxin original)
# ═══════════════════════════════════════════════════════════════════════

def env(*names: str, default: Optional[str] = None) -> Optional[str]:
    for name in names:
        value = os.environ.get(name)
        if value not in (None, ""):
            return value
    return default


def normalize_base_url(base_url: str) -> str:
    value = (base_url or DEFAULT_BASE_URL).strip()
    if not value:
        value = DEFAULT_BASE_URL
    value = value.rstrip("/")
    if value.endswith("/v1"):
        value = value[:-3].rstrip("/")
    return value or DEFAULT_BASE_URL


def candidate_api_key_files() -> List[Path]:
    candidates: List[Path] = []

    def add(path: Path) -> None:
        if path not in candidates:
            candidates.append(path)

    add(DEFAULT_API_KEY_FILE)
    home_env = os.environ.get("HOME")
    if home_env:
        add(Path(home_env).expanduser() / ".geo-skills" / "credentials" / "fangxin_image_api_key")
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if parent.name == "home" and parent.parent.name.startswith("workspace-") and parent.parent.parent.name == "profiles":
            add(parent / ".geo-skills" / "credentials" / "fangxin_image_api_key")
            break
    explicit_profile_home = os.environ.get("HERMES_PROFILE_HOME")
    if explicit_profile_home:
        add(Path(explicit_profile_home).expanduser() / ".geo-skills" / "credentials" / "fangxin_image_api_key")
    return candidates


def detect_api_key_source(explicit_api_key: Optional[str]) -> Dict[str, Any]:
    if explicit_api_key not in (None, ""):
        return {
            "api_key": explicit_api_key,
            "source": "cli_or_env",
            "path": None,
            "checked_paths": [str(path) for path in candidate_api_key_files()],
        }
    checked_paths: List[str] = []
    for path in candidate_api_key_files():
        checked_paths.append(str(path))
        try:
            value = path.read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            continue
        if value:
            return {
                "api_key": value,
                "source": "credential_file",
                "path": str(path),
                "checked_paths": checked_paths,
            }
    return {
        "api_key": None,
        "source": None,
        "path": None,
        "checked_paths": checked_paths,
    }


def read_default_api_key_file() -> Optional[str]:
    detected = detect_api_key_source(None)
    value = detected.get("api_key")
    return value if isinstance(value, str) and value else None


def sanitize_filename(name: str) -> str:
    safe = []
    for ch in name.strip():
        if ch.isalnum() or ch in ("-", "_", "."):
            safe.append(ch)
        elif ch in (" ", "/", "\\", ":"):
            safe.append("-")
    out = "".join(safe).strip("-._")
    return out or "geo-image"


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_bytes(data: bytes, output_path: Path) -> str:
    ensure_parent(output_path)
    output_path.write_bytes(data)
    return str(output_path)


def infer_extension(item: Dict[str, Any], parsed: Dict[str, Any], default: str = "png") -> str:
    output_format = parsed.get("output_format")
    if isinstance(output_format, str) and output_format.strip():
        return output_format.strip().lower()
    url = item.get("url")
    if isinstance(url, str) and "." in url.rsplit("/", 1)[-1]:
        ext = url.rsplit(".", 1)[-1].split("?", 1)[0].lower()
        if ext:
            return ext
    return default


def default_output_stem(prompt: str, created: Optional[int]) -> str:
    prompt_head = sanitize_filename(prompt[:48])
    ts = str(created) if created else str(int(time.time()))
    return f"{prompt_head}-{ts}"


def resolve_output_targets(args: argparse.Namespace, parsed: Dict[str, Any], items: List[Dict[str, Any]]) -> List[Path]:
    if args.output:
        base = Path(args.output).expanduser()
        if len(items) <= 1:
            return [base]
        stem = base.stem or "geo-image"
        suffix = base.suffix or ".png"
        parent = base.parent
        return [parent / f"{stem}-{idx + 1}{suffix}" for idx in range(len(items))]

    output_dir = Path(args.output_dir).expanduser()
    stem = default_output_stem(args.prompt, parsed.get("created"))
    targets: List[Path] = []
    for idx, item in enumerate(items, start=1):
        ext = infer_extension(item, parsed)
        suffix = f"-{idx}" if len(items) > 1 else ""
        targets.append(output_dir / f"{stem}{suffix}.{ext}")
    return targets


def save_metadata(meta_path: Path, content: Dict[str, Any]) -> str:
    ensure_parent(meta_path)
    meta_path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(meta_path)


def build_image_form_field(field_name: str, image_value: str) -> List[str]:
    path = Path(image_value).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"image file not found: {image_value}")
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return ["-F", f"{field_name}=@{path};type={mime_type}"]


def download_if_url(image_value: str, temp_root: Path, stem: str, timeout: int) -> str:
    if not image_value:
        return image_value
    if not image_value.startswith(("http://", "https://")):
        return image_value
    url_path = image_value.split("?", 1)[0]
    suffix = Path(url_path).suffix or ".img"
    output_path = temp_root / f"{stem}{suffix}"
    cmd = ["curl", "-L", "--fail", "-sS", "-o", str(output_path), image_value]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
    if result.returncode != 0:
        error = result.stderr.strip() or f"curl exited with code {result.returncode}"
        raise RuntimeError(f"failed to download image URL {image_value}: {error}")
    return str(output_path)


def localize_edit_inputs(args: argparse.Namespace, temp_root: Path) -> argparse.Namespace:
    args.image = [download_if_url(image, temp_root, f"image_{index + 1}", args.download_timeout) for index, image in enumerate(args.image)]
    if args.mask:
        args.mask = download_if_url(args.mask, temp_root, "mask", args.download_timeout)
    return args


def parse_curl_response(raw: str) -> Dict[str, Any]:
    blocks = [block for block in raw.replace("\r\n", "\n").split("\n\n") if block.strip()]
    if len(blocks) < 2:
        raise RuntimeError(f"unexpected response format from curl: {raw[:500]}")
    body_text = blocks[-1]
    header_block = None
    for block in reversed(blocks[:-1]):
        if block.startswith("HTTP/"):
            header_block = block
            break
    if not header_block:
        raise RuntimeError("missing HTTP status line")
    status_line = header_block.splitlines()[0]
    try:
        status_code = int(status_line.split()[1])
    except (IndexError, ValueError) as exc:
        raise RuntimeError(f"bad status line: {status_line}") from exc
    headers: Dict[str, str] = {}
    for line in header_block.splitlines()[1:]:
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.strip()] = value.strip()
    try:
        body = json.loads(body_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"non-JSON body: {body_text[:500]}") from exc
    return {"status": status_code, "headers": headers, "body": body}


# ═══════════════════════════════════════════════════════════════════════
# Fangxin API request builders (unchanged)
# ═══════════════════════════════════════════════════════════════════════

def build_generation_command(url: str, api_key: str, args: argparse.Namespace) -> List[str]:
    payload: Dict[str, Any] = {
        "model": args.model,
        "prompt": args.prompt,
        "n": args.n,
        "size": args.size,
    }
    if args.quality:
        payload["quality"] = args.quality
    if args.background:
        payload["background"] = args.background
    if args.output_format:
        payload["output_format"] = args.output_format
    if args.output_compression is not None:
        payload["output_compression"] = args.output_compression
    if args.moderation:
        payload["moderation"] = args.moderation
    if args.response_format:
        payload["response_format"] = args.response_format
    if args.style:
        payload["style"] = args.style
    if args.user:
        payload["user"] = args.user
    return [
        "curl", "--http1.1", "-sS", "-D", "-", url,
        "-H", f"Authorization: Bearer {api_key}",
        "-H", "Content-Type: application/json",
        "-H", f"User-Agent: {USER_AGENT}",
        "--max-time", str(args.timeout),
        "--data", json.dumps(payload, ensure_ascii=False),
    ]


def build_edit_command(url: str, api_key: str, args: argparse.Namespace) -> List[str]:
    if not args.image:
        raise RuntimeError("edit mode requires at least one --image input")
    cmd = [
        "curl", "--http1.1", "-sS", "-D", "-", url,
        "-H", f"Authorization: Bearer {api_key}",
        "-H", f"User-Agent: {USER_AGENT}",
        "--max-time", str(args.timeout),
        "-F", f"model={args.model}",
        "-F", f"prompt={args.prompt}",
        "-F", f"size={args.size}",
    ]
    if args.n != 1:
        cmd.extend(["-F", f"n={args.n}"])
    if args.quality:
        cmd.extend(["-F", f"quality={args.quality}"])
    if args.background:
        cmd.extend(["-F", f"background={args.background}"])
    if args.output_format:
        cmd.extend(["-F", f"output_format={args.output_format}"])
    if args.output_compression is not None:
        cmd.extend(["-F", f"output_compression={args.output_compression}"])
    if args.moderation:
        cmd.extend(["-F", f"moderation={args.moderation}"])
    if args.input_fidelity:
        cmd.extend(["-F", f"input_fidelity={args.input_fidelity}"])
    if args.user:
        cmd.extend(["-F", f"user={args.user}"])
    for image in args.image:
        cmd.extend(build_image_form_field("image", image))
    if args.mask:
        cmd.extend(build_image_form_field("mask", args.mask))
    return cmd


def run_curl(cmd: List[str], timeout: int) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 20, check=False)


def maybe_extract_error(result: subprocess.CompletedProcess) -> str:
    stderr = (result.stderr or "").strip()
    stdout = (result.stdout or "").strip()
    if stderr:
        return stderr
    if stdout:
        return stdout[:500]
    return f"curl exited with code {result.returncode}"


def request_with_retries(url: str, api_key: str, args: argparse.Namespace, edit_mode: bool) -> Dict[str, Any]:
    attempts: List[Dict[str, Any]] = []
    max_attempts = args.retries + 1
    last_error: Optional[str] = None
    for attempt in range(1, max_attempts + 1):
        started = time.time()
        try:
            cmd = build_edit_command(url, api_key, args) if edit_mode else build_generation_command(url, api_key, args)
            result = run_curl(cmd, args.timeout)
            parsed = parse_curl_response(result.stdout)
            elapsed = round(time.time() - started, 3)
            if result.returncode != 0:
                last_error = maybe_extract_error(result)
                attempts.append({"attempt": attempt, "elapsed_s": elapsed, "error": last_error, "error_type": "curl_returncode"})
                if any(token in last_error for token in TRANSIENT_ERRORS) and attempt < max_attempts:
                    time.sleep(args.retry_backoff * (2 ** (attempt - 1)) + random.random())
                    continue
                raise RuntimeError(last_error)
            parsed["elapsed_s"] = elapsed
            parsed["attempt"] = attempt
            parsed["attempts"] = attempts
            return parsed
        except Exception as exc:
            elapsed = round(time.time() - started, 3)
            last_error = str(exc)
            attempts.append({"attempt": attempt, "elapsed_s": elapsed, "error": last_error, "error_type": type(exc).__name__})
            is_transient = any(token in last_error for token in TRANSIENT_ERRORS)
            if attempt < max_attempts and is_transient:
                time.sleep(args.retry_backoff * (2 ** (attempt - 1)) + random.random())
                continue
            raise RuntimeError(json.dumps({
                "message": "All attempts failed" if attempt == max_attempts else "Request failed",
                "attempts": attempts,
            }, ensure_ascii=False))
    raise RuntimeError(last_error or "unknown request failure")


def materialize_outputs(args: argparse.Namespace, parsed: Dict[str, Any]) -> Dict[str, Any]:
    data_field = parsed.get("data")
    if not isinstance(data_field, list):
        return {"files": [], "first_url": None, "first_b64_present": False, "saved_metadata": None, "revised_prompts": []}
    items = [item for item in data_field if isinstance(item, dict)]
    first_url = items[0].get("url") if items else None
    first_b64_present = bool(items and items[0].get("b64_json"))
    revised_prompts = [item.get("revised_prompt") for item in items if item.get("revised_prompt")]
    files: List[Dict[str, Any]] = []
    targets = resolve_output_targets(args, parsed, items)
    if args.save:
        for idx, (item, target) in enumerate(zip(items, targets), start=1):
            b64 = item.get("b64_json")
            url = item.get("url")
            saved_path = None
            source = None
            if b64:
                try:
                    raw = base64.b64decode(b64)
                except binascii.Error as exc:
                    raise RuntimeError(f"Invalid base64 image payload: {exc}")
                saved_path = write_bytes(raw, target)
                source = "b64_json"
            files.append({
                "index": idx,
                "path": saved_path,
                "source": source,
                "url": url,
                "b64_json_present": bool(b64),
                "revised_prompt": item.get("revised_prompt"),
            })
    saved_metadata = None
    if args.metadata:
        if args.metadata is True:
            if files and files[0].get("path"):
                meta_path = Path(files[0]["path"] + ".json")
            else:
                output_dir = Path(args.output_dir).expanduser()
                stem = default_output_stem(args.prompt, parsed.get("created"))
                meta_path = output_dir / f"{stem}.json"
        else:
            meta_path = Path(str(args.metadata)).expanduser()
        saved_metadata = save_metadata(meta_path, parsed)
    return {
        "files": files,
        "first_url": first_url,
        "first_b64_present": first_b64_present,
        "saved_metadata": saved_metadata,
        "revised_prompts": revised_prompts,
    }


# ═══════════════════════════════════════════════════════════════════════
# GEO OSS auto-upload (new in GEO version)
# ═══════════════════════════════════════════════════════════════════════

def load_geo_config(geo_config_path: Optional[str]) -> Dict[str, Any]:
    """Load GEO config (openKey, baseUrl, referer) from file."""
    if not geo_config_path:
        geo_config_path = str(DEFAULT_GEO_CONFIG_FILE)
    p = Path(geo_config_path).expanduser()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def oss_get_sign(geo_base_url: str, open_key: str, referer: str, file_name: str) -> Dict[str, Any]:
    """Step 1: Get OSS signed credentials from GEO platform."""
    url = f"{geo_base_url.rstrip('/')}/v1/oss/pre"
    payload = json.dumps({
        "fileName": file_name,
        "businessType": 2,
        "groupId": 1,
        "from": 1,
        "url": "",
    }, ensure_ascii=False)
    cmd = [
        "curl", "-sS", "-X", "POST", url,
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {open_key}",
        "-H", f"Referer: {referer}",
        "-d", payload,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
    try:
        body = json.loads(result.stdout)
    except Exception:
        raise RuntimeError(f"OSS get-sign failed: {result.stdout[:500]} {result.stderr[:500]}")
    if body.get("statusCode", -1) != 0:
        raise RuntimeError(f"OSS get-sign error: {body.get('message', body)}")
    return body.get("data", {})


def oss_upload(host: str, sign_data: Dict[str, Any], file_path: str) -> str:
    """Step 2: Upload file to OSS using signed credentials."""
    cmd = [
        "curl", "-sS", "-X", "POST", host,
    ]
    # Add form fields (order matters for OSS signature)
    form_fields = [
        "expire", "policy", "signature", "OSSAccessKeyId",
        "host", "callback", "dir", "key", "uploadUrl",
        "Content-Disposition",
    ]
    for field in form_fields:
        value = sign_data.get(field)
        if value is not None:
            cmd.extend(["-F", f"{field}={value}"])
    # Add file
    cmd.extend(["-F", f"file=@{file_path}"])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"OSS upload failed: {result.stderr[:500]}")
    # Return the final OSS URL
    return sign_data.get("uploadUrl", sign_data.get("host", "") + sign_data.get("key", ""))


def auto_upload_to_oss(file_path: str, geo_config: Dict[str, Any]) -> Dict[str, Any]:
    """Upload a local image to GEO OSS. Returns {oss_url, upload_url}."""
    open_key = geo_config.get("geo", {}).get("openKey", "") or geo_config.get("openKey", "")
    base_url = geo_config.get("geo", {}).get("baseUrl", "") or geo_config.get("baseUrl", "")
    referer = geo_config.get("geo", {}).get("referer", "") or geo_config.get("referer", "")

    if not open_key or not base_url:
        raise RuntimeError("Missing GEO config: openKey or baseUrl. Check geo-config.json or --geo-config path.")

    file_name = Path(file_path).name
    sign_data = oss_get_sign(base_url, open_key, referer, file_name)
    oss_url = oss_upload(sign_data.get("host", ""), sign_data, file_path)
    return {"oss_url": oss_url, "file_name": file_name}


# ═══════════════════════════════════════════════════════════════════════
# CLI argument parsing
# ═══════════════════════════════════════════════════════════════════════

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GEO Image Generation — generate images via Fangxin API, optionally auto-upload to GEO OSS")
    parser.add_argument("--base-url", default=env("FANGXIN_IMAGE_BASE_URL", default=DEFAULT_BASE_URL))
    parser.add_argument("--api-key", default=env("FANGXIN_IMAGE_API_KEY", "FANGXIN_API_KEY"))
    parser.add_argument("--model", default=env("FANGXIN_IMAGE_MODEL", "FANGXIN_MODEL", default=DEFAULT_MODEL))
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--n", type=int, default=1)
    parser.add_argument("--size", default=DEFAULT_SIZE)
    parser.add_argument("--image", action="append", default=[], help="Reference image path or URL. Repeat for multiple images.")
    parser.add_argument("--mask", default=None, help="Optional mask image path or URL for edit mode")
    parser.add_argument("--input-fidelity", choices=["high", "low"], default="high")
    parser.add_argument("--quality", default="low")
    parser.add_argument("--background", default=None)
    parser.add_argument("--output-format", default=None)
    parser.add_argument("--output-compression", type=int, default=None)
    parser.add_argument("--moderation", default=None)
    parser.add_argument("--style", default=None)
    parser.add_argument("--response-format", default=None)
    parser.add_argument("--user", default=None)
    parser.add_argument("--output", default=None, help="Explicit output file path.")
    parser.add_argument("--output-dir", default=env("FANGXIN_IMAGE_OUTPUT_DIR", default=DEFAULT_OUTPUT_DIR))
    parser.add_argument("--no-save", action="store_true", help="Do not save returned images to disk.")
    parser.add_argument("--metadata", nargs="?", const=True, default=False, help="Save response JSON metadata.")
    parser.add_argument("--timeout", type=int, default=int(env("FANGXIN_IMAGE_TIMEOUT", default=str(DEFAULT_TIMEOUT))))
    parser.add_argument("--download-timeout", type=int, default=int(env("FANGXIN_IMAGE_DOWNLOAD_TIMEOUT", default=str(DEFAULT_DOWNLOAD_TIMEOUT))))
    parser.add_argument("--retries", type=int, default=int(env("FANGXIN_IMAGE_RETRIES", default=str(DEFAULT_RETRIES))))
    parser.add_argument("--retry-backoff", type=float, default=float(env("FANGXIN_IMAGE_RETRY_BACKOFF", default=str(DEFAULT_BACKOFF))))
    # GEO-specific arguments
    parser.add_argument("--auto-upload", action="store_true", help="Auto-upload generated images to GEO OSS after saving.")
    parser.add_argument("--geo-config", default=None, help="Path to geo-config.json (for OSS upload credentials).")
    args = parser.parse_args()
    args.save = not args.no_save
    return args


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

def main() -> None:
    args = parse_args()
    key_info = detect_api_key_source(args.api_key)
    args.api_key = key_info.get("api_key")
    args.base_url = normalize_base_url(args.base_url)
    if not args.api_key:
        print(json.dumps({
            "success": False,
            "error": "Missing API key. Pass --api-key or set FANGXIN_IMAGE_API_KEY / FANGXIN_API_KEY.",
            "debug": {
                "normalized_base_url": args.base_url,
                "api_key_source": key_info.get("source"),
                "api_key_path": key_info.get("path"),
                "checked_api_key_paths": key_info.get("checked_paths"),
            },
        }, ensure_ascii=False))
        sys.exit(2)

    edit_mode = bool(args.image or args.mask)
    path = EDITS_PATH if edit_mode else GENERATIONS_PATH
    url = args.base_url + path
    temp_dir: Optional[tempfile.TemporaryDirectory] = None

    # Load GEO config early if auto-upload is requested
    geo_config: Dict[str, Any] = {}
    if args.auto_upload:
        geo_config = load_geo_config(args.geo_config)

    try:
        if edit_mode:
            temp_dir = tempfile.TemporaryDirectory(prefix="geo-image-gen-")
            args = localize_edit_inputs(args, Path(temp_dir.name))
        result = request_with_retries(url=url, api_key=args.api_key, args=args, edit_mode=edit_mode)
        parsed = result["body"]
        if result.get("status", 0) >= 400:
            raise RuntimeError(json.dumps({
                "message": f"HTTP {result['status']}",
                "body": parsed,
                "attempts": result.get("attempts", []),
            }, ensure_ascii=False))
        artifacts = materialize_outputs(args, parsed)

        # ── GEO auto-upload ──
        oss_results: List[Dict[str, Any]] = []
        if args.auto_upload and artifacts["files"]:
            for file_info in artifacts["files"]:
                local_path = file_info.get("path")
                if not local_path or not Path(local_path).exists():
                    oss_results.append({"index": file_info.get("index"), "error": "no local file to upload"})
                    continue
                try:
                    upload_result = auto_upload_to_oss(local_path, geo_config)
                    oss_results.append({
                        "index": file_info.get("index"),
                        "oss_url": upload_result["oss_url"],
                        "local_path": local_path,
                        "file_name": upload_result["file_name"],
                    })
                except Exception as exc:
                    oss_results.append({
                        "index": file_info.get("index"),
                        "error": str(exc),
                        "local_path": local_path,
                    })

    except Exception as exc:
        detail = str(exc)
        try:
            detail_json = json.loads(detail)
        except Exception:
            detail_json = None
        print(json.dumps({
            "success": False,
            "mode": "edit" if edit_mode else "generate",
            "error": detail_json or detail,
            "debug": {
                "normalized_base_url": args.base_url,
                "request_url": url,
                "api_key_source": key_info.get("source"),
                "api_key_path": key_info.get("path"),
                "checked_api_key_paths": key_info.get("checked_paths"),
            },
            "request": {
                "model": args.model,
                "prompt": args.prompt,
                "n": args.n,
                "size": args.size,
                "image_count": len(args.image),
                "has_mask": bool(args.mask),
                "quality": args.quality,
                "background": args.background,
                "output_format": args.output_format,
            },
        }, ensure_ascii=False))
        sys.exit(1)
    finally:
        if temp_dir is not None:
            temp_dir.cleanup()

    response = {
        "success": True,
        "mode": "edit" if edit_mode else "generate",
        "debug": {
            "normalized_base_url": args.base_url,
            "request_url": url,
            "api_key_source": key_info.get("source"),
            "api_key_path": key_info.get("path"),
            "checked_api_key_paths": key_info.get("checked_paths"),
        },
        "request": {
            "model": args.model,
            "prompt": args.prompt,
            "n": args.n,
            "size": args.size,
            "image_count": len(args.image),
            "has_mask": bool(args.mask),
            "quality": args.quality,
            "background": args.background,
            "output_format": args.output_format,
        },
        "status": result.get("status"),
        "headers": result.get("headers"),
        "elapsed_s": result.get("elapsed_s"),
        "attempt": result.get("attempt"),
        "previous_attempts": result.get("attempts"),
        "response": parsed,
        "first_url": artifacts["first_url"],
        "first_b64_present": artifacts["first_b64_present"],
        "files": artifacts["files"],
        "saved_metadata": artifacts["saved_metadata"],
        "revised_prompts": artifacts["revised_prompts"],
    }

    # Add OSS upload results if applicable
    if oss_results:
        response["oss_upload"] = oss_results
        # Extract first successful OSS URL for convenience
        first_oss = next((r.get("oss_url") for r in oss_results if r.get("oss_url")), None)
        response["first_oss_url"] = first_oss

    print(json.dumps(response, ensure_ascii=False))


if __name__ == "__main__":
    main()
