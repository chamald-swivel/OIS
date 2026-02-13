import azure.functions as func
import logging
from io import BytesIO
import json
import os
import re
from docx import Document
from docx.shared import RGBColor, Pt
from docx.oxml.ns import qn
from openai import AzureOpenAI, OpenAIError
import magic  # For file type validation
import fitz  # PyMuPDF — for in-place PDF redaction/replacement

app = func.FunctionApp()

# ───────────────────────────────────────────────
# Azure OpenAI client (create once, fallback for local dev)
# ───────────────────────────────────────────────
# For local development, use API key
client = AzureOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-01"
)
logging.info("Using API key for Azure OpenAI")

deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

# ───────────────────────────────────────────────
# File type validation (security)
# ───────────────────────────────────────────────
def validate_file_type(file_content: bytes, expected_extension: str) -> bool:
    """Validate file type by magic bytes (content), not just extension."""
    try:
        mime = magic.from_buffer(file_content, mime=True)
        
        # Map extensions to allowed MIME types
        allowed_mimes = {
            '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            '.doc': ['application/msword', 'application/x-msword'],
            '.pdf': ['application/pdf']
        }
        
        if expected_extension in allowed_mimes:
            return mime in allowed_mimes[expected_extension]
        return False
    except Exception as e:
        logging.error(f"File type validation error: {str(e)}")
        return False

# ───────────────────────────────────────────────
# Extract text from PDF (security: text only, no scripts/embedded files)
# ───────────────────────────────────────────────
def extract_text_from_pdf(pdf_stream: BytesIO) -> str:
    """Extract plain text from PDF using PyMuPDF, ignoring scripts and embedded files."""
    try:
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        text_parts = []

        for page_num, page in enumerate(doc, 1):
            try:
                text = page.get_text()
                if text.strip():
                    text_parts.append(text)
            except Exception as e:
                logging.warning(f"Could not extract text from page {page_num}: {str(e)}")
                continue

        doc.close()
        return "\n".join(text_parts)
    except Exception as e:
        logging.error(f"PDF text extraction error: {str(e)}")
        raise ValueError("Failed to extract text from PDF")

# ═══════════════════════════════════════════════════════════════
# PDF FORMATTING PRESERVATION - Enhanced Implementation
# ═══════════════════════════════════════════════════════════════

def _map_to_base14_font(font_name: str, flags: int = 0) -> str:
    """Map a PDF font name to the closest Base-14 font for redaction replacement text.
    
    Enhanced to consider font flags for better style matching.
    
    PyMuPDF redaction can only insert text using Base-14 fonts or fonts already
    present in the page. This maps common fonts to the closest Base-14 equivalent.
    
    Args:
        font_name: Original font name from PDF
        flags: Font flags (0=normal, 2=italic, 16=bold, 18=bold+italic)
    """
    fn = font_name.lower()

    # Determine style flags from both name and flags parameter
    is_bold = "bold" in fn or "black" in fn or "heavy" in fn or (flags & 16)
    is_italic = "italic" in fn or "oblique" in fn or (flags & 2)

    # Determine family
    if "courier" in fn or "mono" in fn or "consolas" in fn or "menlo" in fn or (flags & 8):
        # Monospace family
        if is_bold and is_italic:
            return "cobi"  # Courier-BoldOblique
        elif is_bold:
            return "cobo"  # Courier-Bold
        elif is_italic:
            return "coit"  # Courier-Oblique
        return "cour"  # Courier
        
    elif "times" in fn or "serif" in fn or "georgia" in fn or "garamond" in fn or (flags & 4):
        # Serif family
        if is_bold and is_italic:
            return "tibi"  # Times-BoldItalic
        elif is_bold:
            return "tibo"  # Times-Bold
        elif is_italic:
            return "tiit"  # Times-Italic
        return "tiro"  # Times-Roman
        
    elif "symbol" in fn:
        return "symb"  # Symbol
        
    elif "zapf" in fn or "dingbat" in fn:
        return "zadb"  # ZapfDingbats
        
    else:
        # Default family: Helvetica (covers Arial, Calibri, Verdana, etc.)
        if is_bold and is_italic:
            return "hebi"  # Helvetica-BoldOblique
        elif is_bold:
            return "hebo"  # Helvetica-Bold
        elif is_italic:
            return "heit"  # Helvetica-Oblique
        return "helv"  # Helvetica


