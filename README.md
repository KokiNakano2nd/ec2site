# EC_SITE

[![CI](https://github.com/KokiNakano2nd/ec2site/actions/workflows/ci.yml/badge.svg)](https://github.com/KokiNakano2nd/ec2site/actions/workflows/ci.yml)

学習目的のECサイト。FastAPI(backend) + React/Vite(frontend)。

## ドキュメント

要求定義〜内部設計までのドキュメント一式は[docs/](docs/)を参照(全体ルールは[docs/README.md](docs/README.md))。

## セットアップ

Linux/WSL x86_64上で実行する。DockerやDev Containerは使用しない。必要なtoolchainはプロジェクト内の`.tools/`へ導入されるため、システム全体へのPython/Node.jsのインストールは不要。

前提は`bash`、`make`、`curl`、gzip/xz対応`tar`、`install`、`sha256sum`。セットアップスクリプトは配布物のSHA-256を検証する。E2EにはChromiumのLinux共有ライブラリも必要で、未導入の場合は管理者承認のうえ一度だけ次を実行する。

```bash
PATH="$PWD/.tools/bin:$PATH" npm --prefix frontend exec -- playwright install-deps chromium
```

このコマンドはOSパッケージを変更するため、`make bootstrap`からは自動実行しない。

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

- frontend: http://localhost:5174
- backend: http://localhost:8001
- API docs: http://localhost:8001/docs

## 品質チェック

```bash
make check
```

主要E2Eは`make e2e`、PR相当のsmokeは`make e2e-smoke`、GitHub Actionsの静的検査は`make workflow-lint`、秘密情報の履歴スキャンは`make security`で実行する。必要な実行ファイルとPlaywrightブラウザは`.tools/`に置かれ、git管理されない。

脆弱性の非公開報告手順は[Security Policy](SECURITY.md)を参照する。
