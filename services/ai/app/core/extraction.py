import io
import logging

logger = logging.getLogger(__name__)

# Minimum characters to consider pdfplumber extraction successful
# Scanned PDFs typically return 0 or a few garbage chars
PDFPLUMBER_MIN_CHARS = 50


def _extract_pdfplumber(raw: bytes) -> tuple[str, int]:
    import pdfplumber

    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        page_count = len(pdf.pages)
        pages = [p.extract_text() or "" for p in pdf.pages]
        text = "\n\n".join(pages)
    return text.strip(), page_count


def _extract_pypdf(raw: bytes) -> tuple[str, int]:
    import pypdf

    reader = pypdf.PdfReader(io.BytesIO(raw))
    page_count = len(reader.pages)
    pages = [p.extract_text() or "" for p in reader.pages]
    text = "\n\n".join(pages)
    return text.strip(), page_count


def _pdf_to_images(raw: bytes, dpi: int = 200):
    from pdf2image import convert_from_bytes

    return convert_from_bytes(raw, dpi=dpi)


def _ocr_with_rapidocr(images) -> tuple[str, float]:
    from rapidocr_onnxruntime import RapidOCR

    engine = RapidOCR()
    all_text = []
    confidences: list[float] = []

    for img in images:
        result, elapse = engine(img)
        if result is None:
            continue
        for box, text, conf in result:
            if text and text.strip():
                all_text.append(text.strip())
                confidences.append(conf if conf is not None else 0.0)

    avg_confidence = (sum(confidences) / len(confidences)) if confidences else 0.0
    return "\n".join(all_text).strip(), avg_confidence


def _extract_with_rapidocr(raw: bytes, dpi: int = 200) -> tuple[str, int, float]:
    images = _pdf_to_images(raw, dpi=dpi)
    text, confidence = _ocr_with_rapidocr(images)
    return text, len(images), confidence


def extract_pdf_text(raw: bytes) -> dict:
    page_count = 0
    text = ""
    engine = "none"
    confidence = 0.0

    try:
        text, page_count = _extract_pdfplumber(raw)
        if text and len(text) >= PDFPLUMBER_MIN_CHARS:
            engine = "pdfplumber"
            logger.info("pdfplumber extracted %d chars from %d pages", len(text), page_count)
            return {"text": text, "page_count": page_count, "engine": engine, "confidence": 1.0}
        else:
            logger.info(
                "pdfplumber returned only %d chars (min %d), falling back to OCR",
                len(text), PDFPLUMBER_MIN_CHARS,
            )
    except Exception as exc:
        logger.warning("pdfplumber failed: %s, falling back to pypdf", exc)

    if not text or len(text) < PDFPLUMBER_MIN_CHARS:
        try:
            text, page_count = _extract_pypdf(raw)
            if text and len(text) >= PDFPLUMBER_MIN_CHARS:
                engine = "pypdf"
                logger.info("pypdf extracted %d chars from %d pages", len(text), page_count)
                return {"text": text, "page_count": page_count, "engine": engine, "confidence": 1.0}
        except Exception as exc:
            logger.warning("pypdf also failed: %s, falling back to OCR", exc)

    try:
        logger.info("Running RapidOCR on %d pages", page_count or 1)
        text, page_count, confidence = _extract_with_rapidocr(raw)
        engine = "rapidocr"
        logger.info(
            "RapidOCR extracted %d chars (conf=%.3f) from %d pages",
            len(text), confidence, page_count,
        )
    except Exception as exc:
        logger.error("RapidOCR failed: %s", exc)
        engine = "none"

    return {"text": text, "page_count": page_count, "engine": engine, "confidence": round(confidence, 4)}


def extract_image_text(raw: bytes) -> dict:
    from PIL import Image

    img = Image.open(io.BytesIO(raw))
    text, confidence = _ocr_with_rapidocr([img])
    return {
        "text": text,
        "page_count": 1,
        "engine": "rapidocr" if text else "none",
        "confidence": round(confidence, 4),
    }
