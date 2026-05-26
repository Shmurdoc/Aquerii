import re
from typing import Any
from abc import ABC, abstractmethod


class TextSplitter(ABC):
    def __init__(self, chunk_size: int = 832, chunk_overlap: int = 32,
                 length_function=lambda s: len(s), keep_separator: bool = False,
                 strip_whitespace: bool = True):
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._length_function = length_function
        self._keep_separator = keep_separator
        self._strip_whitespace = strip_whitespace

    @abstractmethod
    def split_text(self, text: str) -> list[str]:
        pass

    def split(self, text: str) -> list[str]:
        return self.split_text(text)

    def _join_chunks(self, chunks: list[str], separator: str) -> str | None:
        text = separator.join(chunks)
        if self._strip_whitespace:
            text = text.strip()
        return text or None

    def _merge_splits(self, splits: list[str], separator: str) -> list[str]:
        sep_len = self._length_function(separator)
        chunks: list[str] = []
        current: list[str] = []
        total = 0
        for d in splits:
            d_len = self._length_function(d)
            if total + d_len + (sep_len if current else 0) > self._chunk_size:
                if current:
                    chunk = self._join_chunks(current, separator)
                    if chunk:
                        chunks.append(chunk)
                while total > self._chunk_overlap or (
                        total + d_len + (sep_len if current else 0) > self._chunk_size and total > 0):
                    total -= self._length_function(current[0]) + (sep_len if len(current) > 1 else 0)
                    current = current[1:]
            current.append(d)
            total += d_len + (sep_len if len(current) > 1 else 0)
        if current:
            chunk = self._join_chunks(current, separator)
            if chunk:
                chunks.append(chunk)
        return chunks


def _split_with_regex(text: str, separator: str, keep_separator: bool) -> list[str]:
    if not separator:
        return list(text)
    if keep_separator:
        splits = re.split(f'({separator})', text)
        result = [splits[i] + splits[i + 1] for i in range(0, len(splits) - 1, 2)]
        if len(splits) % 2 == 0:
            result += splits[-1:]
        return [s for s in result if s]
    return [s for s in re.split(separator, text) if s]


class RecursiveCharacterTextSplitter(TextSplitter):
    def __init__(self, separators: list[str] | None = None,
                 keep_separator: bool = True, is_separator_regex: bool = False,
                 **kwargs: Any):
        super().__init__(keep_separator=keep_separator, **kwargs)
        self._separators = separators or ['\n\n', '\n', ' ', '']
        self._is_separator_regex = is_separator_regex

    def _split(self, text: str, separators: list[str]) -> list[str]:
        final = []
        sep = separators[-1]
        new_seps = []
        for i, s in enumerate(separators):
            pattern = s if self._is_separator_regex else re.escape(s)
            if s == '':
                sep = s
                break
            if re.search(pattern, text):
                sep = s
                new_seps = separators[i + 1:]
                break

        sep_pattern = sep if self._is_separator_regex else re.escape(sep)
        splits = _split_with_regex(text, sep_pattern, self._keep_separator)
        good, sep_str = [], '' if self._keep_separator else sep

        for s in splits:
            if self._length_function(s) < self._chunk_size:
                good.append(s)
            else:
                if good:
                    final.extend(self._merge_splits(good, sep_str))
                    good = []
                if not new_seps:
                    final.append(s)
                else:
                    final.extend(self._split(s, new_seps))
        if good:
            final.extend(self._merge_splits(good, sep_str))
        return final

    def split_text(self, text: str) -> list[str]:
        return self._split(text, self._separators)


