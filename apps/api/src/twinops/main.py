import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from twinops import __version__
from twinops.core.config import get_settings
from twinops.core.health import router as health_router
from twinops.core.logging import configure_logging
from twinops.core.request_id import request_id_middleware

log = structlog.get_logger()


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        docs_url="/docs" if settings.debug else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.middleware("http")(request_id_middleware)

    app.include_router(health_router)

    log.info("app_created", env=settings.env, version=__version__)
    return app


app = create_app()
