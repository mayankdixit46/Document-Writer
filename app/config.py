import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

# Default Gemini model according to modern SDK standards
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

# Fallback styling options if template parsing yields defaults
DEFAULT_STYLE = {
    "font_primary": "Calibri",
    "font_heading": "Calibri Light",
    "primary_color": "#1A365D",    # Deep navy blue
    "secondary_color": "#2B6CB0",  # Slate blue
    "accent_color": "#D69E2E",     # Gold accent
    "text_color": "#2D3748",       # Dark gray body text
    "bg_color": "#FFFFFF",
    "header_text": "Standard Operating Document",
    "footer_text": "Confidential & Proprietary",
    "margin_top_inch": 1.0,
    "margin_bottom_inch": 1.0,
    "margin_left_inch": 1.0,
    "margin_right_inch": 1.0,
}
