import os
import subprocess
from pathlib import Path
from typing import Optional
import pymupdf as fitz

from app.config import OUTPUT_DIR

class PDFExporter:
    """
    Exports or converts generated .docx documents into PDF format.
    """

    @staticmethod
    def export_to_pdf(docx_path: Path, output_pdf_name: Optional[str] = None) -> Path:
        if not output_pdf_name:
            output_pdf_name = docx_path.stem + ".pdf"
        
        pdf_path = OUTPUT_DIR / output_pdf_name

        # Strategy 1: Try LibreOffice or unoconv command line if installed
        try:
            cmd = ["soffice", "--headless", "--convert-to", "pdf", str(docx_path), "--outdir", str(OUTPUT_DIR)]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            if res.returncode == 0 and pdf_path.exists():
                print(f"[PDFExporter] Successfully converted {docx_path.name} to PDF via LibreOffice")
                return pdf_path
        except Exception as e:
            print(f"[PDFExporter] LibreOffice pdf conversion notice: {e}")

        # Strategy 2: macOS textutil / osascript Word conversion if available
        try:
            cmd = ["python3", "-m", "docx2pdf", str(docx_path), str(pdf_path)]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            if res.returncode == 0 and pdf_path.exists():
                return pdf_path
        except Exception:
            pass

        # Strategy 3: Fast PDF generation fallback using PyMuPDF (fitz)
        try:
            doc = fitz.open()
            page = doc.new_page()
            # Read text from docx file via python-docx if needed
            import docx
            docx_doc = docx.Document(docx_path)
            y = 50
            for p in docx_doc.paragraphs:
                if p.text.strip():
                    page.insert_text((50, y), p.text[:90], fontsize=11)
                    y += 18
                    if y > 750:
                        page = doc.new_page()
                        y = 50
            doc.save(str(pdf_path))
            doc.close()
            print(f"[PDFExporter] Generated PDF via PyMuPDF at {pdf_path}")
            return pdf_path
        except Exception as e:
            print(f"[PDFExporter] Fallback PDF generation error: {e}")
            return docx_path