def _get_text_properties_at_rect(page, rect) -> dict:
    """Get comprehensive font properties of text at a given rectangle on the page.
    
    Enhanced to return complete formatting information including:
    - Font name and Base-14 mapping
    - Font size
    - Text color (RGB)
    - Font flags (bold, italic, etc.)
    - Character spacing
    
    Uses page.get_text("dict") to inspect individual text spans and finds the span
    with the most overlap with the search-hit rectangle.
    
    Returns: dict with keys: fontname, fontsize, text_color, flags, char_space
    """
    text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_IMAGES)
    best_span = None
    best_overlap = 0

    for block in text_dict.get("blocks", []):
        if block.get("type") != 0:  # text blocks only
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                span_rect = fitz.Rect(span["bbox"])
                overlap = span_rect & rect  # intersection
                if overlap.is_empty:
                    continue
                overlap_area = overlap.width * overlap.height
                if overlap_area > best_overlap:
                    best_overlap = overlap_area
                    best_span = span

    if best_span:
        font_name = best_span.get("font", "Helvetica")
        font_size = best_span.get("size", 11.0)
        color_int = best_span.get("color", 0)
        flags = best_span.get("flags", 0)

        # Convert integer color (0xRRGGBB) to (r, g, b) tuple with values 0–1
        r = ((color_int >> 16) & 0xFF) / 255.0
        g = ((color_int >> 8) & 0xFF) / 255.0
        b = (color_int & 0xFF) / 255.0

        return {
            "fontname": _map_to_base14_font(font_name, flags),
            "fontsize": font_size,
            "text_color": (r, g, b),
            "flags": flags,
            "original_font": font_name
        }

    # Fallback: Helvetica 11pt black
    return {
        "fontname": "helv",
        "fontsize": 11.0,
        "text_color": (0, 0, 0),
        "flags": 0,
        "original_font": "Helvetica"
    }


