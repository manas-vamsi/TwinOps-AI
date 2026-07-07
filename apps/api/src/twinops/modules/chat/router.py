from fastapi import APIRouter, Depends

from twinops.core.ratelimit import rate_limit
from twinops.modules.auth.deps import require_auth
from twinops.modules.chat.service import ChatRequest, ChatResponse, answer_chat

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post(
    "/chat",
    dependencies=[
        Depends(rate_limit("chat", max_calls=20, window_s=60)),
        Depends(require_auth),
    ],
)
async def chat(req: ChatRequest) -> ChatResponse:
    return answer_chat(req.message)
