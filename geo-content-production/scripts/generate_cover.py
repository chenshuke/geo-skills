#!/usr/bin/env python3
"""
GEO Cover Generator — 纯本地封面图片生成，不依赖任何 API。

支持两种生成方式：
  text     — 渐变背景 + 居中标题 + 可选副标题/关键词标签
  template — 预设布局模板（rank/review/guide/compare）

依赖：Pillow（pip install Pillow）
用法：python3 generate_cover.py --title "2026年壁挂炉推荐TOP10" --style text --color blue
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("❌ 需要安装 Pillow：pip install Pillow")
    sys.exit(1)

# ── 配色方案 ────────────────────────────────────────────────────────────────

COLORS = {
    "blue":   {"gradient": [(26, 54, 93), (43, 108, 176)],  "accent": (147, 197, 253), "light": (219, 234, 254), "tag_bg": (30, 64, 115)},
    "red":    {"gradient": [(116, 42, 42), (229, 62, 62)],   "accent": (252, 165, 165), "light": (254, 226, 226), "tag_bg": (127, 29, 29)},
    "green":  {"gradient": [(34, 84, 61), (56, 161, 105)],   "accent": (134, 239, 172), "light": (220, 252, 231), "tag_bg": (20, 83, 45)},
    "orange": {"gradient": [(123, 52, 30), (221, 107, 32)],   "accent": (253, 186, 116), "light": (254, 235, 200), "tag_bg": (124, 45, 18)},
    "purple": {"gradient": [(68, 51, 122), (128, 90, 213)],  "accent": (196, 181, 253), "light": (237, 233, 254), "tag_bg": (55, 48, 107)},
}

DEFAULT_WIDTH = 1200
DEFAULT_HEIGHT = 630

# ── 字体加载 ────────────────────────────────────────────────────────────────

def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """加载中文字体，按优先级尝试多个系统字体。"""
    font_names = (
        ["PingFang SC Semibold", "PingFang SC Medium"] if bold
        else ["PingFang SC Regular", "PingFang SC Medium"]
    )
    # macOS 系统字体路径
    font_paths = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        # Linux 常见中文字体
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        # Windows
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # 回退到默认字体
    return ImageFont.load_default()


def load_english_font(size: int) -> ImageFont.FreeTypeFont:
    """加载英文字体。"""
    paths = [
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Menlo.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for path in paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return load_font(size, bold=True)


# ── 绘制工具 ────────────────────────────────────────────────────────────────

def draw_gradient(img: Image.Image, colors: list, direction: str = "diagonal"):
    """绘制渐变背景。"""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    c1, c2 = colors[0], colors[1]

    if direction == "horizontal":
        for x in range(w):
            r = int(c1[0] + (c2[0] - c1[0]) * x / w)
            g = int(c1[1] + (c2[1] - c1[1]) * x / w)
            b = int(c1[2] + (c2[2] - c1[2]) * x / w)
            draw.line([(x, 0), (x, h)], fill=(r, g, b))
    elif direction == "vertical":
        for y in range(h):
            r = int(c1[0] + (c2[0] - c1[0]) * y / h)
            g = int(c1[1] + (c2[1] - c1[1]) * y / h)
            b = int(c1[2] + (c2[2] - c1[2]) * y / h)
            draw.line([(0, y), (w, y)], fill=(r, g, b))
    else:  # diagonal
        for y in range(h):
            ratio = (x_ratio := y / h)
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            draw.line([(0, y), (w, y)], fill=(r, g, b))

    return img


def draw_rounded_rect(draw: ImageDraw.Draw, xy, radius: int, fill=None, outline=None, width: int = 1):
    """绘制圆角矩形。"""
    x1, y1, x2, y2 = xy
    if fill:
        draw.rounded_rectangle(xy, radius=radius, fill=fill)
    if outline:
        draw.rounded_rectangle(xy, radius=radius, outline=outline, width=width)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list:
    """自动换行，返回每行文字列表。"""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        current_line = ""
        for char in paragraph:
            test_line = current_line + char
            bbox = font.getbbox(test_line)
            if bbox[2] - bbox[0] > max_width:
                if current_line:
                    lines.append(current_line)
                current_line = char
            else:
                current_line = test_line
        if current_line:
            lines.append(current_line)
    return lines


def calc_font_size(text: str, max_width: int, max_height: int, bold: bool = False, min_size: int = 24, max_size: int = 80):
    """计算使文字适应区域的最佳字号。"""
    low, high = min_size, max_size
    best_size = min_size
    while low <= high:
        mid = (low + high) // 2
        font = load_font(mid, bold=bold)
        lines = wrap_text(text, font, max_width)
        total_height = sum(font.getbbox(line)[3] - font.getbbox(line)[1] for line in lines) + (len(lines) - 1) * mid * 0.4
        if total_height <= max_height and all(font.getbbox(line)[2] - font.getbbox(line)[0] <= max_width for line in lines):
            best_size = mid
            low = mid + 1
        else:
            high = mid - 1
    return best_size


# ── text 风格 ────────────────────────────────────────────────────────────────

def draw_text_style(title: str, color_name: str, width: int, height: int,
                    subtitle: str = "", keywords: list = None) -> Image.Image:
    """渐变背景 + 居中标题 + 可选副标题/关键词标签。"""
    palette = COLORS.get(color_name, COLORS["blue"])
    img = Image.new("RGB", (width, height))
    draw_gradient(img, palette["gradient"], direction="diagonal")
    draw = ImageDraw.Draw(img)

    margin = int(width * 0.08)

    # --- 绘制半透明装饰圆 ---
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    # 右上角大圆
    overlay_draw.ellipse([width * 0.6, -height * 0.3, width * 1.3, height * 0.4],
                          fill=(*palette["gradient"][1], 30))
    # 左下角小圆
    overlay_draw.ellipse([-width * 0.15, height * 0.5, width * 0.25, height * 1.1],
                          fill=(*palette["gradient"][1], 25))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    draw = ImageDraw.Draw(img)

    # --- 绘制主标题 ---
    available_w = width - 2 * margin
    available_h = int(height * 0.45) if not subtitle else int(height * 0.35)
    font_size = calc_font_size(title, available_w, available_h, bold=True, min_size=28, max_size=72)
    font = load_font(font_size, bold=True)
    lines = wrap_text(title, font, available_w)

    line_height = int(font_size * 1.5)
    total_text_h = line_height * len(lines)
    start_y = (height - total_text_h) // 2 - (30 if subtitle else 0) - (40 if keywords else 0)

    for i, line in enumerate(lines):
        y = start_y + i * line_height
        bbox = font.getbbox(line)
        text_w = bbox[2] - bbox[0]
        x = (width - text_w) // 2
        # 文字阴影
        draw.text((x + 2, y + 2), line, fill=(0, 0, 0, 80), font=font)
        # 主文字
        draw.text((x, y), line, fill=(255, 255, 255), font=font)

    # --- 绘制副标题 ---
    if subtitle:
        sub_font_size = max(20, font_size // 2)
        sub_font = load_font(sub_font_size)
        sub_bbox = sub_font.getbbox(subtitle)
        sub_w = sub_bbox[2] - sub_bbox[0]
        sub_x = (width - sub_w) // 2
        sub_y = start_y + total_text_h + 15
        draw.text((sub_x, sub_y), subtitle, fill=palette["accent"], font=sub_font)

    # --- 绘制关键词标签 ---
    if keywords:
        tag_font_size = max(14, font_size // 3)
        tag_font = load_font(tag_font_size)
        tag_h = tag_font_size + 14
        tag_padding = 12
        tags = keywords[:4]  # 最多 4 个标签
        # 计算标签总宽度
        tag_widths = []
        for kw in tags:
            bbox = tag_font.getbbox(kw)
            tag_widths.append(bbox[2] - bbox[0] + tag_padding * 2)
        gap = 10
        total_w = sum(tag_widths) + gap * (len(tags) - 1)
        start_x = (width - total_w) // 2
        tag_y = height - int(height * 0.12)

        for i, kw in enumerate(tags):
            tw = tag_widths[i]
            tx = start_x + sum(tag_widths[:i]) + gap * i
            draw_rounded_rect(draw, [tx, tag_y, tx + tw, tag_y + tag_h],
                             radius=tag_h // 2, fill=palette["tag_bg"])
            kw_bbox = tag_font.getbbox(kw)
            kw_w = kw_bbox[2] - kw_bbox[0]
            draw.text((tx + (tw - kw_w) // 2, tag_y + 7), kw,
                      fill=palette["accent"], font=tag_font)

    return img


# ── template 风格 ─────────────────────────────────────────────────────────────

def draw_rank_template(title: str, color_name: str, width: int, height: int,
                       subtitle: str = "", keywords: list = None) -> Image.Image:
    """TOP 排行榜模板。"""
    palette = COLORS.get(color_name, COLORS["red"])
    img = Image.new("RGB", (width, height))
    draw_gradient(img, palette["gradient"], direction="diagonal")
    draw = ImageDraw.Draw(img)

    margin = int(width * 0.08)

    # 顶部色带
    draw.rectangle([0, 0, width, int(height * 0.06)], fill=palette["tag_bg"])

    # "TOP 10 排行榜" 标签
    tag_font = load_font(20, bold=True)
    tag_text = "📊 TOP 排行榜"
    tag_bbox = tag_font.getbbox(tag_text)
    tag_w = tag_bbox[2] - tag_bbox[0] + 24
    tag_h = 36
    tag_x = width - tag_w - margin
    tag_y = int(height * 0.06) + 15
    draw_rounded_rect(draw, [tag_x, tag_y, tag_x + tag_w, tag_y + tag_h],
                     radius=tag_h // 2, fill=palette["tag_bg"])
    draw.text((tag_x + 12, tag_y + 7), tag_text, fill=palette["accent"], font=tag_font)

    # 左侧装饰条
    bar_x = margin
    bar_w = 8
    draw.rectangle([bar_x, int(height * 0.25), bar_x + bar_w, int(height * 0.75)],
                   fill=palette["accent"])

    # 主标题
    title_margin = margin + 40
    available_w = width - title_margin - margin
    available_h = int(height * 0.4)
    font_size = calc_font_size(title, available_w, available_h, bold=True, min_size=32, max_size=68)
    font = load_font(font_size, bold=True)
    lines = wrap_text(title, font, available_w)
    line_height = int(font_size * 1.5)
    total_text_h = line_height * len(lines)
    start_y = (height - total_text_h) // 2

    for i, line in enumerate(lines):
        y = start_y + i * line_height
        draw.text((title_margin + 2, y + 2), line, fill=(0, 0, 0, 80), font=font)
        draw.text((title_margin, y), line, fill=(255, 255, 255), font=font)

    # 底部关键词
    if keywords:
        tag_font = load_font(16)
        tags = keywords[:4]
        tag_h = 30
        tag_padding = 10
        tag_widths = [tag_font.getbbox(kw)[2] - tag_font.getbbox(kw)[0] + tag_padding * 2 for kw in tags]
        gap = 8
        total_w = sum(tag_widths) + gap * (len(tags) - 1)
        start_x = (width - total_w) // 2
        tag_y = height - int(height * 0.1)
        for i, kw in enumerate(tags):
            tw = tag_widths[i]
            tx = start_x + sum(tag_widths[:i]) + gap * i
            draw_rounded_rect(draw, [tx, tag_y, tx + tw, tag_y + tag_h], radius=15, fill=palette["tag_bg"])
            kw_bbox = tag_font.getbbox(kw)
            draw.text((tx + (tw - (kw_bbox[2] - kw_bbox[0])) // 2, tag_y + 5), kw,
                      fill=palette["accent"], font=tag_font)

    return img


def draw_review_template(title: str, color_name: str, width: int, height: int,
                         subtitle: str = "", keywords: list = None) -> Image.Image:
    """评测模板。"""
    palette = COLORS.get(color_name, COLORS["blue"])
    img = Image.new("RGB", (width, height))
    draw_gradient(img, palette["gradient"], direction="diagonal")
    draw = ImageDraw.Draw(img)

    margin = int(width * 0.08)

    # 顶部 "专业评测" 标签
    tag_font = load_font(18, bold=True)
    tag_text = "🔍 专业评测"
    tag_bbox = tag_font.getbbox(tag_text)
    tag_w = tag_bbox[2] - tag_bbox[0] + 24
    tag_h = 34
    draw_rounded_rect(draw, [margin, margin, margin + tag_w, margin + tag_h],
                     radius=tag_h // 2, fill=palette["tag_bg"])
    draw.text((margin + 12, margin + 6), tag_text, fill=palette["accent"], font=tag_font)

    # 星级装饰
    star_font = load_english_font(36)
    draw.text((width - margin - 150, margin + 5), "★ ★ ★ ★ ★", fill=(255, 215, 0), font=star_font)

    # 右侧评分区域
    score_x = width - margin - int(width * 0.18)
    score_y = int(height * 0.25)
    score_font = load_english_font(56)
    draw.text((score_x, score_y), "9.5", fill=palette["accent"], font=score_font)
    small_font = load_font(14)
    draw.text((score_x, score_y + 60), "综合评分", fill=(200, 200, 200), font=small_font)

    # 主标题
    available_w = width - 2 * margin - int(width * 0.22)
    available_h = int(height * 0.45)
    font_size = calc_font_size(title, available_w, available_h, bold=True, min_size=28, max_size=64)
    font = load_font(font_size, bold=True)
    lines = wrap_text(title, font, available_w)
    line_height = int(font_size * 1.5)
    total_text_h = line_height * len(lines)
    start_y = int(height * 0.35) + (int(height * 0.45) - total_text_h) // 2

    for i, line in enumerate(lines):
        y = start_y + i * line_height
        draw.text((margin + 2, y + 2), line, fill=(0, 0, 0, 80), font=font)
        draw.text((margin, y), line, fill=(255, 255, 255), font=font)

    # 底部分割线
    draw.line([(margin, height - int(height * 0.15)), (width - margin, height - int(height * 0.15))],
              fill=palette["accent"], width=2)

    if subtitle:
        sub_font = load_font(18)
        draw.text((margin, height - int(height * 0.15) + 15), subtitle, fill=palette["light"], font=sub_font)

    return img


def draw_guide_template(title: str, color_name: str, width: int, height: int,
                        subtitle: str = "", keywords: list = None) -> Image.Image:
    """使用指南模板。"""
    palette = COLORS.get(color_name, COLORS["green"])
    img = Image.new("RGB", (width, height))
    draw_gradient(img, palette["gradient"], direction="diagonal")
    draw = ImageDraw.Draw(img)

    margin = int(width * 0.08)

    # 顶部 "使用指南" 标签
    tag_font = load_font(18, bold=True)
    tag_text = "📖 使用指南"
    tag_bbox = tag_font.getbbox(tag_text)
    tag_w = tag_bbox[2] - tag_bbox[0] + 24
    tag_h = 34
    draw_rounded_rect(draw, [margin, margin, margin + tag_w, margin + tag_h],
                     radius=tag_h // 2, fill=palette["tag_bg"])
    draw.text((margin + 12, margin + 6), tag_text, fill=palette["accent"], font=tag_font)

    # 左侧步骤装饰
    steps_y_start = int(height * 0.25)
    steps_y_end = int(height * 0.75)
    step_font = load_english_font(16)
    step_count = 4
    step_gap = (steps_y_end - steps_y_start) // (step_count + 1)
    for i in range(step_count):
        y = steps_y_start + step_gap * (i + 1)
        # 连接线
        if i < step_count - 1:
            draw.line([(margin + 10, y + 12), (margin + 10, y + step_gap - 12)],
                      fill=palette["accent"], width=2)
        # 圆点
        draw.ellipse([margin + 2, y, margin + 20, y + 18], fill=palette["accent"])
        draw.text((margin + 5, y + 1), str(i + 1), fill=palette["tag_bg"], font=step_font)

    # 主标题
    title_x = margin + 50
    available_w = width - title_x - margin
    available_h = int(height * 0.45)
    font_size = calc_font_size(title, available_w, available_h, bold=True, min_size=28, max_size=60)
    font = load_font(font_size, bold=True)
    lines = wrap_text(title, font, available_w)
    line_height = int(font_size * 1.5)
    total_text_h = line_height * len(lines)
    start_y = (height - total_text_h) // 2

    for i, line in enumerate(lines):
        y = start_y + i * line_height
        draw.text((title_x + 2, y + 2), line, fill=(0, 0, 0, 80), font=font)
        draw.text((title_x, y), line, fill=(255, 255, 255), font=font)

    return img


def draw_compare_template(title: str, color_name: str, width: int, height: int,
                          subtitle: str = "", keywords: list = None) -> Image.Image:
    """对比评测模板。"""
    palette = COLORS.get(color_name, COLORS["blue"])
    img = Image.new("RGB", (width, height))
    draw_gradient(img, palette["gradient"], direction="diagonal")
    draw = ImageDraw.Draw(img)

    margin = int(width * 0.08)

    # 中央 VS 标识
    vs_font = load_english_font(48)
    vs_text = "VS"
    vs_bbox = vs_font.getbbox(vs_text)
    vs_w = vs_bbox[2] - vs_bbox[0] + 30
    vs_h = vs_bbox[3] - vs_bbox[1] + 16
    vs_x = (width - vs_w) // 2
    vs_y = (height - vs_h) // 2
    draw_rounded_rect(draw, [vs_x, vs_y, vs_x + vs_w, vs_y + vs_h], radius=12, fill=palette["tag_bg"])
    draw.text((vs_x + 15, vs_y + 5), vs_text, fill=palette["accent"], font=vs_font)

    # 主标题（VS 下方）
    if title:
        available_w = width - 2 * margin
        available_h = int(height * 0.2)
        font_size = calc_font_size(title, available_w, available_h, bold=True, min_size=20, max_size=40)
        font = load_font(font_size, bold=True)
        lines = wrap_text(title, font, available_w)
        line_height = int(font_size * 1.4)
        total_text_h = line_height * len(lines)
        start_y = vs_y + vs_h + 20

        for i, line in enumerate(lines):
            y = start_y + i * line_height
            bbox = font.getbbox(line)
            tw = bbox[2] - bbox[0]
            draw.text(((width - tw) // 2 + 1, y + 1), line, fill=(0, 0, 0, 80), font=font)
            draw.text(((width - tw) // 2, y), line, fill=(255, 255, 255), font=font)

    # 顶部 "对比评测" 标签
    tag_font = load_font(18, bold=True)
    tag_text = "⚖️ 对比评测"
    tag_bbox = tag_font.getbbox(tag_text)
    tag_w = tag_bbox[2] - tag_bbox[0] + 24
    tag_h = 34
    draw_rounded_rect(draw, [margin, margin, margin + tag_w, margin + tag_h],
                     radius=tag_h // 2, fill=palette["tag_bg"])
    draw.text((margin + 12, margin + 6), tag_text, fill=palette["accent"], font=tag_font)

    return img


# ── 批量生成 ─────────────────────────────────────────────────────────────────

def generate_single(title: str, style: str, color_name: str, width: int, height: int,
                    subtitle: str = "", keywords: list = None, template_name: str = None) -> Image.Image:
    """生成单张封面。"""
    if style == "text":
        return draw_text_style(title, color_name, width, height, subtitle, keywords)
    elif style == "template":
        template_name = template_name or "rank"
        templates = {
            "rank": draw_rank_template,
            "review": draw_review_template,
            "guide": draw_guide_template,
            "compare": draw_compare_template,
        }
        draw_fn = templates.get(template_name, draw_rank_template)
        return draw_fn(title, color_name, width, height, subtitle, keywords)
    else:
        raise ValueError(f"未知样式: {style}，支持 text / template")


def sanitize_filename(title: str, max_len: int = 60) -> str:
    """将标题转换为安全的文件名。"""
    import re
    name = title.lower().strip()
    # 移除特殊字符
    name = re.sub(r'[^\w\s\u4e00-\u9fff-]', '', name)
    # 中文标题用序号
    name = re.sub(r'\s+', '_', name)
    if len(name) > max_len:
        name = name[:max_len]
    return name or "cover"


# ── 主入口 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="GEO 封面图片生成器（纯本地，不依赖 API）")
    parser.add_argument("--title", help="文章标题")
    parser.add_argument("--subtitle", default="", help="副标题")
    parser.add_argument("--keywords", default="", help="关键词（逗号分隔）")
    parser.add_argument("--style", default="text", choices=["text", "template"], help="生成样式（默认 text）")
    parser.add_argument("--template", default="rank", choices=["rank", "review", "guide", "compare"], help="模板类型（style=template 时使用）")
    parser.add_argument("--color", default="blue", choices=list(COLORS.keys()), help="主题色（默认 blue）")
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH, help=f"宽度（默认 {DEFAULT_WIDTH}）")
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT, help=f"高度（默认 {DEFAULT_HEIGHT}）")
    parser.add_argument("--output", "-o", help="输出文件路径")
    parser.add_argument("--output-dir", help="输出目录（批量模式）")
    parser.add_argument("--prefix", default="", help="文件名前缀（如 hd）")
    parser.add_argument("--batch", help="批量模式：JSON 文件路径，格式为标题数组")
    parser.add_argument("--mapping", action="store_true", help="生成 cover_mapping.json")

    args = parser.parse_args()

    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()] if args.keywords else []

    if args.batch:
        # ── 批量模式 ──
        with open(args.batch, "r", encoding="utf-8") as f:
            titles = json.load(f)

        if not isinstance(titles, list):
            print("❌ 批量文件格式错误，需要 JSON 数组")
            sys.exit(1)

        output_dir = Path(args.output_dir or ".")
        output_dir.mkdir(parents=True, exist_ok=True)

        mapping = {}
        for i, item in enumerate(titles, 1):
            title = item["title"] if isinstance(item, dict) else str(item)
            sub = item.get("subtitle", "") if isinstance(item, dict) else ""
            kws = item.get("keywords", []) if isinstance(item, dict) else []
            if isinstance(kws, str):
                kws = [k.strip() for k in kws.split(",") if k.strip()]

            num = f"{i:02d}"
            prefix = f"{args.prefix}_" if args.prefix else ""
            filename = f"{prefix}cover_{num}.png"
            filepath = output_dir / filename

            img = generate_single(title, args.style, args.color,
                                  args.width, args.height, sub, kws, args.template)
            img.save(str(filepath), "PNG")

            mapping[num] = {
                "title": title,
                "local_path": str(filepath),
                "oss_url": ""
            }
            print(f"✅ [{i}/{len(titles)}] {filename} — {title[:30]}...")

        if args.mapping:
            mapping_path = output_dir / "cover_mapping.json"
            with open(mapping_path, "w", encoding="utf-8") as f:
                json.dump(mapping, f, ensure_ascii=False, indent=2)
            print(f"📋 cover_mapping.json → {mapping_path}")

        print(f"\n🎉 完成！共生成 {len(titles)} 张封面 → {output_dir}/")

    else:
        # ── 单张模式 ──
        if not args.title:
            parser.error("单张模式需要 --title 参数")

        img = generate_single(args.title, args.style, args.color,
                              args.width, args.height, args.subtitle, keywords, args.template)

        output = args.output or f"cover_{sanitize_filename(args.title)}.png"
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        img.save(output, "PNG")
        print(f"✅ 封面已保存 → {output}")


if __name__ == "__main__":
    main()