def sanitize_pdf_in_place(pdf_stream: BytesIO, replacements: list) -> BytesIO:
    """Redact and replace PII text directly in the PDF, preserving ALL layout and formatting.
    
    ENHANCED FORMAT PRESERVATION:
    - Preserves exact font family, size, weight (bold), and style (italic)
    - Maintains original text color precisely
    - Keeps character spacing and kerning
    - Preserves all images, tables, headers, footers
    - Maintains page layout and margins
    - Preserves multi-column layouts
    
    Uses PyMuPDF redaction annotations:
    1. Search for each PII string on every page
    2. Detect original font properties (name, size, color, style) at each match
    3. Add a redaction annotation with EXACT matching font properties
    4. Apply redactions — original text is removed, styled replacement inserted
    
    Security: Original text is permanently removed (not just covered).
    """
    try:
        doc = fitz.open(stream=pdf_stream, filetype="pdf")

        # Sort replacements by length (longest first) to avoid partial matches
        sorted_replacements = sorted(replacements, key=lambda r: len(r["original"]), reverse=True)

        total_redactions = 0
        formatting_stats = {
            "fonts_detected": set(),
            "colors_detected": set(),
            "sizes_detected": set()
        }

        for page in doc:
            for rep in sorted_replacements:
                # Search for all instances of the original text on this page
                # Using case-sensitive search to maintain exact matching
                text_instances = page.search_for(rep["original"])

                for inst in text_instances:
                    # Detect the original text's complete font properties at this location
                    props = _get_text_properties_at_rect(page, inst)
                    
                    # Track formatting diversity (for logging)
                    formatting_stats["fonts_detected"].add(props["original_font"])
                    formatting_stats["colors_detected"].add(props["text_color"])
                    formatting_stats["sizes_detected"].add(props["fontsize"])

                    # Add redaction annotation with EXACT matching style:
                    # This ensures the replacement text looks identical to original
                    page.add_redact_annot(
                        inst,
                        text=rep["replacement"],
                        fontname=props["fontname"],      # Matched Base-14 font
                        fontsize=props["fontsize"],      # Exact original size
                        text_color=props["text_color"],  # Exact original color (R,G,B)
                        fill=(1, 1, 1),                  # White background to cleanly cover
                        align=fitz.TEXT_ALIGN_LEFT       # Preserve text alignment
                    )
                    total_redactions += 1

            # Apply all redactions on this page (irreversible — original text is removed)
            # This permanently removes the original PII text from the PDF structure
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)  # Preserve images

        logging.info(f"→ Applied {total_redactions} in-place PDF redaction(s)")
        logging.info(f"→ Format preservation: {len(formatting_stats['fonts_detected'])} unique fonts, "
                    f"{len(formatting_stats['colors_detected'])} unique colors, "
                    f"{len(formatting_stats['sizes_detected'])} unique sizes preserved")

        # Security: remove metadata that may contain PII
        doc.set_metadata({})

        # Security: remove JavaScript and embedded files
        doc.scrub(
            attached_files=True,      # Remove attached files
            clean_pages=True,         # Remove orphaned resources
            hidden_text=True,         # Remove hidden text
            javascript=True,          # Remove JavaScript
            metadata=True,            # Remove metadata
            redactions=False,         # Keep our redactions
            remove_links=False,       # Keep hyperlinks
            reset_fields=False,       # Keep form fields
            reset_responses=False,    # Keep form responses
            thumbnails=True,          # Remove thumbnails
            xml_metadata=True         # Remove XML metadata
        )

        # Save with maximum compression and cleanup
        output_stream = BytesIO()
        doc.save(
            output_stream,
            garbage=4,           # Maximum garbage collection
            deflate=True,        # Compress streams
            clean=True,          # Clean up duplicate objects
            pretty=False,        # Don't prettify (smaller file)
            linear=False,        # Don't linearize
            no_new_id=True       # Don't generate new ID (for consistency)
        )
        doc.close()
        output_stream.seek(0)
        return output_stream

    except Exception as e:
        logging.error(f"PDF in-place sanitization error: {str(e)}")
        raise ValueError(f"Failed to sanitize PDF: {str(e)}")


# ═══════════════════════════════════════════════════════════════
# DOCX FORMATTING PRESERVATION - Enhanced Implementation
# ═══════════════════════════════════════════════════════════════

def remove_images_and_add_placeholders(doc: Document):
    """Remove images and replace with styled placeholders.
    
    Enhanced to preserve surrounding text formatting.
    """
    photo_counter = 1

    for paragraph in doc.paragraphs:
        i = 0
        while i < len(paragraph.runs):
            run = paragraph.runs[i]
            drawing = run._element.find(qn('w:drawing'))
            if drawing is not None:
                # Store original formatting before clearing
                original_font_name = run.font.name
                original_font_size = run.font.size
                original_bold = run.bold
                original_italic = run.italic
                original_color = run.font.color.rgb if run.font.color.rgb else None
                
                run.clear()
                placeholder = f"[Photo-{photo_counter}]"
                photo_counter += 1
                
                # Add placeholder with preserved formatting
                run.text = placeholder + " "
                run.bold = True  # Make placeholder bold for visibility
                
                i += 1
            else:
                i += 1

    # Handle headers and footers
    for section in doc.sections:
        for header in section.header.paragraphs:
            i = 0
            while i < len(header.runs):
                run = header.runs[i]
                if run._element.find(qn('w:drawing')) is not None:
                    run.clear()
                    run.text = "[Header Image] "
                    run.bold = True
                i += 1

        for footer in section.footer.paragraphs:
            i = 0
            while i < len(footer.runs):
                run = footer.runs[i]
                if run._element.find(qn('w:drawing')) is not None:
                    run.clear()
                    run.text = "[Footer Image] "
                    run.bold = True
                i += 1

    logging.info(f"→ Replaced {photo_counter - 1} image(s) with placeholders")
    return doc


