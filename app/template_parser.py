import os
from pathlib import Path
import re
from typing import Dict, Any, List, Optional
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pypdf import PdfReader
import pymupdf as fitz
from PIL import Image
import io

from app.config import DEFAULT_STYLE

class TemplateParser:
    """
    Parses standard template documents (.docx or .pdf) to extract typography, 
    color schemes, headers, footers, and sample images/diagrams.
    """

    @staticmethod
    def parse_template(template_path: Path) -> Dict[str, Any]:
        suffix = template_path.suffix.lower()
        if suffix == ".docx":
            return TemplateParser._parse_docx(template_path)
        elif suffix == ".pdf":
            return TemplateParser._parse_pdf(template_path)
        else:
            return DEFAULT_STYLE.copy()

    @staticmethod
    def _parse_docx(file_path: Path) -> Dict[str, Any]:
        style_info = DEFAULT_STYLE.copy()
        try:
            doc = Document(file_path)
            
            # Extract section margins
            if doc.sections:
                section = doc.sections[0]
                style_info["margin_top_inch"] = section.top_margin.inches if section.top_margin else 1.0
                style_info["margin_bottom_inch"] = section.bottom_margin.inches if section.bottom_margin else 1.0
                style_info["margin_left_inch"] = section.left_margin.inches if section.left_margin else 1.0
                style_info["margin_right_inch"] = section.right_margin.inches if section.right_margin else 1.0

                # Extract header & footer text
                if section.header and section.header.paragraphs:
                    header_text = " ".join([p.text.strip() for p in section.header.paragraphs if p.text.strip()])
                    if header_text:
                        style_info["header_text"] = header_text

                if section.footer and section.footer.paragraphs:
                    footer_text = " ".join([p.text.strip() for p in section.footer.paragraphs if p.text.strip()])
                    if footer_text:
                        style_info["footer_text"] = footer_text

            # Inspect Heading and Normal styles
            for p in doc.paragraphs:
                if p.style.name.startswith("Heading 1") or p.style.name.startswith("Heading"):
                    if p.runs:
                        font = p.runs[0].font
                        if font.name:
                            style_info["font_heading"] = font.name
                        if font.color and font.color.rgb:
                            style_info["primary_color"] = f"#{font.color.rgb}"
                    break

            for p in doc.paragraphs:
                if p.style.name == "Normal" and p.runs:
                    font = p.runs[0].font
                    if font.name:
                        style_info["font_primary"] = font.name
                    if font.color and font.color.rgb:
                        style_info["text_color"] = f"#{font.color.rgb}"
                    break

        except Exception as e:
            print(f"[TemplateParser] Warning parsing docx template {file_path}: {e}")

        return style_info

    @staticmethod
    def _parse_pdf(file_path: Path) -> Dict[str, Any]:
        style_info = DEFAULT_STYLE.copy()
        try:
            doc = fitz.open(file_path)
            if len(doc) > 0:
                first_page = doc[0]
                text = first_page.get_text("text")
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                if lines:
                    style_info["header_text"] = lines[0]
                    if len(lines) > 1:
                        style_info["footer_text"] = lines[-1]
            doc.close()
        except Exception as e:
            print(f"[TemplateParser] Warning parsing pdf template {file_path}: {e}")

        return style_info
