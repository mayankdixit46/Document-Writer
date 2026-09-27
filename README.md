# Document Writer - AI Document & Process Flow Synthesizer

A full-stack web-based application that converts raw, fragmented text and a standard document template (.docx / .pdf) into a standardized, professionally formatted document with an automatically generated process flow diagram while maintaining all input screenshots intact.

---

## 🌟 Key Features

1. **Standard Template Parsing**:
   - Extracts typography, font families, primary/secondary colors, header/footer text, and page margins from uploaded template `.docx` or `.pdf` files.

2. **AI-Powered Text Restructuring (Powered by Gemini API / google-genai)**:
   - Takes fragmented raw text input and re-organizes it into structured sections: Title, Subtitle, Executive Summary, Main Headings, Bullet Lists, and Callout Boxes.

3. **Automated Process Flow Diagram Generation**:
   - Extracts process steps from the text input and generates visual Mermaid flowchart diagrams (`graph TD` / `flowchart TD`) styled according to the template color scheme.

4. **Screenshot Integrity**:
   - Preserves all uploaded input screenshots and images intact without modification, embedding them into their referenced sections.

5. **Multi-Format Export**:
   - Generates formatted Microsoft Word (`.docx`) and Adobe PDF (`.pdf`) documents available for instant download.

6. **Modern Drag & Drop Web Interface**:
   - Live browser preview with Mermaid.js rendering, interactive Mermaid code editor, progress status tracking, and 1-click sample process data loader.

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Dependencies installed in `.venv` (see `requirements.txt`)

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

## 📂 Project Structure

```
.
├── app/
│   ├── main.py                # FastAPI routes & static file server
│   ├── config.py              # Configuration & style defaults
│   ├── template_parser.py     # Parses .docx/.pdf template formatting
│   ├── ai_processor.py        # Gemini API (google-genai) text & process logic engine
│   ├── diagram_renderer.py    # Renders Mermaid diagrams to high-res PNG
│   ├── document_builder.py    # Assembles final Word (.docx) document
│   ├── pdf_exporter.py        # Exports .docx to PDF format
│   └── static/
│       ├── index.html         # Web UI interface
│       ├── app.js             # Client JS & Mermaid rendering
│       └── styles.css         # UI styles
├── uploads/                   # Uploaded templates, text, and screenshots
├── outputs/                   # Generated .docx, .pdf, and diagram images
├── requirements.txt           # Project dependencies
└── README.md
```
