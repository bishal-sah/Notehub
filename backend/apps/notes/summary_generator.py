"""
AI Summary Generator for notes.
Uses extractive summarization — scores sentences by keyword frequency,
position, and length, then picks the top sentences to form a concise summary.
Reuses text extraction utilities from flashcard_generator.
"""
import re
import logging
from collections import Counter

from apps.notes.flashcard_generator import (
    extract_text,
    clean_text,
    is_garbage_text,
    STOPWORDS,
)

logger = logging.getLogger(__name__)

# ─── Sentence Splitting ─────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Split text into sentences, keeping meaningful ones."""
    # Split on sentence-ending punctuation followed by whitespace + capital
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    sentences = []
    for part in parts:
        s = part.strip()
        # Filter: must be a reasonable sentence length
        if 30 < len(s) < 600 and not s.startswith('http'):
            sentences.append(s)
    return sentences


# ─── Scoring ─────────────────────────────────────────────

def _word_frequencies(text: str) -> dict[str, float]:
    """Get normalized word frequencies (excluding stopwords)."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    filtered = [w for w in words if w not in STOPWORDS]
    counter = Counter(filtered)
    if not counter:
        return {}
    max_freq = counter.most_common(1)[0][1]
    return {word: count / max_freq for word, count in counter.items()}


def _score_sentence(
    sentence: str,
    word_freq: dict[str, float],
    position: int,
    total: int,
) -> float:
    """
    Score a sentence for summary inclusion.
    Factors: word frequency, sentence position, sentence length.
    """
    words = re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
    if not words:
        return 0.0

    # Word frequency score
    freq_score = sum(word_freq.get(w, 0) for w in words) / len(words)

    # Position score — first and last sentences are more important
    if total <= 1:
        pos_score = 1.0
    else:
        # Favor beginning (intro) and end (conclusion)
        normalized_pos = position / (total - 1)  # 0..1
        if normalized_pos < 0.2:
            pos_score = 1.0
        elif normalized_pos > 0.8:
            pos_score = 0.8
        else:
            pos_score = 0.5

    # Length score — prefer medium-length sentences
    length = len(sentence)
    if 50 <= length <= 200:
        len_score = 1.0
    elif 200 < length <= 400:
        len_score = 0.7
    else:
        len_score = 0.4

    # Bonus for definition-like patterns
    bonus = 0.0
    if re.search(r'\b(?:is|are|refers?\s+to|means?|defined\s+as|known\s+as)\b', sentence, re.I):
        bonus = 0.3

    return (freq_score * 0.5) + (pos_score * 0.25) + (len_score * 0.15) + bonus * 0.1


# ─── Main Summarizer ────────────────────────────────────

def _extractive_summarize(text: str, max_sentences: int = 5, max_chars: int = 800) -> str:
    """
    Produce an extractive summary of the given text.
    Picks the top-scored sentences and orders them by original position.
    """
    sentences = _split_sentences(text)
    if not sentences:
        return ''

    # If text is already short, return as-is
    if len(sentences) <= max_sentences:
        return ' '.join(sentences)

    word_freq = _word_frequencies(text)
    total = len(sentences)

    scored = []
    for i, sent in enumerate(sentences):
        score = _score_sentence(sent, word_freq, i, total)
        scored.append((i, sent, score))

    # Pick top N by score
    scored.sort(key=lambda x: x[2], reverse=True)
    top = scored[:max_sentences]

    # Re-order by original position for coherence
    top.sort(key=lambda x: x[0])

    summary_parts = []
    char_count = 0
    for _, sent, _ in top:
        if char_count + len(sent) > max_chars:
            break
        summary_parts.append(sent)
        char_count += len(sent) + 1

    return ' '.join(summary_parts)


def generate_summary(
    note,
    max_sentences: int = 5,
    max_chars: int = 800,
) -> dict:
    """
    Main entry point: generate a summary for a Note instance.

    Tries multiple text sources in order:
    1. note.text_content (pre-extracted text)
    2. note.ocr_text (OCR-extracted text)
    3. Live extraction from the file

    Returns {'summary': str, 'source': str, 'word_count': int, 'success': bool, 'error': str}
    """
    text = ''
    source = ''

    # Try pre-existing text content first
    if note.text_content and len(note.text_content.strip()) > 50 and not is_garbage_text(note.text_content):
        text = note.text_content
        source = 'text_content'

    # Try OCR text
    if not text and note.ocr_text and len(note.ocr_text.strip()) > 50 and not is_garbage_text(note.ocr_text):
        text = note.ocr_text
        source = 'ocr'

    # Try live extraction from file
    if not text and note.file:
        try:
            extracted = extract_text(note.file.path, note.file_type)
            if extracted and len(extracted.strip()) > 50 and not is_garbage_text(extracted):
                text = extracted
                source = 'file_extraction'
                note.text_content = extracted
                note.save(update_fields=['text_content'])
        except Exception as e:
            logger.warning(f"File text extraction failed for note {note.id}: {e}")

    # Auto-run OCR as fallback for scanned/image files
    if not text and note.file:
        try:
            from apps.notes.ocr_service import ocr_from_file
            ft = (note.file_type or '').lower()
            if ft in ('pdf', 'jpg', 'jpeg', 'png'):
                logger.info(f"Auto-running OCR for note {note.id} (summary fallback)")
                result = ocr_from_file(note.file.path, ft)
                if result.success and result.text and len(result.text.strip()) > 50:
                    text = result.text
                    source = 'auto_ocr'
                    note.ocr_text = result.text
                    note.ocr_confidence = result.confidence
                    note.ocr_status = 'completed'
                    note.text_content = result.text
                    note.save(update_fields=['ocr_text', 'ocr_confidence', 'ocr_status', 'text_content'])
        except Exception as e:
            logger.warning(f"Auto-OCR fallback failed for note {note.id}: {e}")

    if not text:
        return {
            'summary': '',
            'source': '',
            'word_count': 0,
            'success': False,
            'error': 'Could not extract text from this note. '
                     'Tesseract OCR may not be installed on the server.',
        }

    # Clean and summarize
    text = clean_text(text)
    summary = _extractive_summarize(text, max_sentences=max_sentences, max_chars=max_chars)

    if not summary:
        return {
            'summary': '',
            'source': source,
            'word_count': 0,
            'success': False,
            'error': 'Text was extracted but no meaningful sentences could be identified for summarization.',
        }

    word_count = len(summary.split())
    return {
        'summary': summary,
        'source': source,
        'word_count': word_count,
        'success': True,
        'error': '',
    }
