"""Knowledge base over the authored runbook corpus.

Search is hybrid: keyword score (title-weighted term frequency) blended with
semantic similarity from Ollama embeddings when the local Ollama is reachable.
ponytail: in-memory cosine over the whole corpus — a vector store (ChromaDB)
only earns its keep once the corpus outgrows a single embed batch (~100 docs).
If Ollama is down, search degrades to keyword-only; it never fails.
"""

import math
import os
import re
import time
from pathlib import Path

import httpx
import structlog
from pydantic import BaseModel

log = structlog.get_logger()


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


_OLLAMA_URL = os.environ.get("TWINOPS_OLLAMA_URL", "http://localhost:11434")
_EMBED_MODEL = os.environ.get("TWINOPS_EMBED_MODEL", "qwen2.5:3b")

# doc id -> embedding, built lazily on first semantic search; None = not built yet
_doc_vecs: dict[str, list[float]] | None = None

# negative cache: after a failed embed, skip semantic search for a cooldown so
# every request doesn't pay a connection-refused round trip while Ollama is down
_RETRY_COOLDOWN_S = 60.0
_down_until = 0.0


def _embed(texts: list[str]) -> list[list[float]]:
    resp = httpx.post(
        f"{_OLLAMA_URL}/api/embed",
        json={"model": _EMBED_MODEL, "input": texts},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["embeddings"]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


def _semantic_scores(query: str) -> dict[str, float] | None:
    """Cosine similarity per doc, or None when Ollama is unreachable."""
    global _doc_vecs, _down_until
    if time.monotonic() < _down_until:
        return None
    try:
        if _doc_vecs is None:
            vecs = _embed([f"{d.title}\n{d.body[:2000]}" for d in _DOCS.values()])
            _doc_vecs = dict(zip(_DOCS, vecs, strict=True))
        qv = _embed([query])[0]
        return {doc_id: _cosine(qv, v) for doc_id, v in _doc_vecs.items()}
    except Exception as exc:
        _down_until = time.monotonic() + _RETRY_COOLDOWN_S
        log.warning(
            "semantic_search_unavailable", error=str(exc), retry_in_s=_RETRY_COOLDOWN_S
        )
        return None


def _keyword_score(doc: KnowledgeDoc, terms: list[str]) -> int:
    title_toks = _tokens(doc.title)
    body_toks = _tokens(doc.body)
    return sum(3 * title_toks.count(t) + body_toks.count(t) for t in terms)


def search(query: str) -> list[SearchHit]:
    terms = _tokens(query)
    if not terms:
        return []
    semantic = _semantic_scores(query)
    hits: list[SearchHit] = []
    for doc in _DOCS.values():
        kw = _keyword_score(doc, terms)
        # semantic on: cosine (scaled) ranks, keyword matches boost; off: keyword only
        score = round(100 * semantic[doc.id]) + kw if semantic else kw
        if score > 0:
            snippet = " ".join(doc.body.split()[:32]).lstrip("# ")
            hits.append(SearchHit(id=doc.id, title=doc.title, snippet=snippet, score=score))
    return sorted(hits, key=lambda h: h.score, reverse=True)
