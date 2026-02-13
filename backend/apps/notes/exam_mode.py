"""
Exam Mode service — extracts key formulas, definitions, diagrams, and
important terms from note text to produce a rapid-revision format.
"""
import re
import logging

from apps.notes.flashcard_generator import extract_text, clean_text, split_sentences, is_garbage_text, STOPWORDS

logger = logging.getLogger(__name__)


# ─── Definition Extraction ──────────────────────────────

def _extract_definitions(sentences: list[str]) -> list[dict]:
    """Pull out sentences that look like definitions."""
    defs: list[dict] = []
    seen_terms: set[str] = set()

    for sent in sentences:
        # Pattern: "Term is/are ..."
        m = re.match(
            r'^([A-Z][a-zA-Z\s]{2,40}?)\s+(?:is|are|was|were|refers?\s+to|means?|'
            r'can\s+be\s+defined\s+as|is\s+defined\s+as|is\s+known\s+as)\s+(.{20,})',
            sent
        )
        if m:
            term = m.group(1).strip()
            body = m.group(0).strip()
            term_lower = term.lower()
            if term_lower not in seen_terms and len(term.split()) <= 5:
                if not body.endswith('.'):
                    body += '.'
                defs.append({'term': term, 'definition': body})
                seen_terms.add(term_lower)
                continue

        # Pattern: "Term: explanation" or "Term – explanation"
        m = re.match(r'^([A-Z][a-zA-Z\s]{2,40}?)\s*[-:–]\s+(.{20,})', sent)
        if m:
            term = m.group(1).strip()
            body = sent.strip()
            term_lower = term.lower()
            if term_lower not in seen_terms and len(term.split()) <= 5:
                if not body.endswith('.'):
                    body += '.'
                defs.append({'term': term, 'definition': body})
                seen_terms.add(term_lower)

    return defs


# ─── Formula Extraction ─────────────────────────────────

def _extract_formulas(text: str) -> list[dict]:
    """Detect mathematical/scientific formulas and equations."""
    formulas: list[dict] = []
    seen: set[str] = set()

    # Pattern 1: Lines with = sign that look like formulas (e.g., "F = ma", "E = mc^2")
    for m in re.finditer(
        r'(?:^|\n)\s*([A-Za-z][A-Za-z0-9_\s]*?)\s*=\s*([^\n]{3,80})',
        text
    ):
        lhs = m.group(1).strip()
        full = m.group(0).strip()
        # Skip if it looks like code assignment (has quotes, {, function calls)
        if re.search(r'["\'{};]|function|def |var |let |const ', full, re.I):
            continue
        # Skip if LHS is too long (likely a sentence, not a formula)
        if len(lhs) > 30 or len(lhs.split()) > 4:
            continue
        key = full.lower().strip()
        if key not in seen:
            formulas.append({'label': lhs, 'formula': full})
            seen.add(key)

    # Pattern 2: Common math notation patterns
    for m in re.finditer(
        r'(?:^|\n)\s*((?:sin|cos|tan|log|ln|sqrt|lim|sum|integral|'
        r'd/d[a-z]|∫|∑|∏|Σ|Δ|∇|θ|λ|π|α|β|γ)[^\n]{5,80})',
        text, re.IGNORECASE
    ):
        formula = m.group(1).strip()
        key = formula.lower()
        if key not in seen:
            formulas.append({'label': '', 'formula': formula})
            seen.add(key)

    return formulas[:30]  # cap


# ─── Key Point Extraction ───────────────────────────────

def _extract_key_points(sentences: list[str]) -> list[str]:
    """
    Pull out key factual statements — important points students should memorize.
    """
    points: list[str] = []
    seen: set[str] = set()

    importance_markers = re.compile(
        r'\b(?:important|key|note\s+that|remember|crucial|essential|'
        r'significant|fundamental|primary|main|must|always|never|'
        r'advantage|disadvantage|difference|feature|property|'
        r'characteristic|principle|rule|law|theorem|types?\s+of|'
        r'steps?\s+(?:to|for|in)|purpose\s+of|used\s+(?:to|for|in))\b',
        re.IGNORECASE
    )

    for sent in sentences:
        s = sent.strip()
        if len(s) < 40 or len(s) > 350:
            continue

        # Must contain an importance marker or be a list-like item
        if importance_markers.search(s) or re.match(r'^\d+[\.\)]\s', s):
            norm = s[:60].lower()
            if norm not in seen:
                if not s.endswith('.'):
                    s += '.'
                points.append(s)
                seen.add(norm)

    return points[:40]  # cap


# ─── Diagram / Figure Detection ─────────────────────────

def _extract_diagram_refs(text: str) -> list[str]:
    """Find references to figures, diagrams, tables in the text."""
    refs: list[str] = []
    seen: set[str] = set()

    for m in re.finditer(
        r'(?:(?:See\s+)?(?:Figure|Fig\.?|Diagram|Table|Chart|Graph|Image)\s*'
        r'(?:\d+[\.\d]*)?[:\s\-–]*[^\n.]{0,100})',
        text, re.IGNORECASE
    ):
        ref = m.group(0).strip()
        if len(ref) > 10:
            key = ref[:40].lower()
            if key not in seen:
                refs.append(ref)
                seen.add(key)

    return refs[:20]