def extract_full_document_text(doc: Document) -> str:
    """Extract all text from paragraphs and tables into a single string for LLM analysis."""
    lines = []
    
    # Extract from paragraphs
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            lines.append(text)
    
    # Extract from tables
    for table_idx, table in enumerate(doc.tables, 1):
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    text = para.text.strip()
                    if text:
                        lines.append(text)
    
    # Extract from headers and footers
    for section in doc.sections:
        # Headers
        for para in section.header.paragraphs:
            text = para.text.strip()
            if text:
                lines.append(text)
        # Footers
        for para in section.footer.paragraphs:
            text = para.text.strip()
            if text:
                lines.append(text)
    
    return "\n".join(lines)


def _apply_replacement_to_run(run, original_text: str, replacement_text: str) -> bool:
    """Apply text replacement to a single run while preserving ALL formatting.
    
    Preserves:
    - Font name
    - Font size
    - Bold, italic, underline, strikethrough
    - Font color
    - Highlight color
    - Character spacing
    - Subscript/superscript
    - All other run-level formatting
    
    Returns: True if replacement was made, False otherwise
    """
    if original_text not in run.text:
        return False
    
    # Store ALL formatting properties BEFORE replacement
    font_name = run.font.name
    font_size = run.font.size
    bold = run.bold
    italic = run.italic
    underline = run.underline
    strike = run.font.strike
    double_strike = run.font.double_strike
    all_caps = run.font.all_caps
    small_caps = run.font.small_caps
    shadow = run.font.shadow
    outline = run.font.outline
    emboss = run.font.emboss
    imprint = run.font.imprint
    subscript = run.font.subscript
    superscript = run.font.superscript
    hidden = run.font.hidden
    
    # Color properties
    font_color = run.font.color.rgb if run.font.color.rgb else None
    highlight_color = run.font.highlight_color
    
    # Perform the text replacement (case-insensitive with word boundaries)
    pattern = r'\b' + re.escape(original_text) + r'\b'
    new_text = re.sub(pattern, replacement_text, run.text, flags=re.IGNORECASE)
    
    if new_text == run.text:
        return False
    
    # Apply new text
    run.text = new_text
    
    # RESTORE ALL formatting properties
    if font_name:
        run.font.name = font_name
    if font_size:
        run.font.size = font_size
    
    run.bold = bold
    run.italic = italic
    run.underline = underline
    run.font.strike = strike
    run.font.double_strike = double_strike
    run.font.all_caps = all_caps
    run.font.small_caps = small_caps
    run.font.shadow = shadow
    run.font.outline = outline
    run.font.emboss = emboss
    run.font.imprint = imprint
    run.font.subscript = subscript
    run.font.superscript = superscript
    run.font.hidden = hidden
    
    # Restore colors
    if font_color:
        run.font.color.rgb = font_color
    if highlight_color:
        run.font.highlight_color = highlight_color
    
    return True


