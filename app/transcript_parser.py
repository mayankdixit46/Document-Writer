import re
import json
from typing import Union
from pathlib import Path

class TranscriptParser:
    """
    Parses VTT (WebVTT), SRT, JSON, and raw meeting transcripts.
    Strips timestamp cues, styling headers, tags, and formatting noise 
    to extract clean speaker dialogue and process text.
    """

    @staticmethod
    def parse_transcript(content_or_path: Union[str, Path]) -> str:
        if isinstance(content_or_path, Path):
            content = content_or_path.read_text(encoding="utf-8", errors="ignore")
        else:
            content = content_or_path

        content = content.strip()
        if not content:
            return ""

        # Handle JSON transcripts (e.g., Whisper API output, YouTube transcript JSON)
        if content.startswith("{") or content.startswith("["):
            try:
                data = json.loads(content)
                if isinstance(data, dict):
                    if "text" in data and isinstance(data["text"], str):
                        return data["text"].strip()
                    elif "segments" in data and isinstance(data["segments"], list):
                        seg_texts = [seg.get("text", "").strip() for seg in data["segments"] if seg.get("text")]
                        return "\n".join(seg_texts)
                elif isinstance(data, list):
                    item_texts = [item.get("text", "").strip() for item in data if isinstance(item, dict) and item.get("text")]
                    if item_texts:
                        return "\n".join(item_texts)
            except Exception:
                pass

        lines = content.splitlines()
        cleaned_lines = []

        for line in lines:
            l = line.strip()

            # Skip WebVTT header, metadata, region directives, style blocks
            if l.startswith("WEBVTT") or l.startswith("NOTE") or l.startswith("STYLE") or l.startswith("REGION") or l.startswith("Kind:"):
                continue

            # Skip empty lines
            if not l:
                continue

            # Skip numeric sequence index numbers (SRT / VTT cue numbers)
            if l.isdigit():
                continue

            # Skip VTT / SRT timestamp lines: 00:00:01.000 --> 00:00:04.500
            if "-->" in l and re.search(r'\d{2}:\d{2}', l):
                continue

            # Remove VTT/HTML inline markup tags like <v Speaker>, </v>, <i>, </i>, <b>, </b>, <00:00:01.000>
            l = re.sub(r'<[^>]+>', '', l).strip()

            # Remove leading inline bracketed timestamps like [00:01:23] or (01:23:45)
            l = re.sub(r'^(?:\[|\()? \d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)? (?:\]|\))?\s*[\-:\s]*', '', l, flags=re.IGNORECASE).strip()

            if l:
                # Avoid duplicate adjacent lines
                if not cleaned_lines or cleaned_lines[-1] != l:
                    cleaned_lines.append(l)

        return "\n".join(cleaned_lines)
