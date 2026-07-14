from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from . import config, stripe_client  # noqa: F401 -- import triggers Stripe API key setup
from .database import Base, engine
from .logging_config import get_logger
from .routers import (
    addresses,
    admin_analytics,
    admin_coupons,
    admin_orders,
    admin_products,
    cart,
    coupons,
    favorites,
    orders,
    payment,
    products,
    users,
)

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if config.APP_ENV in {"local", "test"}:
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="EC Site API",
    version="0.0.1",
    description="TechStore ECサイトのHTTP API。機械可読な正本はこのOpenAPI文書とする。",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(users.router)
app.include_router(cart.router)
app.include_router(favorites.router)
app.include_router(addresses.router)
app.include_router(admin_products.router)
app.include_router(coupons.router)
app.include_router(admin_coupons.router)
app.include_router(admin_analytics.router)
app.include_router(orders.router)
app.include_router(admin_orders.router)
app.include_router(payment.router)


def custom_openapi():
    """実際の共通認証エラーを含むOpenAPIスキーマを生成する。"""
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {}).setdefault("schemas", {})["HTTPError"] = {
        "type": "object",
        "required": ["detail"],
        "properties": {"detail": {"type": "string"}},
    }

    def error_response(description: str) -> dict:
        return {
            "description": description,
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/HTTPError"}}},
        }

    for path, path_item in schema["paths"].items():
        for method, operation in path_item.items():
            if method not in {"get", "post", "put", "patch", "delete", "options", "head", "trace"}:
                continue
            responses = operation.setdefault("responses", {})
            if operation.get("security"):
                responses.setdefault("401", error_response("Bearerトークンがない、無効、期限切れ、または退会済み"))
            if path.startswith("/admin/"):
                responses.setdefault("403", error_response("管理者権限がない"))
            if path in {"/auth/login", "/auth/register"}:
                responses.setdefault("429", error_response("レート制限超過"))

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi
