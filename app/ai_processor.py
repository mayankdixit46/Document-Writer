import os
import re
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.config import (
    LLM_PROVIDER,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    GROQ_API_KEY,
    GROQ_MODEL,
    OPENAI_API_BASE,
    OPENAI_API_KEY,
    OPENAI_MODEL
)

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
    Uses Open-Source LLMs via LangChain (Ollama, Groq, or OpenAI-compatible endpoints)
    to transform fragmented text into structured document content and generate Mermaid process flowcharts.
    """

    def __init__(
        self, 
        provider: Optional[str] = None, 
        api_key: Optional[str] = None, 
        model_name: Optional[str] = None
    ):
        self.provider = (provider or LLM_PROVIDER).lower()
        self.api_key = api_key or os.environ.get("GROQ_API_KEY") or GROQ_API_KEY
        self.model_name = model_name
        self.llm = self._initialize_llm()

    def _initialize_llm(self):
        """
        Initializes the appropriate open-source LangChain LLM instance.
        """
        try:
            # Auto-detect Groq API key format if passed directly
            if self.api_key and self.api_key.startswith("gsk_"):
                self.provider = "groq"

            if self.provider == "groq":
                model = self.model_name or GROQ_MODEL
                print(f"[AIProcessor] Initializing LangChain ChatGroq with model: {model}")
                return ChatGroq(
                    groq_api_key=self.api_key,
                    model_name=model,
                    temperature=0.2
                )
            elif self.provider == "openai_compatible":
                model = self.model_name or OPENAI_MODEL
                base_url = os.environ.get("OPENAI_API_BASE", OPENAI_API_BASE)
                key = self.api_key or os.environ.get("OPENAI_API_KEY", OPENAI_API_KEY)
                print(f"[AIProcessor] Initializing LangChain ChatOpenAI endpoint at: {base_url}")
                return ChatOpenAI(
                    base_url=base_url,
                    api_key=key,
                    model=model,
                    temperature=0.2
                )
            else: # Default to local Ollama ($0 cost)
                model = self.model_name or OLLAMA_MODEL
                base_url = os.environ.get("OLLAMA_BASE_URL", OLLAMA_BASE_URL)
                print(f"[AIProcessor] Initializing LangChain ChatOllama ({model}) at: {base_url}")
                return ChatOllama(
                    base_url=base_url,
                    model=model,
                    temperature=0.2
                )
        except Exception as e:
            print(f"[AIProcessor] Error initializing LangChain LLM ({self.provider}): {e}")
            return None

    def process_fragmented_text(
        self, 
        fragmented_text: str, 
        screenshot_filenames: List[str] = [],
        style_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Structures raw fragmented text into standard document sections & process flow steps using LangChain.
        """
        if not self.llm:
            print("[AIProcessor] LLM not available. Using fallback heuristic processor.")
            return self._heuristic_fallback(fragmented_text, screenshot_filenames)

        # Build prompt using LangChain ChatPromptTemplate
        parser = JsonOutputParser(pydantic_object=StructuredDocument)

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "You are an expert document architect and technical writer. Your task is to analyze fragmented text and structure it into a comprehensive, professional document format.\n{format_instructions}"),
            ("user", """IMPORTANT REQUIREMENTS:
1. Re-organize all fragmented information logically into clear sections (Title, Subtitle, Executive Summary, Main Sections, Process Details, and Conclusion).
2. DO NOT lose any facts, details, or operational instructions from the input text.
3. Extract the exact step-by-step process flow described in the text for the process diagram.
4. Map available input screenshot file names ({screenshots}) to the exact sections where they are referenced or best fit.

INPUT TEXT:
\"\"\"
{input_text}
\"\"\"
""")
        ])

        formatted_screenshots = ', '.join(screenshot_filenames) if screenshot_filenames else 'None'

        try:
            # Try structured output first if supported by the model driver
            try:
                structured_llm = self.llm.with_structured_output(StructuredDocument)
                chain = prompt_template | structured_llm
                result_pydantic = chain.invoke({
                    "format_instructions": parser.get_format_instructions(),
                    "screenshots": formatted_screenshots,
                    "input_text": fragmented_text
                })
                if isinstance(result_pydantic, BaseModel):
                    structured_data = result_pydantic.model_dump()
                elif isinstance(result_pydantic, dict):
                    structured_data = result_pydantic
                else:
                    structured_data = json.loads(str(result_pydantic))
            except Exception as struct_err:
                print(f"[AIProcessor] with_structured_output notice: {struct_err}. Using JsonOutputParser chain.")
                chain = prompt_template | self.llm | parser
                structured_data = chain.invoke({
                    "format_instructions": parser.get_format_instructions(),
                    "screenshots": formatted_screenshots,
                    "input_text": fragmented_text
                })

            # Generate Mermaid diagram script using LangChain
            mermaid_code = self.generate_mermaid_diagram(structured_data, style_info)
            structured_data["mermaid_code"] = mermaid_code

            return structured_data

        except Exception as e:
            print(f"[AIProcessor] LangChain LLM call error: {e}. Falling back to heuristic mode.")
            fallback = self._heuristic_fallback(fragmented_text, screenshot_filenames)
            fallback["mermaid_code"] = self._generate_fallback_mermaid(fallback.get("process_steps", []), style_info)
            return fallback

    def generate_mermaid_diagram(
        self, 
        structured_data: Dict[str, Any], 
        style_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generates clean Mermaid.js flowchart code matching document style using LangChain.
        """
        if not self.llm:
            return self._generate_fallback_mermaid(structured_data.get("process_steps", []), style_info)

        primary_color = (style_info or {}).get("primary_color", "#1A365D")
        secondary_color = (style_info or {}).get("secondary_color", "#2B6CB0")

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "You are an expert software visualization engineer specializing in Mermaid.js diagram syntax. Generate ONLY raw, valid Mermaid flowchart code without markdown wrapping."),
            ("user", """Generate clean, valid, professional Mermaid.js flowchart code for the following process:
Process Title: {process_title}
Steps: {steps_json}

REQUIREMENTS:
- Use standard `graph TD` or `flowchart TD` syntax.
- Include decision nodes {{condition?}} where appropriate.
- Group by role/actor using subgraphs if multiple actors exist.
- Apply clean Mermaid styling with stroke and fill using primary color {primary_color} and secondary color {secondary_color}.
- Output ONLY valid raw Mermaid diagram code block (start directly with `graph TD` or `flowchart TD`).
""")
        ])

        try:
            chain = prompt_template | self.llm | StrOutputParser()
            code = chain.invoke({
                "process_title": structured_data.get('process_title', 'Process Flow'),
                "steps_json": json.dumps(structured_data.get('process_steps', []), indent=2),
                "primary_color": primary_color,
                "secondary_color": secondary_color
            })
            code = code.strip()
            # Clean markdown code fences if present
            code = code.replace("```mermaid", "").replace("```", "").strip()
            return code
        except Exception as e:
            print(f"[AIProcessor] Error generating Mermaid diagram via LangChain: {e}")
            return self._generate_fallback_mermaid(structured_data.get("process_steps", []), style_info)

    def _heuristic_fallback(self, text: str, screenshots: List[str]) -> Dict[str, Any]:
        """
        Fallback heuristic parser if LLM endpoint is unreachable.
        """
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        title = lines[0] if lines else "Standard Operating Procedure Document"
        subtitle = "Automated Document Synthesis"
        
        sections = []
        current_heading = "General Information"
        current_paragraphs = []
        
        for line in lines[1:]:
            if line.endswith(":") or line.isupper() or (len(line) < 40 and not line.endswith(".")):
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
        extracted_steps = []
        step_idx = 1
        for line in lines:
            m = re.match(r'^(?:[\-\*\•]\s*)?(?:step\s*)?(\d+)[\.\:\-\)]\s*(.+)', line, re.IGNORECASE)
            if m:
                step_content = m.group(2).strip()
                parts = re.split(r'[:\-–]', step_content, maxsplit=1)
                t_val = parts[0].strip()
                desc = parts[1].strip() if len(parts) > 1 else t_val
                
                actor = ""
                words = t_val.split()
                if words and words[0].istitle():
                    actor = words[0]
                
                extracted_steps.append({
                    "step_number": step_idx,
                    "actor": actor,
                    "action_title": t_val[:45],
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
                    t_val = step.get("action_title", f"Step {num}")
                    is_decision = step.get("is_decision", False)
                    clean_title = t_val.replace('"', "'")
                    if is_decision:
                        lines.append(f'        S{num}{{"{clean_title}?"}}')
                    else:
                        lines.append(f'        S{num}["{clean_title}"]')
                lines.append('    end')
        else:
            for i, step in enumerate(steps):
                num = step.get("step_number", i + 1)
                t_val = step.get("action_title", f"Step {num}")
                actor = step.get("actor", "")
                is_decision = step.get("is_decision", False)
                label = f"{actor}: {t_val}" if actor else t_val
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
