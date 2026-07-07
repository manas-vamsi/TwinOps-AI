import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from dotenv import find_dotenv, load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from twinops import __version__
from twinops.core.config import get_settings
from twinops.core.errors import register_error_handlers
from twinops.core.health import router as health_router
from twinops.core.logging import configure_logging
from twinops.core.meta import router as meta_router
from twinops.core.request_id import request_id_middleware
from twinops.modules.auth.router import router as auth_router
from twinops.modules.chat.router import router as chat_router
from twinops.modules.incidents.router import router as incidents_router
from twinops.modules.knowledge.router import router as knowledge_router
from twinops.modules.twin.router import router as twin_router
from twinops.realtime.ticker import run_ticker
from twinops.realtime.ws import router as ws_router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    ticker = asyncio.create_task(run_ticker())
    try:
        yield
    finally:
        ticker.cancel()


def create_app() -> FastAPI:
    # load the repo-root .env regardless of CWD so provider keys
    # (GEMINI/GROQ/OPENROUTER) reach the LLM gateway
    load_dotenv(find_dotenv(usecwd=True))
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        docs_url="/docs" if settings.debug else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.middleware("http")(request_id_middleware)
    register_error_handlers(app)

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(meta_router)
    app.include_router(twin_router)
    app.include_router(incidents_router)
    app.include_router(knowledge_router)
    app.include_router(chat_router)
    app.include_router(ws_router)

    log.info("app_created", env=settings.env, version=__version__)
    return app


app = create_app()