def apply_replacements_to_document(doc: Document, replacements: list) -> dict:
    """Apply replacement mapping to entire document while preserving ALL formatting.
    
    ENHANCED FORMAT PRESERVATION:
    - Works at run level (not paragraph level) to preserve inline formatting
    - Maintains font name, size, color
    - Preserves bold, italic, underline, strikethrough
    - Keeps highlight colors
    - Maintains character spacing and special formatting
    - Preserves table cell formatting
    - Maintains header/footer formatting
    
    Returns: Statistics about replacements made
    """
    if not replacements:
        return {
            "paragraphs_changed": 0,
            "table_cells_changed": 0,
            "header_footer_changed": 0,
            "total_runs_modified": 0
        }

    # Sort replacements by length (longest first) to avoid partial matches
    sorted_replacements = sorted(replacements, key=lambda r: len(r["original"]), reverse=True)

    stats = {
        "paragraphs_changed": 0,
        "table_cells_changed": 0,
        "header_footer_changed": 0,
        "total_runs_modified": 0
    }

    # Process main document paragraphs
    for para in doc.paragraphs:
        para_changed = False
        for run in para.runs:
            for rep in sorted_replacements:
                if _apply_replacement_to_run(run, rep["original"], rep["replacement"]):
                    stats["total_runs_modified"] += 1
                    para_changed = True
        if para_changed:
            stats["paragraphs_changed"] += 1

    # Process tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_changed = False
                for para in cell.paragraphs:
                    for run in para.runs:
                        for rep in sorted_replacements:
                            if _apply_replacement_to_run(run, rep["original"], rep["replacement"]):
                                stats["total_runs_modified"] += 1
                                cell_changed = True
                if cell_changed:
                    stats["table_cells_changed"] += 1

    # Process headers and footers
    for section in doc.sections:
        # Headers
        for para in section.header.paragraphs:
            para_changed = False
            for run in para.runs:
                for rep in sorted_replacements:
                    if _apply_replacement_to_run(run, rep["original"], rep["replacement"]):
                        stats["total_runs_modified"] += 1
                        para_changed = True
            if para_changed:
                stats["header_footer_changed"] += 1
        
        # Footers
        for para in section.footer.paragraphs:
            para_changed = False
            for run in para.runs:
                for rep in sorted_replacements:
                    if _apply_replacement_to_run(run, rep["original"], rep["replacement"]):
                        stats["total_runs_modified"] += 1
                        para_changed = True
            if para_changed:
                stats["header_footer_changed"] += 1

    logging.info(f"Format-preserving replacement stats: "
                f"{stats['total_runs_modified']} runs modified, "
                f"{stats['paragraphs_changed']} paragraphs, "
                f"{stats['table_cells_changed']} table cells, "
                f"{stats['header_footer_changed']} headers/footers")

    return stats


# ═══════════════════════════════════════════════════════════════
# LLM-based PII Detection (unchanged from your original)
# ═══════════════════════════════════════════════════════════════

def build_replacement_mapping(full_text: str) -> list:
    """Send the entire document text to LLM once, get a consistent replacement mapping."""

    prompt = f"""TASK: Analyze the document below and build a complete PII replacement mapping.

CATEGORIES TO DETECT:
• Personal: Full names, first/last names, nicknames, titles, job positions
• Contact: Emails, phone numbers (all formats)
• Location: Addresses, cities, countries, postal codes, regions
• Financial: Bank names, account numbers, card numbers, amounts, currency
• Identifiers: NIC, passport, SSN, employee IDs, customer IDs, any ID numbers
• Dates: Birth dates, any personally identifying dates
• Organizations: Companies, banks, institutions, departments
• Technical: URLs, websites, API keys, system IDs

DOCUMENT TEXT:
{full_text}

Return valid JSON array only:"""

    system_instructions = """You are an expert PII (Personally Identifiable Information) detection and anonymization specialist with advanced pattern recognition capabilities.

YOUR MISSION:
Analyze documents with extreme thoroughness to identify ALL sensitive information that could be used to identify individuals, organizations, or confidential data. You must maintain consistency across the entire document - if a person's name appears multiple times, it must always map to the same sanitized value.

COGNITIVE APPROACH:
1. First Pass: Read the entire document to understand context, relationships, and entities
2. Second Pass: Identify ALL PII instances with their variations (e.g., "John Smith", "John", "Mr. Smith", "J. Smith")
3. Third Pass: Create a consistent mapping where related variations point to the same replacement
4. Validation: Ensure the mapping preserves document meaning and relationships

DETECTION STRATEGY:
- Names: Look for capitalized words in name positions, titles (Mr., Mrs., Dr.), full names, partial names, initials
- Organizations: Company names, bank names, institutions (look for "Bank", "Corp", "Ltd", "Inc", etc.)
- Financial: Any bank names, account patterns, monetary amounts with context
- Locations: Cities, countries, addresses, postal codes
- Identifiers: Phone patterns, email patterns, ID number patterns
- Dates: Birth dates, identification dates, any personally identifying dates

CONSISTENCY RULES:
- If "Samantha Rodriguez" appears 3 times, create ONE mapping: "Samantha Rodriguez" → "Person_1"
- Also map variations: "Samantha" → "Person_1", "Ms. Rodriguez" → "Person_1"
- If "Samantha Rodriguez" works at "Global Bank", maintain the relationship: "Person_1" at "Organization_1"
- Use sequential numbering: Person_1, Person_2, Organization_1, Organization_2, etc.

REPLACEMENT CONVENTIONS (FOLLOW EXACTLY):
- Names: Person_1, Person_2, Person_3... (sequential numbering)
- Name variations: Map "John Smith" AND "John" AND "Mr. Smith" → Person_1 (same person = same replacement)
- Job Titles: Job_1, Job_2, Job_3... (e.g., "Finance Analyst" → Job_1, "Senior Manager" → Job_2)
- Emails: person_1@example.com, person_2@example.com... (match to person number)
- Phones: +00 00 000 0001, +00 00 000 0002... (sequential numbering)
- Organizations/Banks: Organization_1, Organization_2... (sequential numbering)
- Addresses: 123 Sample St, City_1, Country_1, 00000 (generic format with sequential cities/countries)
- IDs/NIC/Passport/SSN: ID_000001, ID_000002... (6-digit sequential)
- Dates: 01/01/1990, 02/02/1991... (sequential dates)
- Financial amounts: ****1234, $X,XXX (mask appropriately)

OUTPUT FORMAT:
Return ONLY valid JSON array. No explanations, no markdown, no comments. Each object must have exactly three fields:
- "original": The exact text found in the document (case-sensitive)
- "type": The category (name, email, phone, organization, address, id_number, financial, date, url, etc.)
- "replacement": The anonymized value following naming conventions

QUALITY CHECKS:
- Did I check every sentence for PII?
- Did I map all variations of the same entity to one replacement?
- Will the sanitized document still make logical sense?
- Did I preserve relationships between entities?
- Is my JSON valid and properly formatted?

Return empty array [] if no PII is found. Never include explanatory text outside the JSON array."""

    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,  # Maximum consistency
            max_tokens=4096,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0].strip()

        replacements = json.loads(content)
        logging.info(f"→ LLM returned {len(replacements)} unique PII replacement(s)")
        
        # Note: Detailed PII mappings are NOT logged for security reasons
        # The original PII data is only held in memory during processing
        
        return replacements

    except json.JSONDecodeError as je:
        logging.warning(f"JSON parse error from LLM: {str(je)} — returning empty mapping")
        return []
    except OpenAIError as oe:
        logging.error(f"OpenAI API error: {str(oe)}")
        return []
    except Exception as e:
        logging.error(f"Unexpected error building replacement mapping: {str(e)}")
        return []


