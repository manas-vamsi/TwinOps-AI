from twinops.modules.knowledge import service
from twinops.modules.knowledge.service import all_docs, get_doc, search


def test_corpus_loads() -> None:
    docs = all_docs()
    assert len(docs) >= 5
    assert get_doc("cache-stampede") is not None


def test_search_ranks_relevant_runbook_first() -> None:
    hits = search("database connection pool")
    assert hits
    assert hits[0].id == "db-connection-pool-exhaustion"


def test_search_empty_query_returns_nothing() -> None:
    assert search("") == []


def test_semantic_ranking_blends_cosine(monkeypatch) -> None:
    def fake_scores(query: str) -> dict[str, float]:
        return {d.id: (0.9 if d.id == "payment-provider-latency" else 0.1) for d in all_docs()}

    monkeypatch.setattr(service, "_semantic_scores", fake_scores)
    hits = search("checkout is slow for customers")  # no keyword overlap with the title
    assert hits[0].id == "payment-provider-latency"


def test_search_survives_ollama_down(monkeypatch) -> None:
    monkeypatch.setattr(service, "_OLLAMA_URL", "http://127.0.0.1:9")  # unroutable
    monkeypatch.setattr(service, "_doc_vecs", None)
    monkeypatch.setattr(service, "_down_until", 0.0)
    hits = search("database connection pool")
    assert hits and hits[0].id == "db-connection-pool-exhaustion"