# ─── Code Syntax Extraction (for programming notes) ─────

def _extract_syntax_blocks(raw_text: str) -> list[dict]:
    """Pull out code snippets with labels."""
    blocks: list[dict] = []
    lines = raw_text.split('\n')
    current: list[str] = []
    label = ''

    code_kw = re.compile(
        r'\b(?:public|private|class|void|static|int|float|double|'
        r'string|boolean|if|else|for|while|return|import|def|'
        r'function|const|let|var|print|System)\b', re.I
    )
    code_sym = re.compile(r'[{};()=<>]')

    for i, line in enumerate(lines):
        stripped = line.strip()
        is_code = (
            len(code_kw.findall(stripped)) >= 2 or
            len(code_sym.findall(stripped)) >= 3 or
            bool(re.search(r'[{;]\s*$', stripped))
        ) if len(stripped) >= 5 else False

        if is_code:
            if not current and i > 0:
                # Use previous non-empty line as label
                prev = lines[i - 1].strip()
                if prev and len(prev) < 100 and not code_kw.search(prev):
                    label = prev
            current.append(line.rstrip())
        else:
            if len(current) >= 2:
                blocks.append({
                    'label': label or f'Code snippet {len(blocks) + 1}',
                    'code': '\n'.join(current),
                })
            current = []
            label = ''

    if len(current) >= 2:
        blocks.append({
            'label': label or f'Code snippet {len(blocks) + 1}',
            'code': '\n'.join(current),
        })

    return blocks[:15]


# ─── Main Entry Point ───────────────────────────────────

def generate_exam_mode(note) -> dict:
    """
    Generate exam-mode revision content for a Note instance.

    Returns {
        'definitions': [...],
        'formulas': [...],
        'key_points': [...],
        'diagrams': [...],
        'syntax': [...],
        'success': bool,
        'error': str,
        'source': str,
        'stats': { 'definitions': int, 'formulas': int, ... }
    }
    """
    raw_text = ''
    source = ''

    # Get text — same cascade as summary_generator
    if note.text_content and len(note.text_content.strip()) > 50 and not is_garbage_text(note.text_content):
        raw_text = note.text_content
        source = 'text_content'
    elif note.ocr_text and len(note.ocr_text.strip()) > 50 and not is_garbage_text(note.ocr_text):
        raw_text = note.ocr_text
        source = 'ocr'
    elif note.file:
        try:
            extracted = extract_text(note.file.path, note.file_type)
            if extracted and len(extracted.strip()) > 50 and not is_garbage_text(extracted):
                raw_text = extracted
                source = 'file_extraction'
                note.text_content = extracted
                note.save(update_fields=['text_content'])
        except Exception as e:
            logger.warning(f"Exam mode text extraction failed for note {note.id}: {e}")

    # Auto-run OCR as fallback for scanned/image files
    if not raw_text and note.file:
        try:
            from apps.notes.ocr_service import ocr_from_file
            ft = (note.file_type or '').lower()
            if ft in ('pdf', 'jpg', 'jpeg', 'png'):
                logger.info(f"Auto-running OCR for note {note.id} (exam mode fallback)")
                result = ocr_from_file(note.file.path, ft)
                if result.success and result.text and len(result.text.strip()) > 50:
                    raw_text = result.text
                    source = 'auto_ocr'
                    note.ocr_text = result.text
                    note.ocr_confidence = result.confidence
                    note.ocr_status = 'completed'
                    note.text_content = result.text
                    note.save(update_fields=['ocr_text', 'ocr_confidence', 'ocr_status', 'text_content'])
        except Exception as e:
            logger.warning(f"Auto-OCR fallback failed for note {note.id}: {e}")

    if not raw_text:
        return {
            'definitions': [],
            'formulas': [],
            'key_points': [],
            'diagrams': [],
            'syntax': [],
            'success': False,
            'error': 'Could not extract text from this note. '
                     'Tesseract OCR may not be installed on the server.',
            'source': '',
            'stats': {},
        }

    cleaned = clean_text(raw_text)
    sentences = split_sentences(cleaned)

    definitions = _extract_definitions(sentences)
    formulas = _extract_formulas(raw_text)
    key_points = _extract_key_points(sentences)
    diagrams = _extract_diagram_refs(raw_text)
    syntax = _extract_syntax_blocks(raw_text)

    total_items = len(definitions) + len(formulas) + len(key_points) + len(diagrams) + len(syntax)

    return {
        'definitions': definitions,
        'formulas': formulas,
        'key_points': key_points,
        'diagrams': diagrams,
        'syntax': syntax,
        'success': total_items > 0,
        'error': '' if total_items > 0 else 'No key content could be extracted for exam mode.',
        'source': source,
        'stats': {
            'definitions': len(definitions),
            'formulas': len(formulas),
            'key_points': len(key_points),
            'diagrams': len(diagrams),
            'syntax': len(syntax),
            'total': total_items,
        },
    }
