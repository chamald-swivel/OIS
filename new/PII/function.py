import logging
import uuid
from io import BytesIO
from pathlib import Path
from typing import Final

import fitz  # PyMuPDF
from docx import Document


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract plain text from a PDF given its raw bytes, using PyMuPDF,
    with robust error handling. This is suitable for HTTP uploads.

    Args:
        pdf_bytes: Raw PDF file contents.

    Returns:
        The concatenated text content of all pages.

    Raises:
        ValueError: If text extraction fails for any reason.
    """
    text_parts: list[str] = []

    try:
        pdf_stream = BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        for page_num, page in enumerate(doc, start=1):
            try:
                text = page.get_text()
                if text and text.strip():
                    text_parts.append(text.rstrip())
            except Exception as e:  # per-page safeguard
                logging.warning(f"Could not extract text from page {page_num}: {e}")
                continue
        doc.close()
        return "\n".join(text_parts)
    except Exception as e:
        logging.error(f"PDF text extraction error from bytes: {e}")
        raise ValueError("Failed to extract text from PDF") from e


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract plain text from a PDF using PyMuPDF, with robust error handling.

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        The concatenated text content of all pages.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If text extraction fails for any reason.
    """
    path = Path(pdf_path)
    if not path.is_file():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    try:
        pdf_bytes = path.read_bytes()
    except Exception as e:
        logging.error(f"Failed to read PDF file '{pdf_path}': {e}")
        raise

    return extract_text_from_pdf_bytes(pdf_bytes)


def _paragraph_to_text(para) -> str:
    """
    Convert a python-docx paragraph to plain text, adding simple markers for lists.
    """
    raw = para.text.strip()
    if not raw:
        return ""

    # Best-effort detection of bullet / numbered list styles
    style_name = getattr(getattr(para, "style", None), "name", "") or ""
    is_list = any(keyword in style_name for keyword in ("List Bullet", "List Number", "Bullet", "Numbered"))

    return f"- {raw}" if is_list else raw


def _extract_full_docx_text(document: Document) -> str:
    """
    Extract text from a DOCX document, including:
    - body paragraphs
    - table cells
    - headers and footers
    """
    lines: list[str] = []

    # Body paragraphs
    for para in document.paragraphs:
        text = _paragraph_to_text(para)
        if text:
            lines.append(text)

    # Tables (rows × cells, including paragraphs inside cells)
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    text = _paragraph_to_text(para)
                    if text:
                        lines.append(text)

    # Headers and footers
    for section in document.sections:
        for para in section.header.paragraphs:
            text = _paragraph_to_text(para)
            if text:
                lines.append(text)
        for para in section.footer.paragraphs:
            text = _paragraph_to_text(para)
            if text:
                lines.append(text)

    return "\n".join(lines)


def extract_text_from_docx_bytes(docx_bytes: bytes) -> str:
    """
    Extract all visible text from a DOCX file given its raw bytes, including:
    - regular paragraphs
    - tables
    - headers and footers
    - bullet and numbered list paragraphs (marked with "- " prefix)
    """
    try:
        document = Document(BytesIO(docx_bytes))
    except Exception as e:
        logging.error(f"DOCX open error from bytes: {e}")
        raise ValueError("Failed to open DOCX document") from e

    return _extract_full_docx_text(document)


def extract_text_from_docx(docx_path: str) -> str:
    """
    Extract all visible text from a DOCX file, including:
    - regular paragraphs
    - tables
    - headers and footers
    - bullet and numbered list paragraphs (marked with "- " prefix)
    """
    path = Path(docx_path)
    if not path.is_file():
        raise FileNotFoundError(f"DOCX file not found: {docx_path}")

    try:
        docx_bytes = path.read_bytes()
    except Exception as e:
        logging.error(f"Failed to read DOCX file '{docx_path}': {e}")
        raise

    return extract_text_from_docx_bytes(docx_bytes)


SUPPORTED_EXTENSIONS: Final[set[str]] = {".pdf", ".docx"}


def convert_to_text_file(input_path: str, output_dir: str) -> Path:
    """
    Read a PDF or DOCX file, extract its text, and save it as a .txt file
    with a unique identifier in the filename.

    The function chooses the appropriate extractor based on the file extension.

    Args:
        input_path: Path to the source PDF or DOCX file.
        output_dir: Directory where the generated text file will be stored.

    Returns:
        The path to the generated text file.

    Raises:
        FileNotFoundError: If the input file does not exist.
        ValueError: If the file extension is not supported.
    """
    source = Path(input_path)
    if not source.is_file():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    extension = source.suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {extension}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")

    if extension == ".pdf":
        extracted_text = extract_text_from_pdf(str(source))
    else:  # ".docx"
        extracted_text = extract_text_from_docx(str(source))

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    unique_id = uuid.uuid4().hex
    output_file = output_path / f"{source.stem}_{unique_id}.txt"

    # Use UTF-8 to handle most text content robustly
    output_file.write_text(extracted_text, encoding="utf-8")

    return output_file

if __name__ == "__main__":
    # Example: assumes "myfile.pdf" is in the same folder as this script,
    # and writes the output .txt file to this same folder.
    output = convert_to_text_file("input.pdf", ".")
    print(f"Saved to: {output}")