"""
Prompt injection detection and PII stripping.
Referenced in SECURITY.md §4.
"""
import re
from typing import Optional

# PII patterns
_PII_PATTERNS = [
    (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '[SSN]'),           # US SSN
    (re.compile(r'\b(?:\d[ -]?){13,16}\b'), '[CARD]'),           # Credit card
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL]'),
    (re.compile(r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b'), '[PHONE]'),
    (re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b'), '[CARD]'),
]

# Prompt injection patterns
_INJECTION_PATTERNS = [
    re.compile(r'ignore\s+(all\s+)?previous\s+instructions?', re.IGNORECASE),
    re.compile(r'forget\s+(all\s+)?previous\s+instructions?', re.IGNORECASE),
    re.compile(r'you\s+are\s+now\s+(?:a\s+)?(?:an?\s+)?(?:different|new|evil|malicious)', re.IGNORECASE),
    re.compile(r'system\s*:\s*you\s+are', re.IGNORECASE),
    re.compile(r'<\s*system\s*>', re.IGNORECASE),
    re.compile(r'\[\s*system\s*\]', re.IGNORECASE),
    re.compile(r'jailbreak', re.IGNORECASE),
    re.compile(r'pretend\s+(?:you\s+are|to\s+be)\s+(?:a\s+)?(?:an?\s+)?(?:different|evil|unrestricted)', re.IGNORECASE),
    re.compile(r'DAN\s+mode', re.IGNORECASE),
    re.compile(r'do\s+anything\s+now', re.IGNORECASE),
]

# Max input length
MAX_INPUT_LENGTH = 10_000


class PromptInjectionError(ValueError):
    pass


def strip_pii(text: str) -> str:
    """Replace PII patterns with redacted placeholders."""
    for pattern, replacement in _PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def detect_injection(text: str) -> bool:
    """Return True if prompt injection patterns are detected."""
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False


def sanitize(text: str, strip_pii: bool = True) -> str:
    """
    Sanitize user input before passing to LLM.
    Raises PromptInjectionError if injection detected.
    """
    if not text or not text.strip():
        return ''

    # Truncate
    text = text[:MAX_INPUT_LENGTH]

    # Injection check
    if detect_injection(text):
        raise PromptInjectionError('Prompt injection attempt detected.')

    # PII stripping
    if strip_pii:
        for pattern, replacement in _PII_PATTERNS:
            text = pattern.sub(replacement, text)

    return text
