import os
import io
import re
from collections import Counter
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client
import pdfplumber
import fitz
import base64
import tiktoken

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------------------------
# Chunk size constants
# Item 8: child chunks (150 tokens) are embedded and retrieved;
#         parent window (500 tokens) is stored for synthesis.
# ---------------------------------------------------------------------------
CHILD_CHUNK_SIZE = 150
CHILD_OVERLAP = 30
PARENT_WINDOW = 500

VISION_THRESHOLD = 100


def process_document(document_id: str, storage_path: str):
    """
    Background task: download PDF, parse, embed, store chunks, update status.
    """
    try:
        supabase.table("documents").update({"status": "processing"}).eq("id", document_id).execute()

        file_bytes = supabase.storage.from_("rfp-documents").download(storage_path)

        chunks = extract_pages(file_bytes)

        if len(chunks) == 0:
            raise Exception("No text content found in PDF")

        for chunk in chunks:
            # Item 7+9: embed heading-prefixed text; store plain chunk_text for synthesis
            embed_text = chunk.get("embed_text") or chunk["text"]
            embedding = get_embedding(embed_text)

            supabase.table("chunks").insert({
                "document_id": document_id,
                "chunk_text": chunk["text"].replace("\x00", ""),
                "parent_chunk_text": chunk.get("parent_chunk_text"),
                "locator": chunk["locator"],
                "embedding": embedding,
                # Item 7+9 metadata columns
                "chunk_index": chunk.get("chunk_index"),
                "section_heading": chunk.get("section_heading"),
                "page_start": chunk.get("page_start"),
                "page_end": chunk.get("page_end"),
            }).execute()

        supabase.table("documents").update({"status": "ready"}).eq("id", document_id).execute()

        print(f"✓ Processed document {document_id}: {len(chunks)} chunks")

    except Exception as e:
        supabase.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        print(f"✗ Failed to process document {document_id}: {str(e)}")


def extract_pages(file_bytes: bytes) -> list[dict]:
    """Extract text from each page, using GPT-4o Vision as fallback for sparse pages."""
    pages = []
    pdf_fitz = fitz.open(stream=file_bytes, filetype="pdf")

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text() or ""

            if len(page_text.strip()) < VISION_THRESHOLD:
                print(f"⚠ Page {page_num} sparse ({len(page_text.strip())} chars), using Vision fallback")
                page_text = extract_text_with_vision(pdf_fitz, page_num - 1)

            if page_text and page_text.strip():
                pages.append({
                    "text": page_text.strip(),
                    "page_num": page_num
                })

    pdf_fitz.close()

    pages = strip_boilerplate(pages)
    return chunk_parent_child(pages)


def strip_boilerplate(pages: list[dict]) -> list[dict]:
    """Remove lines that appear on 3 or more pages (headers, footers, page numbers)."""
    line_page_count = Counter()
    for page in pages:
        unique_lines = {line.strip() for line in page["text"].splitlines() if line.strip()}
        for line in unique_lines:
            line_page_count[line] += 1

    boilerplate = {line for line, count in line_page_count.items() if count >= 3}

    cleaned = []
    for page in pages:
        cleaned_lines = [
            line for line in page["text"].splitlines()
            if line.strip() not in boilerplate
        ]
        cleaned_text = "\n".join(cleaned_lines).strip()
        if cleaned_text:
            cleaned.append({**page, "text": cleaned_text})

    return cleaned


# ---------------------------------------------------------------------------
# Item 7+9: Section heading detection
# ---------------------------------------------------------------------------

HEADING_PATTERNS = [
    r'^\d+\.\d*\s+[A-Z]',     # "1.2 Technical Approach"
    r'^[A-Z][A-Z\s]{4,}$',    # "TECHNICAL APPROACH"
    r'^[A-Z][a-zA-Z\s]+:$',   # "Technical Approach:"
    r'^Section\s+\d+',         # "Section 3"
    r'^[A-Z]\.\s+[A-Z]',      # "A. Technical Approach"
]


