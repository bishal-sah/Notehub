"""
Instant Test Generator — generates MCQs, short questions, and long questions
from note content using OpenAI GPT.
"""
import json
import logging
import re

logger = logging.getLogger(__name__)

# ─── Limits ──────────────────────────────────────────────
MAX_MCQS = 200
MAX_SHORT = 200
MAX_LONG = 200
MAX_NOTE_CHARS = 6000  # chars sent to OpenAI for context


def _extract_note_text(note) -> str:
    """Pull usable text from a Note model instance."""
    text = ''
    if note.text_content and len(note.text_content.strip()) > 50:
        text = note.text_content
    elif note.ocr_text and len(note.ocr_text.strip()) > 50:
        text = note.ocr_text
    return text.strip()[:MAX_NOTE_CHARS]


def _build_prompt(
    note_text: str,
    num_mcqs: int,
    num_short: int,
    num_long: int,
    note_title: str = '',
) -> str:
    """Build the OpenAI prompt for test generation."""
    title_hint = f' titled "{note_title}"' if note_title else ''
    parts = []

    if num_mcqs > 0:
        parts.append(
            f'{num_mcqs} multiple-choice questions (MCQs), each with exactly '
            f'4 options labeled A, B, C, D and one correct answer'
        )
    if num_short > 0:
        parts.append(
            f'{num_short} short-answer questions (1-3 sentence answers)'
        )
    if num_long > 0:
        parts.append(
            f'{num_long} long-answer / essay questions (detailed answers, '
            f'at least 4-5 sentences)'
        )

    question_spec = '; '.join(parts)

    return f"""You are an expert academic test maker. Based on the following note{title_hint}, generate:
{question_spec}

NOTE CONTENT:
---
{note_text}
---

Respond in EXACTLY this JSON format (no markdown, no code fences, just raw JSON):
{{
  "mcqs": [
    {{
      "id": 1,
      "question": "...",
      "options": {{
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      }},
      "correct": "A",
      "explanation": "Brief explanation of why this is correct"
    }}
  ],
  "short_questions": [
    {{
      "id": 1,
      "question": "...",
      "answer": "A concise 1-3 sentence answer"
    }}
  ],
  "long_questions": [
    {{
      "id": 1,
      "question": "...",
      "answer": "A detailed answer with 4-5+ sentences covering the topic thoroughly"
    }}
  ]
}}

Rules:
- Questions must be DIRECTLY based on the note content
- MCQ distractors should be plausible but clearly wrong
- Vary difficulty: mix easy, medium, and hard questions
- Short answers should test specific facts or definitions
- Long answers should test understanding and application
- Every question must have a complete answer/explanation
- If the note content is insufficient, generate as many quality questions as possible
- Return empty arrays for question types not requested"""


def generate_test(
    note,
    num_mcqs: int = 5,
    num_short: int = 3,
    num_long: int = 2,
) -> dict:
    """
    Main entry point for test generation.

    Args:
        note: Note model instance.
        num_mcqs: Number of MCQs to generate (0-200).
        num_short: Number of short questions (0-200).
        num_long: Number of long questions (0-200).

    Returns:
        dict with mcqs, short_questions, long_questions, and metadata.
    """
    # ── Validate counts ──────────────────────────────────
    num_mcqs = max(0, min(int(num_mcqs), MAX_MCQS))
    num_short = max(0, min(int(num_short), MAX_SHORT))
    num_long = max(0, min(int(num_long), MAX_LONG))

    total_requested = num_mcqs + num_short + num_long
    if total_requested == 0:
        return {
            'success': False,
            'error': 'Please request at least one question.',
            'mcqs': [],
            'short_questions': [],
            'long_questions': [],
            'stats': {},
        }

    # ── Extract note text ────────────────────────────────
    note_text = _extract_note_text(note)
    if not note_text:
        return {
            'success': False,
            'error': 'Could not extract text from this note. Try running OCR first for scanned notes.',
            'mcqs': [],
            'short_questions': [],
            'long_questions': [],
            'stats': {},
        }

    # ── Call OpenAI ──────────────────────────────────────
    try:
        from django.conf import settings

        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if not api_key:
            return {
                'success': False,
                'error': 'AI service is not configured. Please set OPENAI_API_KEY in your environment.',
                'mcqs': [],
                'short_questions': [],
                'long_questions': [],
                'stats': {},
            }

        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        prompt = _build_prompt(
            note_text,
            num_mcqs,
            num_short,
            num_long,
            note_title=getattr(note, 'title', ''),
        )

        # Estimate max_tokens: ~150 per MCQ, ~100 per short, ~200 per long
        estimated_tokens = (num_mcqs * 150) + (num_short * 100) + (num_long * 250) + 200
        max_tokens = min(estimated_tokens, 16000)

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are an expert academic test generator. '
                        'Always respond with valid JSON only, no markdown.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.7,
            max_tokens=max_tokens,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        data = json.loads(raw)

        mcqs = data.get('mcqs', [])
        short_questions = data.get('short_questions', [])
        long_questions = data.get('long_questions', [])

        # Ensure IDs are sequential
        for i, q in enumerate(mcqs, 1):
            q['id'] = i
        for i, q in enumerate(short_questions, 1):
            q['id'] = i
        for i, q in enumerate(long_questions, 1):
            q['id'] = i

        total_generated = len(mcqs) + len(short_questions) + len(long_questions)

        return {
            'success': total_generated > 0,
            'error': '' if total_generated > 0 else 'Could not generate questions from this note content.',
            'mcqs': mcqs,
            'short_questions': short_questions,
            'long_questions': long_questions,
            'stats': {
                'mcqs': len(mcqs),
                'short_questions': len(short_questions),
                'long_questions': len(long_questions),
                'total': total_generated,
                'requested': {
                    'mcqs': num_mcqs,
                    'short': num_short,
                    'long': num_long,
                },
            },
        }

    except json.JSONDecodeError as e:
        logger.warning(f"Test generator JSON parse error: {e}")
        return {
            'success': False,
            'error': 'Failed to parse AI response. Please try again.',
            'mcqs': [],
            'short_questions': [],
            'long_questions': [],
            'stats': {},
        }
    except Exception as e:
        logger.exception(f"Test generator failed: {e}")
        return {
            'success': False,
            'error': f'AI test generation failed: {str(e)[:200]}',
            'mcqs': [],
            'short_questions': [],
            'long_questions': [],
            'stats': {},
        }