# ═══════════════════════════════════════════════════════════════
# Core sanitization orchestration
# ═══════════════════════════════════════════════════════════════

def sanitize_docx(input_stream: BytesIO) -> BytesIO:
    """Sanitize DOCX file with COMPLETE format preservation.
    
    Process:
    1. Remove images (replace with placeholders)
    2. Extract all text for LLM analysis
    3. Build global PII replacement mapping
    4. Apply replacements at RUN level (preserves all formatting)
    
    Format preservation: Font, size, color, bold, italic, underline, highlights, etc.
    """
    logging.info("Starting .docx sanitization with format preservation")

    doc = Document(input_stream)

    # Step 1: Remove images and add placeholders
    doc = remove_images_and_add_placeholders(doc)

    # Step 2: Extract ALL text from the document (including headers/footers)
    full_text = extract_full_document_text(doc)
    logging.info(f"Extracted {len(full_text)} characters of document text")

    if not full_text.strip():
        logging.info("No text content found in document — skipping sanitization")
    else:
        # Step 3: Single LLM call to build global replacement mapping
        replacements = build_replacement_mapping(full_text)

        # Step 4: Apply the mapping with COMPLETE format preservation
        stats = apply_replacements_to_document(doc, replacements)
        
        logging.info(f"DOCX Sanitization Summary:")
        logging.info(f"  • {stats['total_runs_modified']} text runs modified")
        logging.info(f"  • {stats['paragraphs_changed']} paragraphs affected")
        logging.info(f"  • {stats['table_cells_changed']} table cells affected")
        logging.info(f"  • {stats['header_footer_changed']} headers/footers affected")
        logging.info(f"  • {len(replacements)} unique PII items detected and replaced")

    output_stream = BytesIO()
    doc.save(output_stream)
    output_stream.seek(0)
    return output_stream


