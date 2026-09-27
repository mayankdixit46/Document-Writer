import os
import base64
import zlib
from pathlib import Path
from typing import Optional
import requests
from PIL import Image, ImageDraw, ImageFont
import io

from app.config import OUTPUT_DIR

class DiagramRenderer:
    """
    Renders Mermaid flowchart diagram code into high-resolution PNG image 
    for embedding into Microsoft Word (.docx) documents.
    """

    @staticmethod
    def render_mermaid_to_png(mermaid_code: str, output_path: Path) -> Path:
        """
        Attempts rendering via Kroki API, and falls back to local PIL renderer if offline.
        """
        # Strategy 1: Kroki.io API render
        try:
            png_bytes = DiagramRenderer._fetch_kroki_png(mermaid_code)
            if png_bytes:
                with open(output_path, "wb") as f:
                    f.write(png_bytes)
                print(f"[DiagramRenderer] Successfully rendered Mermaid diagram via Kroki API to {output_path}")
                return output_path
        except Exception as e:
            print(f"[DiagramRenderer] Kroki API render attempt failed: {e}. Using local fallback renderer.")

        # Strategy 2: Local PIL Flowchart Renderer fallback
        return DiagramRenderer._render_local_flowchart(mermaid_code, output_path)

    @staticmethod
    def _fetch_kroki_png(mermaid_code: str) -> Optional[bytes]:
        url = "https://kroki.io/mermaid/png"
        response = requests.post(url, json={"diagram_source": mermaid_code}, timeout=8)
        if response.status_code == 200:
            return response.content
        return None

    @staticmethod
    def _render_local_flowchart(mermaid_code: str, output_path: Path) -> Path:
        """
        Local PIL diagram generator fallback. Parses steps from lines and draws clean flowchart boxes.
        """
        lines = [l.strip() for l in mermaid_code.split("\n") if l.strip() and not l.strip().startswith("graph") and not l.strip().startswith("flowchart") and not l.strip().startswith("classDef")]
        
        nodes = []
        for line in lines:
            if "[" in line and "]" in line:
                # Node definition
                node_id = line.split("[")[0].strip()
                label = line.split("[")[1].split("]")[0].replace('"', '').strip()
                nodes.append((node_id, label))
            elif "-->" in line:
                parts = line.split("-->")
                src = parts[0].strip()
                tgt = parts[1].strip()
                if src not in [n[0] for n in nodes]:
                    nodes.append((src, src))
                if tgt not in [n[0] for n in nodes]:
                    nodes.append((tgt, tgt))

        if not nodes:
            nodes = [("1", "Input Text & Template"), ("2", "AI Processing & Analysis"), ("3", "Diagram & Document Synthesis"), ("4", "Formatted Output Document")]

        # Render Canvas
        padding = 40
        box_width = 300
        box_height = 70
        spacing = 50
        
        img_width = box_width + padding * 2
        img_height = len(nodes) * (box_height + spacing) + padding * 2 - spacing
        
        img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("Helvetica", 16)
            font_small = ImageFont.truetype("Helvetica", 12)
        except Exception:
            font = ImageFont.load_default()
            font_small = font

        # Colors
        primary_color = (26, 54, 93)     # #1A365D
        box_bg = (235, 248, 255)         # #EBF8FF
        border_color = (43, 108, 176)     # #2B6CB0
        arrow_color = (43, 108, 176)

        y = padding
        prev_center = None

        for i, (node_id, label) in enumerate(nodes):
            x1 = padding
            y1 = y
            x2 = padding + box_width
            y2 = y + box_height

            # Draw Box
            draw.rounded_rectangle([x1, y1, x2, y2], radius=10, fill=box_bg, outline=border_color, width=2)
            
            # Step Badge
            badge_text = f"Step {i+1}"
            draw.text((x1 + 15, y1 + 10), badge_text, fill=primary_color, font=font_small)

            # Label Text
            draw.text((x1 + 15, y1 + 32), label[:35], fill=primary_color, font=font)

            current_center = (padding + box_width // 2, y1)

            # Draw Arrow from previous box
            if prev_center:
                draw.line([(prev_center[0], prev_center[1] + box_height), current_center], fill=arrow_color, width=3)
                # Arrowhead
                ax = current_center[0]
                ay = current_center[1]
                draw.polygon([(ax, ay), (ax - 6, ay - 10), (ax + 6, ay - 10)], fill=arrow_color)

            prev_center = (padding + box_width // 2, y1)
            y += box_height + spacing

        img.save(output_path, "PNG")
        print(f"[DiagramRenderer] Generated local fallback flowchart PNG at {output_path}")
        return output_path
