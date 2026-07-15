# EC_SITE

[![CI](https://github.com/KokiNakano2nd/ec2site/actions/workflows/ci.yml/badge.svg)](https://github.com/KokiNakano2nd/ec2site/actions/workflows/ci.yml)

学習目的のECサイト。FastAPI(backend) + React/Vite(frontend)。

## ドキュメント

要求定義〜内部設計までのドキュメント一式は[docs/](docs/)を参照(全体ルールは[docs/README.md](docs/README.md))。

## セットアップ

Linux/WSL x86_64上で実行する。backendとPostgreSQLはDockerコンテナで起動し(ADR-003)、lint・test・E2E等のtoolchainはプロジェクト内の`.tools/`へ導入されるため、システム全体へのPython/Node.jsのインストールは不要。

前提は`bash`、`make`、`curl`、gzip/xz対応`tar`、`unzip`、`install`、`sha256sum`、Docker Engine(compose plugin含む)。セットアップスクリプトは配布物のSHA-256を検証する。IaC([infra/](infra/))用のTerraformも固定版が`.tools/`へ導入される。

OSパッケージを変更する次の2つは、管理者承認のうえ一度だけ手動で実行する(`make bootstrap`からは自動実行しない)。

Docker Engine未導入の場合(WSL/Ubuntu、systemd有効が前提):

```bash
bash scripts/install_docker_wsl.sh
```

E2Eに必要なChromiumのLinux共有ライブラリが未導入の場合:

```bash
PATH="$PWD/.tools/bin:$PATH" npm --prefix frontend exec -- playwright install-deps chromium
```

初回セットアップ:

```bash
make bootstrap
```

`make bootstrap`は`.env.example`からgit管理外の`.env`を作成し、lockfileを変更せずbackend/frontendの依存を同期する。StripeやSMTPを使う場合だけ`.env`へ資格情報を設定する。

個別の説明:

- backend: [backend/README.md](backend/README.md)
- frontend: [frontend/README.md](frontend/README.md)

## 開発起動

```bash
make dev
```

`make dev`はDocker ComposeでPostgreSQLとbackend(FastAPI、`--reload`付き)を起動し、frontend(Vite dev server)をホストで起動する。開発データのseedも自動で行う。

- frontend: http://localhost:5174
- backend: http://localhost:8001
- API docs: http://localhost:8001/docs
- PostgreSQL: 127.0.0.1:5432 (ローカル専用資格情報は[compose.yaml](compose.yaml)を参照)

Dockerを使わない従来のホスト起動(SQLite)は`make dev-host`で残している。

## 品質チェック

```bash
make check
```

主要E2Eは`make e2e`、PR相当のsmokeは`make e2e-smoke`、GitHub Actionsの静的検査は`make workflow-lint`、秘密情報の履歴スキャンは`make security`で実行する。必要な実行ファイルとPlaywrightブラウザは`.tools/`に置かれ、git管理されない。

脆弱性の非公開報告手順は[Security Policy](SECURITY.md)を参照する。