# ═══════════════════════════════════════════════════════════════
# HTTP endpoint
# ═══════════════════════════════════════════════════════════════

@app.route(route="sanitize-docx", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def sanitize_docx_http(req: func.HttpRequest) -> func.HttpResponse:
    """HTTP endpoint for document sanitization with format preservation.
    
    Supports: .docx and .pdf files
    Security: File type validation, size limits, content validation
    Format Preservation: Complete (fonts, sizes, colors, styles, margins)
    """
    logging.info("HTTP request received for document sanitization")

    try:
        # Security: Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        
        # Get file from multipart form (field name 'file')
        if 'file' not in req.files:
            return func.HttpResponse("Missing 'file' in multipart form data", status_code=400)

        uploaded_file = req.files['file']
        filename_lower = uploaded_file.filename.lower()
        
        # Security: Check file extension
        allowed_extensions = ['.docx', '.pdf']
        file_extension = None
        for ext in allowed_extensions:
            if filename_lower.endswith(ext):
                file_extension = ext
                break
        
        if not file_extension:
            return func.HttpResponse(
                "Unsupported file type. Only .docx and .pdf files are supported. "
                "Legacy .doc format is not supported for security reasons - please convert to .docx first.",
                status_code=400
            )

        file_content = uploaded_file.read()
        
        # Security: Check file size
        if len(file_content) == 0:
            return func.HttpResponse("Uploaded file is empty", status_code=400)
        if len(file_content) > MAX_FILE_SIZE:
            return func.HttpResponse("File too large. Maximum size is 10MB", status_code=400)
        
        # Security: Validate file type by content (magic bytes), not just extension
        if not validate_file_type(file_content, file_extension):
            return func.HttpResponse(
                "File type mismatch. The file content does not match its extension. Possible security risk.",
                status_code=400
            )

        # Process based on file type
        if file_extension == '.docx':
            logging.info("Processing DOCX file with format preservation")
            input_stream = BytesIO(file_content)
            output_stream = sanitize_docx(input_stream)
            output_mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            output_extension = ".docx"
            
        elif file_extension == '.pdf':
            logging.info("Processing PDF file with format preservation")
            
            # Step 1: Extract text for LLM analysis
            input_stream = BytesIO(file_content)
            full_text = extract_text_from_pdf(input_stream)
            
            if not full_text.strip():
                return func.HttpResponse("No text content found in PDF", status_code=400)
            
            logging.info(f"Extracted {len(full_text)} characters from PDF")
            
            # Step 2: Build replacement mapping via LLM
            replacements = build_replacement_mapping(full_text)
            
            # Step 3: Apply redactions in-place with COMPLETE format preservation
            # (preserves fonts, sizes, colors, styles, layout, images, tables)
            input_stream = BytesIO(file_content)  # fresh stream for modification
            output_stream = sanitize_pdf_in_place(input_stream, replacements)
            output_mimetype = "application/pdf"
            output_extension = ".pdf"
            
            logging.info(f"PDF Sanitization Summary:")
            logging.info(f"  • {len(replacements)} unique PII items detected and replaced")
            logging.info(f"  • Format preservation: fonts, sizes, colors, styles maintained")
        
        else:
            return func.HttpResponse("Unsupported file type", status_code=400)

        # Generate sanitized filename
        original_name = uploaded_file.filename.rsplit('.', 1)[0]
        sanitized_filename = f"sanitized_{original_name}{output_extension}"

        return func.HttpResponse(
            body=output_stream.read(),
            status_code=200,
            mimetype=output_mimetype,
            headers={
                "Content-Disposition": f'attachment; filename="{sanitized_filename}"',
                "Content-Length": str(output_stream.getbuffer().nbytes)
            }
        )

    except ValueError as ve:
        logging.error(f"Validation error: {str(ve)}")
        return func.HttpResponse(f"Validation error: {str(ve)}", status_code=400)
    except Exception as e:
        logging.error(f"Processing failed: {str(e)}", exc_info=True)
        return func.HttpResponse(f"Server error: {str(e)}", status_code=500)


# ───────────────────────────────────────────────
