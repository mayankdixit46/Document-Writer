# Document Writer - AI Document & Process Flow Synthesizer (Open-Source LangChain Powered)

A full-stack web-based application that converts raw, fragmented text / WebVTT transcripts and a standard document template (.docx / .pdf) into a standardized, professionally formatted document with an automatically generated process flow diagram while maintaining all input screenshots intact.

Powered by **Open-Source LLMs via LangChain** (`langchain-ollama`, `langchain-groq`, `langchain-openai`) for **$0 / low cost execution**.

---

## 🌟 Key Features

1. **Open-Source & Cheap / Free Execution ($0 Cost)**:
   - Uses **LangChain** with local open-source models (**Ollama** with `llama3.1`, `qwen2.5`, `mistral`), ultra-cheap hosted cloud LLMs (**Groq** with `llama-3.3-70b-versatile`), or custom OpenAI-compatible endpoints (**LM Studio / vLLM**).

2. **Standard Template Parsing**:
   - Extracts typography, font families, primary/secondary colors, header/footer text, and page margins from uploaded template `.docx` or `.pdf` files.

3. **AI-Powered Text Restructuring & WebVTT Transcript Processing**:
   - Parses WebVTT audio transcripts or fragmented notes and re-organizes them into structured sections: Title, Subtitle, Executive Summary, Main Headings, Bullet Lists, and Callout Boxes.

4. **Automated Process Flow Diagram Generation**:
   - Extracts process steps from text/transcripts and generates visual Mermaid flowchart diagrams (`graph TD` / `flowchart TD`) styled according to the template color scheme.

5. **Screenshot Integrity**:
   - Preserves all uploaded input screenshots and images intact without modification, embedding them into their referenced sections.

6. **Multi-Format Export**:
   - Generates formatted Microsoft Word (`.docx`) and Adobe PDF (`.pdf`) documents available for instant download.

7. **Modern Drag & Drop Web Interface**:
   - Live browser preview with Mermaid.js rendering, provider selector (Ollama, Groq, LM Studio), interactive Mermaid code editor, progress tracking, and sample process/VTT loaders.

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Dependencies installed in `.venv` (see `requirements.txt`)
- (Optional) [Ollama](https://ollama.com/) installed locally for 100% free ($0 cost) open-source LLM processing (`ollama pull llama3.1`)

### 2. Running the Server

To launch the web application server:

```bash
# Activate virtual environment
source .venv/bin/activate

# Launch FastAPI server with Uvicorn
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Then open your browser and go to:
👉 **`http://127.0.0.1:8000/`**

---

## ⚙️ Open-Source LLM Provider Options

| Provider | Cost | Description | How to Use |
| --- | --- | --- | --- |
| **🦙 Ollama (Local)** | **$0 (100% Free)** | Runs open-source LLMs locally on your Mac/PC | Select **Ollama** in UI header. Ensure Ollama is running (`ollama serve`). Default model: `llama3.1`. |
| **⚡ Groq (Cloud)** | **Near $0 / Ultra-Cheap** | Blazing fast cloud inference for Llama 3.3 / Qwen | Select **Groq** in UI header & enter your Groq API key. |
| **🔌 Custom / LM Studio** | **$0 (Local)** | Connect to any local or remote OpenAI-compatible LLM endpoint | Select **Custom / LM Studio** in UI header. |

---

## 📂 Project Structure

```
.
├── app/
│   ├── main.py                # FastAPI routes & static file server
│   ├── config.py              # Configuration & style defaults
│   ├── template_parser.py     # Parses .docx/.pdf template formatting
│   ├── ai_processor.py        # LangChain Open-Source LLM engine (Ollama/Groq/OpenAI)
│   ├── diagram_renderer.py    # Renders Mermaid diagrams to high-res PNG
│   ├── document_builder.py    # Assembles final Word (.docx) document
│   ├── pdf_exporter.py        # Exports .docx to PDF format
│   └── static/
│       ├── index.html         # Web UI interface with provider dropdown
│       ├── app.js             # Client JS & Mermaid rendering
│       └── styles.css         # UI styles
├── uploads/                   # Uploaded templates, text, and screenshots
├── outputs/                   # Generated .docx, .pdf, and diagram images
├── requirements.txt           # Open-source LangChain dependencies
└── README.md
```