class ChineseRecursiveTextSplitter(RecursiveCharacterTextSplitter):
    def __init__(self, separators: list[str] | None = None,
                 keep_separator: bool = True, is_separator_regex: bool = True,
                 **kwargs: Any):
        super().__init__(keep_separator=keep_separator, **kwargs)
        self._separators = separators or [
            '\n\n', '\n', '。|！|？', r'\.\s|\!\s|\?\s', '；|;\s', '，|,\s'
        ]
        self._is_separator_regex = is_separator_regex

    def _split_with_regex_from_end(self, text, separator, keep_separator):
        if not separator:
            return list(text)
        if keep_separator:
            splits = re.split(f'({separator})', text)
            result = [''.join(i) for i in zip(splits[0::2], splits[1::2])]
            if len(splits) % 2 == 1:
                result += splits[-1:]
            return [s for s in result if s]
        return [s for s in re.split(separator, text) if s]

    def _split(self, text: str, separators: list[str]) -> list[str]:
        final = []
        sep = separators[-1]
        new_seps = []
        for i, s in enumerate(separators):
            pattern = s if self._is_separator_regex else re.escape(s)
            if s == '':
                sep = s
                break
            if re.search(pattern, text):
                sep = s
                new_seps = separators[i + 1:]
                break

        sep_pattern = sep if self._is_separator_regex else re.escape(sep)
        splits = self._split_with_regex_from_end(text, sep_pattern, self._keep_separator)
        good, sep_str = [], '' if self._keep_separator else sep

        for s in splits:
            if self._length_function(s) < self._chunk_size:
                good.append(s)
            else:
                if good:
                    final.extend(self._merge_splits(good, sep_str))
                    good = []
                if not new_seps:
                    final.append(s)
                else:
                    final.extend(self._split(s, new_seps))
        if good:
            final.extend(self._merge_splits(good, sep_str))
        return [re.sub(r'\n{2,}', '\n', c.strip()) for c in final if c.strip()]


class MarkdownHeaderTextSplitter:
    def __init__(self, headers_to_split_on: list[tuple[str, str]] | None = None,
                 strip_headers: bool = True):
        self.headers_to_split_on = sorted(
            headers_to_split_on or [
                ('#', 'Header 1'), ('##', 'Header 2'), ('###', 'Header 3')
            ], key=lambda x: len(x[0]), reverse=True
        )
        self.strip_headers = strip_headers

    def split(self, text: str, base_metadata: dict | None = None) -> list[dict]:
        base = base_metadata or {}
        lines = text.split('\n')
        result: list[dict[str, str | list[str] | dict]] = []
        current_content: list[str] = []
        header_stack: list[dict[str, str | int]] = []
        initial_meta: dict[str, str] = {}
        in_code = False
        fence = ''

        for line in lines:
            if not in_code and line.strip().startswith('```'):
                in_code = True
                fence = '```'
            elif in_code and line.strip().startswith(fence):
                in_code = False
                fence = ''

            if in_code:
                current_content.append(line)
                continue

            matched = False
            for sep, name in self.headers_to_split_on:
                stripped = line.strip()
                if stripped.startswith(sep) and (
                        len(stripped) == len(sep) or stripped[len(sep)] == ' '):
                    if current_content:
                        result.append({
                            'content': '\n'.join(current_content),
                            'metadata': {**initial_meta, **base}
                        })
                        current_content = []
                    while header_stack and int(header_stack[-1]['level']) >= sep.count('#'):
                        h = header_stack.pop()
                        name = str(h.get('name', ''))
                        initial_meta.pop(name, None)
                    header_stack.append({
                        'level': sep.count('#'),
                        'name': name,
                        'data': stripped[len(sep):].strip()
                    })
                    initial_meta[name] = stripped[len(sep):].strip()
                    if not self.strip_headers:
                        current_content.append(stripped)
                    matched = True
                    break

            if not matched:
                if stripped := line.strip():
                    current_content.append(stripped)
                elif current_content:
                    result.append({
                        'content': '\n'.join(current_content),
                        'metadata': {**initial_meta, **base}
                    })
                    current_content = []

        if current_content:
            result.append({
                'content': '\n'.join(current_content),
                'metadata': {**initial_meta, **base}
            })

        merged = []
        for item in result:
            if merged and merged[-1]['metadata'] == item['metadata']:
                merged[-1]['content'] += '\n' + item['content']
            else:
                merged.append(item)
        return merged


def nested_split_text(text: str, chunk_size: int = 832, metadata: dict | None = None,
                      language: str = 'en') -> list[str]:
    meta = metadata or {}
    chunks = MarkdownHeaderTextSplitter().split(text, meta)
    result = []
    splitter_cls = ChineseRecursiveTextSplitter if language == 'zh' else RecursiveCharacterTextSplitter
    splitter = splitter_cls(chunk_size=chunk_size)

    for chunk in chunks:
        header = ' '.join(v for v in chunk['metadata'].values() if isinstance(v, str))
        if len(chunk['content']) > chunk_size:
            for sub in splitter.split(chunk['content']):
                if len(sub) >= 10:
                    result.append(f"{header} {sub}" if header else sub)
        elif len(chunk['content']) >= 10:
            result.append(f"{header} {chunk['content']}" if header else chunk['content'])

    return result
