from fastapi import APIRouter, HTTPException

from twinops.modules.knowledge.service import (
    KnowledgeDoc,
    SearchHit,
    all_docs,
    get_doc,
    search,
)

router = APIRouter(prefix="/api/v1", tags=["knowledge"])


@router.get("/knowledge/search")
async def knowledge_search(q: str = "") -> list[SearchHit]:
    return search(q)


@router.get("/knowledge/docs")
async def knowledge_docs() -> list[KnowledgeDoc]:
    return all_docs()


@router.get("/knowledge/docs/{doc_id}")
async def knowledge_doc(doc_id: str) -> KnowledgeDoc:
    doc = get_doc(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"unknown doc: {doc_id}")
    return doc