def extract_heading(line: str) -> Optional[str]:
    line = line.strip()
    if not (4 <= len(line) <= 80):
        return None
    for p in HEADING_PATTERNS:
        if re.match(p, line):
            return line
    return None


# ---------------------------------------------------------------------------
# Item 8: Parent-child chunking
# Child (150 tokens) → embedded + retrieved
# Parent (500 tokens) → stored for synthesis
# ---------------------------------------------------------------------------

def chunk_parent_child(pages: list[dict]) -> list[dict]:
    """
    Build 150-token child chunks for retrieval.
    Each child carries the surrounding 500-token parent window for synthesis.
    Also tracks section headings (item 7+9) and page ranges.
    """
    enc = tiktoken.get_encoding("cl100k_base")

    # Build flat list of (token_id, page_num, line_text) triples
    # Line text is needed for heading detection
    token_entries: list[tuple[int, int, str]] = []
    for page in pages:
        for line in page["text"].splitlines():
            line_tokens = enc.encode(line.replace("\x00", ""))
            for tok in line_tokens:
                token_entries.append((tok, page["page_num"], line))

    if not token_entries:
        return []

    total = len(token_entries)
    chunks: list[dict] = []
    chunk_index = 0
    start = 0

    # Pre-scan lines for headings so we can map token position → heading
    # Build a list of (token_start_index, heading) for each heading line found
    heading_markers: list[tuple[int, str]] = []
    pos = 0
    for page in pages:
        for line in page["text"].splitlines():
            heading = extract_heading(line)
            if heading:
                heading_markers.append((pos, heading))
            pos += len(enc.encode(line.replace("\x00", "")))

    def current_heading_at(token_pos: int) -> Optional[str]:
        """Return the most recent heading at or before token_pos."""
        result = None
        for marker_pos, heading in heading_markers:
            if marker_pos <= token_pos:
                result = heading
            else:
                break
        return result

    while start < total:
        child_end = min(start + CHILD_CHUNK_SIZE, total)

        # Child window
        child_tokens = [t for t, _, _ in token_entries[start:child_end]]
        child_pages = sorted({p for _, p, _ in token_entries[start:child_end]})
        child_text = enc.decode(child_tokens)

        # Parent window: centered around child, capped at document boundaries
        parent_start = max(0, start - (PARENT_WINDOW - CHILD_CHUNK_SIZE) // 2)
        parent_end = min(total, parent_start + PARENT_WINDOW)
        parent_tokens = [t for t, _, _ in token_entries[parent_start:parent_end]]
        parent_text = enc.decode(parent_tokens)

        # Heading at child start
        section_heading = current_heading_at(start)

        # Embed text: prepend heading context if available (item 7+9)
        if section_heading:
            embed_text = f"Section: {section_heading}\n\n{child_text}"
        else:
            embed_text = child_text

        locator = (
            f"Page {child_pages[0]}"
            if len(child_pages) == 1
            else f"Pages {child_pages[0]}-{child_pages[-1]}"
        )

        chunks.append({
            "text": child_text,
            "embed_text": embed_text,
            "parent_chunk_text": parent_text if parent_text != child_text else None,
            "locator": locator,
            "chunk_index": chunk_index,
            "section_heading": section_heading,
            "page_start": child_pages[0],
            "page_end": child_pages[-1],
        })

        chunk_index += 1
        if child_end == total:
            break
        start += CHILD_CHUNK_SIZE - CHILD_OVERLAP

    return chunks


def extract_text_with_vision(pdf_fitz, page_index: int) -> str:
    """Use GPT-4o Vision to extract text from a PDF page rendered as an image."""
    page = pdf_fitz[page_index]
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img_base64}"}
                    },
                    {
                        "type": "text",
                        "text": "Extract all text content from this slide or page. Include all visible text, labels, and key information. Return only the extracted text, no commentary."
                    }
                ]
            }
        ]
    )
    return response.choices[0].message.content


def get_embedding(text: str) -> list[float]:
    """Get embedding vector for text."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding
