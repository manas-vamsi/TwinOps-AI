"""Knowledge base over the authored runbook corpus.

ponytail: keyword search (title-weighted term frequency) — honest and useful
today. Semantic RAG via embeddings + a vector store is the next layer; the
search() seam stays the same when it lands.
"""

import re
from pathlib import Path

from pydantic import BaseModel


class KnowledgeDoc(BaseModel):
    id: str
    title: str
    body: str


class SearchHit(BaseModel):
    id: str
    title: str
    snippet: str
    score: int


def _find_corpus() -> Path | None:
    for parent in Path(__file__).resolve().parents:
        cand = parent / "data" / "corpus"
        if cand.is_dir():
            return cand
    return None


def _load() -> dict[str, KnowledgeDoc]:
    corpus = _find_corpus()
    docs: dict[str, KnowledgeDoc] = {}
    if corpus is None:
        return docs
    for path in sorted(corpus.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        first = text.lstrip().splitlines()[0] if text.strip() else path.stem
        title = first.lstrip("# ").strip() or path.stem
        docs[path.stem] = KnowledgeDoc(id=path.stem, title=title, body=text)
    return docs


_DOCS = _load()


def _tokens(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", s.lower())


def all_docs() -> list[KnowledgeDoc]:
    return list(_DOCS.values())


def get_doc(doc_id: str) -> KnowledgeDoc | None:
    return _DOCS.get(doc_id)


def search(query: str) -> list[SearchHit]:
    terms = _tokens(query)
    if not terms:
        return []
    hits: list[SearchHit] = []
    for doc in _DOCS.values():
        title_toks = _tokens(doc.title)
        body_toks = _tokens(doc.body)
        score = 0
        for t in terms:
            score += 3 * title_toks.count(t)
            score += body_toks.count(t)
        if score > 0:
            snippet = " ".join(doc.body.split()[:32]).lstrip("# ")
            hits.append(SearchHit(id=doc.id, title=doc.title, snippet=snippet, score=score))
    return sorted(hits, key=lambda h: h.score, reverse=True)
