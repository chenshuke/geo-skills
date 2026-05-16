#!/usr/bin/env python3
"""Backward-compatible wrapper for GEO credential helpers.

Canonical implementation: geo-runtime/scripts/credentials.py
"""
from pathlib import Path
import sys

SUITE_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_SCRIPTS = SUITE_ROOT / "geo-runtime" / "scripts"
sys.path.insert(0, str(RUNTIME_SCRIPTS))

from credentials import *  # noqa: F401,F403
