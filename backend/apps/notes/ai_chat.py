"""
AI Study Assistant — a full conversational assistant powered by OpenAI.
Maintains chat history per session and answers any academic question.
"""
import json
import logging
import re
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are **NoteHub Study Assistant** — an expert, friendly AI tutor built into an academic note-sharing platform called NoteHub.

Your capabilities:
- Answer ANY academic question across all subjects (CS, Math, Science, Engineering, etc.)
- Explain complex concepts in simple language
- Help with homework, assignments, and exam preparation
- Generate practice questions and quizzes
- Provide code examples with explanations
- Help debug code and explain errors
- Summarize topics and create study plans
- Explain formulas, theorems, and proofs
- Help with essay writing and structuring arguments
- Answer general knowledge questions
- Provide career advice related to academics

Guidelines:
- Be concise but thorough. Use bullet points and structured formatting when helpful.
- Use markdown formatting: **bold** for emphasis, `code` for inline code, code blocks with language tags.
- If the question is ambiguous, give the most likely answer and briefly note alternatives.
- For math, use clear notation. For code, always specify the language.
- Be encouraging and supportive — students are learning.
- If you don't know something, say so honestly.
- Keep responses focused and avoid unnecessary padding.
- When explaining step-by-step, number the steps clearly.
- For exam-style questions, structure the answer as an examiner would expect.
"""


def chat_with_ai(messages: list[dict], user_message: str) -> str:
    """
    Send a conversation to OpenAI and get a response.

    Args:
        messages: Previous chat history as list of {"role": ..., "content": ...}
        user_message: The new user message.

    Returns:
        The AI assistant's response text.
    """
    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        return "⚠️ AI service is not configured. Please ask the admin to set `OPENAI_API_KEY` in the environment."

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        # Build full message list: system + history + new message
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add recent history (last 20 messages to stay within context limits)
        for msg in messages[-20:]:
            full_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        # Add the new user message
        full_messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=full_messages,
            temperature=0.7,
            max_tokens=2000,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.exception(f"AI Study Assistant error: {e}")
        return f"Sorry, I encountered an error. Please try again. ({str(e)[:100]})"
