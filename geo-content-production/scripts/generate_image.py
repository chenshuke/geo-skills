#!/usr/bin/env python3
"""
Compatibility wrapper for GEO image generation.

The active implementation has moved from the old direct image API to the GEO
platform `/v1/text-to-img` endpoint. This Python file is kept only so legacy
commands that call `generate_image.py` continue to work; it delegates to the
Node.js implementation in `generate_image.js`.
"""
import os
import subprocess
import sys
from pathlib import Path

script = Path(__file__).with_suffix('.js')
if not script.exists():
    print(f"Missing Node implementation: {script}", file=sys.stderr)
    sys.exit(1)

cmd = ['node', str(script), *sys.argv[1:]]
try:
    raise SystemExit(subprocess.call(cmd, cwd=os.getcwd()))
except FileNotFoundError:
    print('Node.js is required for GEO /v1/text-to-img image generation.', file=sys.stderr)
    sys.exit(127)
