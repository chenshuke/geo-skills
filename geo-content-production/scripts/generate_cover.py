#!/usr/bin/env python3
"""
Compatibility wrapper for GEO cover generation.

The active implementation uses the GEO platform `/v1/text-to-img` through
`generate_cover.js`. This file is kept only so legacy commands that call
`generate_cover.py` do not accidentally use the removed local SVG/template path.
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
    print('Node.js is required for GEO platform cover generation.', file=sys.stderr)
    sys.exit(127)
