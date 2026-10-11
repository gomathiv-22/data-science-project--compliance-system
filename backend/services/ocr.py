"""
backend/services/ocr.py
OCR pipeline: extract text from PDF or image files.

Architecture:
  PDF (native)  → pdfplumber   (fast, no model download)
  PDF (scanned) → pdfplumber fails → EasyOCR fallback
  Image         → EasyOCR
  Fallback      → pytesseract (if easyocr unavailable)
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: str) -> tuple[str, str]:
    """
    Extract text from a PDF or image file.

    Returns:
        (extracted_text, method_used)
        method_used: 'pdfplumber' | 'easyocr' | 'tesseract' | 'failed'
    """
    file_path = str(file_path)
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        text, method = _extract_from_pdf(file_path)
    elif ext in {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}:
        text, method = _extract_from_image(file_path)
    else:
        logger.warning(f"Unsupported file type: {ext}")
        return "", "failed"

    return text.strip(), method


def _extract_from_pdf(file_path: str) -> tuple[str, str]:
    """Try pdfplumber first; fall back to EasyOCR for scanned PDFs."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        combined = "\n".join(text_parts).strip()
        if len(combined) > 50:  # consider it a native PDF
            logger.info("PDF text extracted via pdfplumber")
            return combined, "pdfplumber"
        logger.info("pdfplumber returned minimal text — attempting OCR")
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    # Convert PDF pages to images and run OCR
    return _ocr_pdf_as_images(file_path)


def _ocr_pdf_as_images(file_path: str) -> tuple[str, str]:
    """Convert PDF to PIL images and run EasyOCR / Tesseract."""
    images = []
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(file_path, dpi=200)
    except Exception:
        images = _pdf_to_pil_images(file_path)

    if not images:
        return "", "failed"

    all_text = []
    for img in images:
        text, _ = _extract_from_pil_image(img)
        if text:
            all_text.append(text)

    combined = "\n".join(all_text)
    return combined, "easyocr"


def _pdf_to_pil_images(file_path: str):
    """Use pdfplumber page images as fallback when pdf2image is unavailable."""
    try:
        import pdfplumber
        images = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                im = page.to_image(resolution=200).original
                images.append(im)
        return images
    except Exception as e:
        logger.error(f"Could not convert PDF to images: {e}")
        return []


def _extract_from_image(file_path: str) -> tuple[str, str]:
    """Extract text from an image file."""
    try:
        from PIL import Image
        img = Image.open(file_path)
        return _extract_from_pil_image(img)
    except Exception as e:
        logger.error(f"Failed to open image {file_path}: {e}")
        return "", "failed"


def _extract_from_pil_image(img) -> tuple[str, str]:
    """Run EasyOCR or Tesseract on a PIL Image."""
    # Try EasyOCR first
    try:
        return _easyocr_extract(img)
    except ImportError:
        logger.info("EasyOCR not available — trying Tesseract")
    except Exception as e:
        logger.warning(f"EasyOCR failed: {e} — trying Tesseract")

    # Try Tesseract
    try:
        return _tesseract_extract(img)
    except Exception as e:
        logger.error(f"Tesseract also failed: {e}")

    return "", "failed"


def _easyocr_extract(img) -> tuple[str, str]:
    """Run EasyOCR on a PIL Image and return extracted text."""
    import easyocr
    import numpy as np

    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    img_array = np.array(img.convert("RGB"))
    results = reader.readtext(img_array, detail=0, paragraph=True)
    text = "\n".join(results)
    logger.info("OCR completed via EasyOCR")
    return text, "easyocr"


def _tesseract_extract(img) -> tuple[str, str]:
    """Run Tesseract on a PIL Image and return extracted text."""
    import pytesseract
    text = pytesseract.image_to_string(img, lang="eng")
    logger.info("OCR completed via Tesseract")
    return text, "tesseract"
