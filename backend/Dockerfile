# syntax=docker/dockerfile:1
# 開発(dev)と本番(production)で共有するbackendイメージ。
# バージョンはリポジトリの固定方針に合わせる: Python 3.12.13 / uv 0.11.28 (scripts/bootstrap_dev.sh)
FROM python:3.12.13-slim AS base

COPY --from=ghcr.io/astral-sh/uv:0.11.28 /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 依存層を先に固めてビルドキャッシュを効かせる
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY scripts ./scripts
COPY alembic.ini ./
COPY migrations ./migrations

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8001

FROM base AS dev
# compose がソースを bind mount し、--reload で変更を反映する。
# 開発ではmigration適用を起動時に自動実行する(本番は別工程で適用してから起動する)。
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"]

FROM base AS production
RUN groupadd --system app && useradd --system --gid app --no-create-home app
USER app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
