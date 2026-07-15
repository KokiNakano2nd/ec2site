SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

ENV_FILE ?= .env
ROOT_DIR := $(abspath .)
ENV_PATH := $(abspath $(ENV_FILE))
TOOLS_DIR := $(ROOT_DIR)/.tools
TOOLS_BIN := $(TOOLS_DIR)/bin
RUN_WITH_ENV := uv run --project backend python backend/scripts/run_with_env.py --env-file "$(ENV_PATH)"
export PATH := $(TOOLS_BIN):$(PATH)
export UV_CACHE_DIR := $(TOOLS_DIR)/cache
export UV_PYTHON_INSTALL_DIR := $(TOOLS_DIR)/python
export UV_FROZEN := 1
export PLAYWRIGHT_BROWSERS_PATH := $(TOOLS_DIR)/playwright

COMPOSE := docker compose

.PHONY: help bootstrap verify-toolchain verify-docker seed seed-host dev dev-host backend-dev frontend-dev migrate migration format lint workflow-lint test test-integration build check e2e e2e-smoke security

help:
	@echo "bootstrap       Install the pinned local toolchain and locked dependencies"
	@echo "seed            Seed local development data into the containerized PostgreSQL"
	@echo "dev             Run backend + PostgreSQL in containers and frontend on the host"
	@echo "dev-host        Run backend and frontend on the host with SQLite (legacy path)"
	@echo "migrate         Apply Alembic migrations to the containerized PostgreSQL"
	@echo "migration       Autogenerate an Alembic migration (make migration m=\"message\")"
	@echo "format          Format backend source"
	@echo "lint            Run static checks and documentation checks"
	@echo "workflow-lint   Validate GitHub Actions workflows"
	@echo "test            Run backend and frontend tests (fast host path, SQLite)"
	@echo "test-integration Run backend tests against containerized PostgreSQL (CI parity)"
	@echo "build           Build the frontend"
	@echo "check           Run the same non-E2E quality gates as CI"
	@echo "e2e             Run Playwright against the containerized backend + PostgreSQL"
	@echo "e2e-smoke       Run the fast Playwright smoke subset"
	@echo "security        Scan Git history for secrets with Gitleaks"

bootstrap:
	bash scripts/bootstrap_dev.sh

verify-toolchain:
	@command -v uv >/dev/null || { echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; }
	@uv --version | grep -q '^uv 0\.11\.28\b' || { echo "uv 0.11.28 is required; run 'make bootstrap'" >&2; exit 1; }
	@command -v node >/dev/null || { echo "Node.js is required; run 'make bootstrap'" >&2; exit 1; }
	@command -v npm >/dev/null || { echo "npm is required" >&2; exit 1; }
	@uv python find 3.12.13 >/dev/null || { echo "Python 3.12.13 is required" >&2; exit 1; }
	@cd frontend && node -e 'if (process.versions.node !== "24.18.0") throw new Error("Node.js 24.18.0 is required")'

backend-dev:
	$(RUN_WITH_ENV) --cwd backend -- python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

frontend-dev:
	$(RUN_WITH_ENV) --cwd frontend -- npm run dev -- --host --port 5174

verify-docker:
	@command -v docker >/dev/null || { echo "Docker Engine is required; see README.md" >&2; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Docker daemon is not running or not accessible; check 'systemctl status docker' and the docker group" >&2; exit 1; }

seed: verify-docker
	$(COMPOSE) run --rm --build backend sh -c "alembic upgrade head && python -m scripts.seed_dev"

migrate: verify-docker
	$(COMPOSE) run --rm --build backend alembic upgrade head

migration: verify-docker
	@test -n "$(m)" || { echo "Usage: make migration m=\"describe the change\"" >&2; exit 1; }
	$(COMPOSE) run --rm --build --user "$$(id -u):$$(id -g)" backend sh -c "alembic upgrade head && alembic revision --autogenerate -m '$(m)'"

seed-host:
	$(RUN_WITH_ENV) --cwd backend -- python -m scripts.seed_dev

dev: verify-docker seed
	@$(COMPOSE) up --build db backend & compose_pid=$$!; \
	$(MAKE) frontend-dev & frontend_pid=$$!; \
	trap 'kill $$frontend_pid 2>/dev/null || true; $(COMPOSE) down' EXIT INT TERM; \
	wait

dev-host: seed-host
	@$(MAKE) backend-dev & backend_pid=$$!; \
	$(MAKE) frontend-dev & frontend_pid=$$!; \
	trap 'kill $$backend_pid $$frontend_pid 2>/dev/null || true' EXIT INT TERM; \
	wait

format:
	cd backend && uv run ruff check --fix .
	cd backend && uv run ruff format .
	cd frontend && npm run format

lint:
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .
	cd backend && uv run python scripts/export_openapi.py --check
	cd backend && uv run python scripts/check_docs.py
	cd frontend && npm run lint
	cd frontend && npm run format:check

workflow-lint:
	@command -v actionlint >/dev/null || { echo "Run 'make bootstrap' first" >&2; exit 1; }
	actionlint

test:
	cd backend && uv run pytest
	cd frontend && npm run test:coverage

test-integration: verify-docker
	@$(COMPOSE) -f compose.test.yaml run --build --rm backend-test; status=$$?; \
	$(COMPOSE) -f compose.test.yaml down --remove-orphans; exit $$status

build:
	cd frontend && npm run build

check: verify-toolchain lint workflow-lint test build
	cd backend && uv run pip-audit
	cd frontend && npm run audit:prod
	$(MAKE) test-integration

e2e: verify-docker
	@cd frontend && npm run test:e2e; status=$$?; \
	cd .. && $(COMPOSE) -f compose.e2e.yaml down --remove-orphans; exit $$status

e2e-smoke: verify-docker
	@cd frontend && npm run test:e2e:smoke; status=$$?; \
	cd .. && $(COMPOSE) -f compose.e2e.yaml down --remove-orphans; exit $$status

security:
	@command -v gitleaks >/dev/null || { echo "Run 'make bootstrap' first" >&2; exit 1; }
	gitleaks git --redact --no-banner --verbose .
