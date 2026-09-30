import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

# Open-Source LangChain LLM Configuration
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "ollama").lower()  # Options: 'ollama', 'groq', 'openai_compatible'
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", "http://localhost:1234/v1")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "not-needed")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "local-model")

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
