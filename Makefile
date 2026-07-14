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

.PHONY: help bootstrap verify-toolchain seed dev backend-dev frontend-dev format lint test build check e2e security

help:
	@echo "bootstrap       Install the pinned local toolchain and locked dependencies"
	@echo "seed            Seed local development data explicitly"
	@echo "dev             Run backend and frontend on the host"
	@echo "format          Format backend source"
	@echo "lint            Run static checks and documentation checks"
	@echo "test            Run backend and frontend tests"
	@echo "build           Build the frontend"
	@echo "check           Run the same non-E2E quality gates as CI"
	@echo "e2e             Run Playwright with self-managed web servers"
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

seed:
	$(RUN_WITH_ENV) --cwd backend -- python -m scripts.seed_dev

dev: seed
	@$(MAKE) backend-dev & backend_pid=$$!; \
	$(MAKE) frontend-dev & frontend_pid=$$!; \
	trap 'kill $$backend_pid $$frontend_pid 2>/dev/null || true' EXIT INT TERM; \
	wait

format:
	cd backend && uv run ruff check --fix .
	cd backend && uv run ruff format .

lint:
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .
	cd backend && uv run python scripts/export_openapi.py --check
	cd backend && uv run python scripts/check_docs.py
	cd frontend && npm run lint

test:
	cd backend && uv run pytest
	cd frontend && npm run test:coverage

build:
	cd frontend && npm run build

check: verify-toolchain lint test build
	cd backend && uv run pip-audit --ignore-vuln PYSEC-2026-1325

e2e:
	cd frontend && npm run test:e2e

security:
	@command -v gitleaks >/dev/null || { echo "Run 'make bootstrap' first" >&2; exit 1; }
	gitleaks git --redact --no-banner --verbose .
