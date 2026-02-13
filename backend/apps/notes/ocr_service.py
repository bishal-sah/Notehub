"""
OCR service for extracting text from scanned/photographed handwritten notes.
Uses Tesseract OCR via pytesseract with image preprocessing via Pillow.
"""
import os
import io
import sys
import shutil
import logging
from typing import NamedTuple

from PIL import Image, ImageFilter, ImageEnhance

logger = logging.getLogger(__name__)

# ─── Auto-detect Tesseract on Windows ─────────────────────
_poppler_bin: str | None = None
if sys.platform == 'win32':
    _win_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.isfile(_win_path):
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = _win_path
        logger.info(f"Tesseract binary set to {_win_path}")

    # Auto-detect Poppler (needed by pdf2image)
    import glob as _glob
    _poppler_candidates = _glob.glob(
        os.path.join(os.path.expanduser('~'),
                     'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages',
                     'oschwartz10612.Poppler*', '**', 'Library', 'bin'),
        recursive=True,
    )
    if not _poppler_candidates:
        _poppler_candidates = _glob.glob(r'C:\Program Files\poppler*\Library\bin') + \
                              _glob.glob(r'C:\Program Files\poppler*\bin')
    for _p in _poppler_candidates:
        if os.path.isfile(os.path.join(_p, 'pdftoppm.exe')):
            _poppler_bin = _p
            logger.info(f"Poppler bin set to {_p}")
            break


class OcrResult(NamedTuple):
    text: str
    confidence: float  # 0-100
    success: bool
    error: str


# ─── Image Preprocessing ─────────────────────────────────

def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Preprocess a scanned/photographed image for better OCR accuracy.
    Gentle pipeline that preserves handwritten strokes.
    """
    # Convert to grayscale
    img = image.convert('L')

    # Upscale small images — Tesseract needs ~300 DPI equivalent
    w, h = img.size
    if max(w, h) < 2000:
        scale = 2000 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Light contrast boost (preserve pen strokes)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.3)

    # Slight brightness boost to clean background
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)

    # Gentle sharpen
    img = img.filter(ImageFilter.SHARPEN)

    # Light denoise — median filter removes speckles without destroying strokes
    img = img.filter(ImageFilter.MedianFilter(size=3))

    return img


# ─── PDF to Images ────────────────────────────────────────

def pdf_to_images(file_path: str, max_pages: int = 30) -> list[Image.Image]:
    """Convert PDF pages to PIL Images for OCR processing."""
    images = []
    try:
        from PyPDF2 import PdfReader
        # PyPDF2 doesn't directly render pages to images.
        # Try pdf2image if available, else fall back to extracting embedded images.
        try:
            from pdf2image import convert_from_path
            kwargs: dict = {'dpi': 250}
            if _poppler_bin:
                kwargs['poppler_path'] = _poppler_bin
            if max_pages:
                kwargs['last_page'] = max_pages
            images = convert_from_path(file_path, **kwargs)
        except ImportError:
            # Fallback: extract any embedded images from the PDF
            reader = PdfReader(file_path)
            for page in reader.pages:
                if '/XObject' in (page.get('/Resources') or {}):
                    x_objects = page['/Resources']['/XObject'].get_object()
                    for obj_name in x_objects:
                        obj = x_objects[obj_name].get_object()
                        if obj.get('/Subtype') == '/Image':
                            try:
                                data = obj.get_data()
                                img = Image.open(io.BytesIO(data))
                                images.append(img)
                            except Exception:
                                continue
    except Exception as e:
        logger.warning(f"PDF to images failed: {e}")
    return images


# ─── Core OCR ─────────────────────────────────────────────

def _tesseract_available() -> bool:
    """Check if Tesseract binary is available."""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def ocr_image(image: Image.Image) -> tuple[str, float]:
    """
    Run OCR on a single PIL Image.
    Returns (extracted_text, confidence_score).
    """
    import pytesseract

    processed = preprocess_image(image)

    # Tesseract config optimised for scanned/handwritten notes:
    #   --psm 6  : assume a single uniform block of text
    #   --oem 3  : use LSTM neural net (best for varied fonts/handwriting)
    #   preserve_interword_spaces=1 : keep spacing intact
    custom_cfg = r'--psm 6 --oem 3 -c preserve_interword_spaces=1'

    # Get detailed OCR data including confidence
    data = pytesseract.image_to_data(
        processed, output_type=pytesseract.Output.DICT, config=custom_cfg,
    )
    confidences = [
        int(c) for c, t in zip(data['conf'], data['text'])
        if int(c) > 0 and t.strip()
    ]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    # Get full text
    text = pytesseract.image_to_string(processed, lang='eng', config=custom_cfg)
    return text.strip(), round(avg_conf, 1)


def ocr_from_file(file_path: str, file_type: str) -> OcrResult:
    """
    Main entry point: extract text from a file using OCR.
    Supports image files (jpg, jpeg, png) and scanned PDFs.
    """
    if not _tesseract_available():
        return OcrResult(
            text='',
            confidence=0.0,
            success=False,
            error='Tesseract OCR is not installed or not found in PATH. '
                  'Install from: https://github.com/tesseract-ocr/tesseract',
        )

    ft = file_type.lower()
    all_text: list[str] = []
    all_conf: list[float] = []

    try:
        if ft in ('jpg', 'jpeg', 'png'):
            img = Image.open(file_path)
            text, conf = ocr_image(img)
            all_text.append(text)
            all_conf.append(conf)

        elif ft == 'pdf':
            images = pdf_to_images(file_path)
            if not images:
                return OcrResult(
                    text='',
                    confidence=0.0,
                    success=False,
                    error='Could not extract images from PDF. The PDF may not contain scanned pages.',
                )
            for img in images:
                text, conf = ocr_image(img)
                if text:
                    all_text.append(text)
                    all_conf.append(conf)
        else:
            return OcrResult(
                text='',
                confidence=0.0,
                success=False,
                error=f'Unsupported file type for OCR: {ft}. Use JPG, PNG, or scanned PDF.',
            )

        combined_text = '\n\n'.join(all_text)
        avg_confidence = sum(all_conf) / len(all_conf) if all_conf else 0.0

        if not combined_text.strip():
            return OcrResult(
                text='',
                confidence=0.0,
                success=False,
                error='OCR completed but no text could be extracted. The image may be too blurry or have no readable text.',
            )

        return OcrResult(
            text=combined_text,
            confidence=round(avg_confidence, 1),
            success=True,
            error='',
        )

    except Exception as e:
        logger.exception(f"OCR failed for {file_path}")
        return OcrResult(
            text='',
            confidence=0.0,
            success=False,
            error=f'OCR processing error: {str(e)}',
        )
