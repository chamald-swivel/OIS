import json
import logging
from pathlib import Path

import azure.functions as func

from function import (
    extract_text_from_pdf_bytes,
    extract_text_from_docx_bytes,
    sanitize_document,
)


app = func.FunctionApp()


# Keep constants untyped for maximum compatibility with all supported runtimes
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@app.function_name(name="extract_text_http")
@app.route(route="extract-text", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def extract_text_http(req: func.HttpRequest) -> func.HttpResponse:
    """
    HTTP endpoint that accepts a single uploaded PDF or DOCX file and returns
    its extracted text as JSON: {"text": "..."}.

    Request:
        - Method: POST
        - Content-Type: multipart/form-data
        - Field name: "file"

    Response:
        - 200 OK with JSON body {"text": "<extracted text>"}
        - 4xx/5xx with JSON error message {"error": "..."}
    """
    try:
        if "file" not in req.files:
            return _json_error("Missing 'file' field in multipart form-data", status_code=400)

        uploaded_file = req.files["file"]
        filename = (uploaded_file.filename or "").strip()
        if not filename:
            return _json_error("Uploaded file must have a filename", status_code=400)

        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            return _json_error(
                f"Unsupported file type '{extension}'. Only .pdf and .docx are supported.",
                status_code=400,
            )

        file_content = uploaded_file.read()
        if not file_content:
            return _json_error("Uploaded file is empty", status_code=400)

        if len(file_content) > MAX_FILE_SIZE_BYTES:
            return _json_error(
                f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
                status_code=400,
            )

        # Route to appropriate extractor based on extension
        if extension == ".pdf":
            logging.info(f"Extracting text from PDF '{filename}'")
            text = extract_text_from_pdf_bytes(file_content)
        else:  # ".docx"
            logging.info(f"Extracting text from DOCX '{filename}'")
            text = extract_text_from_docx_bytes(file_content)

        # Normalize to string (empty string if nothing was extracted)
        text = text or ""

        body = json.dumps({"text": text})
        return func.HttpResponse(body=body, status_code=200, mimetype="application/json")

    except ValueError as ve:
        # Known extraction errors -> 400
        logging.error(f"Extraction error: {ve}")
        return _json_error(str(ve), status_code=400)
    except Exception as e:
        # Unexpected errors -> 500
        logging.error(f"Unexpected server error: {e}", exc_info=True)
        return _json_error("Internal server error", status_code=500)


@app.function_name(name="sanitize_document_http")
@app.route(route="sanitize-document", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def sanitize_document_http(req: func.HttpRequest) -> func.HttpResponse:
    """
    HTTP endpoint: upload a PDF or DOCX file and a replacements array;
    returns the file with PII replaced by the given values, in original format.

    Request (multipart/form-data):
        - file: the report file (PDF or DOCX)
        - replacements: JSON string array of objects with "original", "replacement"
          (and optionally "type"), e.g. [{"original": "John Doe", "type": "person", "replacement": "Person_1"}]

    Response:
        - 200: sanitized file (application/pdf or .docx) with Content-Disposition attachment
        - 4xx/5xx: JSON {"error": "..."}
    """
    try:
        if "file" not in req.files:
            return _json_error("Missing 'file' field in multipart form-data", status_code=400)

        uploaded_file = req.files["file"]
        filename = (uploaded_file.filename or "").strip()
        if not filename:
            return _json_error("Uploaded file must have a filename", status_code=400)

        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            return _json_error(
                f"Unsupported file type '{extension}'. Only .pdf and .docx are supported.",
                status_code=400,
            )

        file_content = uploaded_file.read()
        if not file_content:
            return _json_error("Uploaded file is empty", status_code=400)

        if len(file_content) > MAX_FILE_SIZE_BYTES:
            return _json_error(
                f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
                status_code=400,
            )

        # Parse replacements from form field (required)
        replacements_raw = (req.form.get("replacements") or req.form.get("replacements[]") or "").strip()
        if not replacements_raw:
            return _json_error("Missing 'replacements' field (JSON array of {original, replacement})", status_code=400)

        try:
            replacements = json.loads(replacements_raw)
        except json.JSONDecodeError as e:
            return _json_error(f"Invalid JSON in 'replacements': {e}", status_code=400)

        if not isinstance(replacements, list):
            return _json_error("'replacements' must be a JSON array", status_code=400)

        out_bytes, mimetype = sanitize_document(file_content, filename, replacements)

        sanitized_filename = f"sanitized_{Path(filename).stem}{extension}"
        return func.HttpResponse(
            body=out_bytes,
            status_code=200,
            mimetype=mimetype,
            headers={
                "Content-Disposition": f'attachment; filename="{sanitized_filename}"',
            },
        )

    except ValueError as ve:
        logging.error(f"Sanitize error: {ve}")
        return _json_error(str(ve), status_code=400)
    except Exception as e:
        logging.error(f"Unexpected server error: {e}", exc_info=True)
        return _json_error("Internal server error", status_code=500)


def _json_error(message: str, status_code: int) -> func.HttpResponse:
    """Helper to return consistent JSON error responses."""
    body = json.dumps({"error": message})
    return func.HttpResponse(body=body, status_code=status_code, mimetype="application/json")

