#!/usr/bin/env python3
"""Compatibility wrapper for the relocated GEO image generator.

The canonical script lives at:
  ../geo-content-production/scripts/generate_image.py
"""
from pathlib import Path
import runpy

target = Path(__file__).resolve().parents[2] / "geo-content-production" / "scripts" / "generate_image.py"
runpy.run_path(str(target), run_name="__main__")
