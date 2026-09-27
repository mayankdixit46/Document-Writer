import os
import re
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.config import DEFAULT_GEMINI_MODEL

class ProcessStep(BaseModel):
    step_number: int
    actor: str = Field(description="Department, role, or system executing this step")
    action_title: str = Field(description="Short title of the step")
    description: str = Field(description="Detailed explanation of the process step")
    next_steps: List[str] = Field(default_factory=list, description="IDs or titles of subsequent steps")
    is_decision: bool = Field(default=False, description="Whether this step involves a decision / branch")

class DocumentSection(BaseModel):
    heading: str
    paragraphs: List[str] = Field(default_factory=list)
    bullet_points: List[str] = Field(default_factory=list)
    callout_box: Optional[str] = None
    screenshot_references: List[str] = Field(default_factory=list, description="File names or indices of input screenshots relevant to this section")

class StructuredDocument(BaseModel):
    title: str
    subtitle: str
    version: str = "1.0"
    date: str = "Today"
    executive_summary: str
    sections: List[DocumentSection]
    process_title: str
    process_steps: List[ProcessStep]

class AIProcessor:
    """
    Uses Gemini API (google-genai SDK) to transform fragmented text 
    into structured document content and generate Mermaid process flowcharts.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def process_fragmented_text(
        self, 
        fragmented_text: str, 
        screenshot_filenames: List[str] = [],
        style_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Structures raw fragmented text into standard document sections & process flow steps.
        If GEMINI_API_KEY is not available, uses an intelligent fallback heuristic parser.
        """
        if not self.client:
            print("[AIProcessor] No Gemini API key provided. Using fallback heuristic processor.")
            return self._heuristic_fallback(fragmented_text, screenshot_filenames)

        prompt = f"""
You are an expert document architect and technical writer. 
Analyze the following raw, fragmented, or unformatted text input and structure it into a comprehensive, professional document format.

IMPORTANT REQUIREMENTS:
1. Re-organize all fragmented information logically into clear sections (Title, Subtitle, Executive Summary, Main Sections, Process Details, and Conclusion).
2. DO NOT lose any facts, details, or operational instructions from the input text.
3. Extract the exact step-by-step process flow described in the text for the process diagram.
4. Map available input screenshot file names ({', '.join(screenshot_filenames) if screenshot_filenames else 'None'}) to the exact sections where they are referenced or best fit.

INPUT TEXT:
\"\"\"
{fragmented_text}
\"\"\"
"""

        try:
            # Call Gemini model using google-genai SDK
            response = self.client.models.generate_content(
                model=DEFAULT_GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=StructuredDocument.model_json_schema(),
                    temperature=0.2
                )
            )

            structured_data = json.loads(response.text)
            
            # Generate Mermaid diagram script using Gemini
            mermaid_code = self.generate_mermaid_diagram(structured_data, style_info)
            structured_data["mermaid_code"] = mermaid_code

            return structured_data

        except Exception as e:
            print(f"[AIProcessor] Gemini API call error: {e}. Falling back to heuristic mode.")
            fallback = self._heuristic_fallback(fragmented_text, screenshot_filenames)
            fallback["mermaid_code"] = self._generate_fallback_mermaid(fallback.get("process_steps", []), style_info)
            return fallback

    def generate_mermaid_diagram(
        self, 
        structured_data: Dict[str, Any], 
        style_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generates clean Mermaid.js flowchart code matching document style.
        """
        if not self.client:
            return self._generate_fallback_mermaid(structured_data.get("process_steps", []), style_info)

        primary_color = (style_info or {}).get("primary_color", "#1A365D")
        secondary_color = (style_info or {}).get("secondary_color", "#2B6CB0")

        prompt = f"""
Generate clean, valid, professional Mermaid.js flowchart code for the following process:
Process Title: {structured_data.get('process_title', 'Process Flow')}
Steps: {json.dumps(structured_data.get('process_steps', []), indent=2)}

REQUIREMENTS:
- Use standard `graph TD` or `flowchart TD` syntax.
- Include decision nodes {{condition?}} where appropriate.
- Group by role/actor using subgraphs if multiple actors exist.
- Apply clean Mermaid styling with stroke and fill using primary color {primary_color} and secondary color {secondary_color}.
- Output ONLY valid raw Mermaid diagram code block (no outer markdown fences, just start directly with `graph TD` or `flowchart TD`).
"""

        try:
            response = self.client.models.generate_content(
                model=DEFAULT_GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1
                )
            )
            code = response.text.strip()
            # Clean fences if present
            code = code.replace("```mermaid", "").replace("```", "").strip()
            return code
        except Exception as e:
            print(f"[AIProcessor] Error generating Mermaid diagram via Gemini: {e}")
            return self._generate_fallback_mermaid(structured_data.get("process_steps", []), style_info)

    def _heuristic_fallback(self, text: str, screenshots: List[str]) -> Dict[str, Any]:
        """
        Fallback parser if API key is not supplied or network fails.
        """
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        title = lines[0] if lines else "Standard Operating Procedure Document"
        subtitle = "Automated Document Synthesis"
        
        sections = []
        current_heading = "General Information"
        current_paragraphs = []
        
        for line in lines[1:]:
            if line.endswith(":") or line.isupper() or len(line) < 40 and not line.endswith("."):
                if current_paragraphs:
                    sections.append({
                        "heading": current_heading,
                        "paragraphs": current_paragraphs,
                        "bullet_points": [],
                        "callout_box": None,
                        "screenshot_references": []
                    })
                    current_paragraphs = []
                current_heading = line.rstrip(":")
            else:
                current_paragraphs.append(line)

        if current_paragraphs or not sections:
            sections.append({
                "heading": current_heading,
                "paragraphs": current_paragraphs or [text],
                "bullet_points": [],
                "callout_box": "Note: Maintain all input screenshots as specified in standard guidelines.",
                "screenshot_references": screenshots
            })

        # Dynamic process steps extraction heuristic
        import re
        extracted_steps = []
        step_idx = 1
        for line in lines:
            m = re.match(r'^(?:[\-\*\•]\s*)?(?:step\s*)?(\d+)[\.\:\-\)]\s*(.+)', line, re.IGNORECASE)
            if m:
                step_content = m.group(2).strip()
                parts = re.split(r'[:\-–]', step_content, maxsplit=1)
                title = parts[0].strip()
                desc = parts[1].strip() if len(parts) > 1 else title
                
                actor = ""
                words = title.split()
                if words and words[0].istitle():
                    actor = words[0]
                
                extracted_steps.append({
                    "step_number": step_idx,
                    "actor": actor,
                    "action_title": title[:45],
                    "description": desc,
                    "next_steps": [f"Step {step_idx+1}"],
                    "is_decision": any(w in desc.lower() for w in ["if", "check", "verify", "review", "approve"])
                })
                step_idx += 1

        process_steps = extracted_steps if extracted_steps else [
            {"step_number": 1, "actor": "User", "action_title": "Input Submission", "description": "User submits text and template file", "next_steps": ["Step 2"], "is_decision": False},
            {"step_number": 2, "actor": "System", "action_title": "Template & Text Analysis", "description": "Extract formatting rules and parse fragmented content", "next_steps": ["Step 3"], "is_decision": False},
            {"step_number": 3, "actor": "AI Engine", "action_title": "Process Flow Generation", "description": "Construct process diagram and embed screenshots", "next_steps": ["Step 4"], "is_decision": False},
            {"step_number": 4, "actor": "System", "action_title": "Final Output Generation", "description": "Export final document (.docx / .pdf)", "next_steps": [], "is_decision": False}
        ]

        return {
            "title": title,
            "subtitle": subtitle,
            "version": "1.0",
            "date": "2026-09-27",
            "executive_summary": text[:300] + ("..." if len(text) > 300 else ""),
            "sections": sections,
            "process_title": title + " - Flow",
            "process_steps": process_steps,
            "mermaid_code": self._generate_fallback_mermaid(process_steps)
        }

    def _generate_fallback_mermaid(self, steps: List[Dict[str, Any]], style_info: Optional[Dict[str, Any]] = None) -> str:
        primary = (style_info or {}).get("primary_color", "#1A365D")
        lines = ["graph TD", f"    classDef default fill:#EBF8FF,stroke:{primary},stroke-width:2px;"]
        
        actor_groups = {}
        for step in steps:
            actor = (step.get("actor") or "General Process").strip()
            if actor not in actor_groups:
                actor_groups[actor] = []
            actor_groups[actor].append(step)

        if len(actor_groups) > 1:
            for actor, step_list in actor_groups.items():
                safe_id = "lane_" + re.sub(r'[^a-zA-Z0-9]', '_', actor)
                lines.append(f'    subgraph {safe_id}["{actor}"]')
                for step in step_list:
                    num = step.get("step_number", 1)
                    title = step.get("action_title", f"Step {num}")
                    is_decision = step.get("is_decision", False)
                    clean_title = title.replace('"', "'")
                    if is_decision:
                        lines.append(f'        S{num}{{"{clean_title}?"}}')
                    else:
                        lines.append(f'        S{num}["{clean_title}"]')
                lines.append('    end')
        else:
            for i, step in enumerate(steps):
                num = step.get("step_number", i + 1)
                title = step.get("action_title", f"Step {num}")
                actor = step.get("actor", "")
                is_decision = step.get("is_decision", False)
                label = f"{actor}: {title}" if actor else title
                clean_label = label.replace('"', "'")
                if is_decision:
                    lines.append(f'    S{num}{{"{clean_label}?"}}')
                else:
                    lines.append(f'    S{num}["{clean_label}"]')

        for i in range(len(steps) - 1):
            curr_num = steps[i].get("step_number", i + 1)
            next_num = steps[i+1].get("step_number", i + 2)
            lines.append(f"    S{curr_num} --> S{next_num}")
                
        return "\n".join(lines)
