import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import UPLOAD_DIR, OUTPUT_DIR, DEFAULT_STYLE
from app.template_parser import TemplateParser
from app.ai_processor import AIProcessor
from app.diagram_renderer import DiagramRenderer
from app.document_builder import DocumentBuilder
from app.pdf_exporter import PDFExporter

app = FastAPI(
    title="Document Writer - Standard Document & Process Flow Synthesizer",
    description="Transforms fragmented text into standard formatted documents with automated AI process flow diagrams.",
    version="1.0.0"
)

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_ui():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return HTMLResponse(content=index_path.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Document Writer API is running</h1>")


@app.post("/api/process")
async def process_document(
    template_file: Optional[UploadFile] = File(None),
    text_file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    screenshots: List[UploadFile] = File([]),
    api_key: Optional[str] = Form(None)
):
    """
    Main endpoint: Synthesizes fragmented text + standard template + screenshots into a formatted document with process flow diagram.
    """
    request_id = str(uuid.uuid4())[:8]
    req_upload_dir = UPLOAD_DIR / request_id
    req_upload_dir.mkdir(exist_ok=True, parents=True)

    # 1. Handle Template File
    template_style = DEFAULT_STYLE.copy()
    if template_file and template_file.filename:
        template_path = req_upload_dir / f"template_{template_file.filename}"
        with open(template_path, "wb") as buffer:
            shutil.copyfileobj(template_file.file, buffer)
        template_style = TemplateParser.parse_template(template_path)
    
    # 2. Handle Text Input
    extracted_text = ""
    if raw_text and raw_text.strip():
        extracted_text = raw_text.strip()
    elif text_file and text_file.filename:
        text_path = req_upload_dir / text_file.filename
        with open(text_path, "wb") as buffer:
            shutil.copyfileobj(text_file.file, buffer)
        extracted_text = text_path.read_text(encoding="utf-8", errors="ignore")

    if not extracted_text:
        raise HTTPException(status_code=400, detail="Please provide fragmented input text or upload a text file.")

    # 3. Handle Screenshots / Attached Images
    screenshot_paths = {}
    screenshot_names = []
    for shot in screenshots:
        if shot and shot.filename:
            shot_path = req_upload_dir / shot.filename
            with open(shot_path, "wb") as buffer:
                shutil.copyfileobj(shot.file, buffer)
            screenshot_paths[shot.filename] = shot_path
            screenshot_names.append(shot.filename)

    # 4. Process Content with AI (Gemini API via google-genai)
    ai_engine = AIProcessor(api_key=api_key)
    structured_data = ai_engine.process_fragmented_text(
        fragmented_text=extracted_text,
        screenshot_filenames=screenshot_names,
        style_info=template_style
    )

    # 5. Render Process Flow Diagram
    mermaid_code = structured_data.get("mermaid_code", "")
    diagram_png_path = OUTPUT_DIR / f"process_flow_{request_id}.png"
    DiagramRenderer.render_mermaid_to_png(mermaid_code, diagram_png_path)

    # 6. Build Formatted Word (.docx) Document
    docx_filename = f"Synthesized_Document_{request_id}.docx"
    doc_output_path = DocumentBuilder.build_document(
        structured_data=structured_data,
        style_info=template_style,
        diagram_image_path=diagram_png_path,
        screenshot_paths=screenshot_paths,
        output_filename=docx_filename
    )

    # 7. Convert to PDF
    pdf_filename = f"Synthesized_Document_{request_id}.pdf"
    pdf_output_path = PDFExporter.export_to_pdf(doc_output_path, pdf_filename)

    return {
        "status": "success",
        "request_id": request_id,
        "structured_data": structured_data,
        "mermaid_code": mermaid_code,
        "template_style": template_style,
        "files": {
            "docx": docx_filename,
            "pdf": pdf_filename,
            "diagram": diagram_png_path.name
        }
    }


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Requested document not found.")
    
    media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if filename.endswith(".pdf"):
        media_type = "application/pdf"
    elif filename.endswith(".png"):
        media_type = "image/png"

    return FileResponse(path=file_path, filename=filename, media_type=media_type)


@app.post("/api/render-diagram")
async def render_diagram(mermaid_code: str = Form(...)):
    request_id = str(uuid.uuid4())[:8]
    diagram_png_path = OUTPUT_DIR / f"custom_diagram_{request_id}.png"
    DiagramRenderer.render_mermaid_to_png(mermaid_code, diagram_png_path)
    return {"status": "success", "filename": diagram_png_path.name}
