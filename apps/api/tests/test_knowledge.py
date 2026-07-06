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
