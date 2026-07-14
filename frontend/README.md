# frontend

## セットアップ

リポジトリルートで`make bootstrap`を実行すると、Node.js 24.18.0、npm依存、Playwright Chromiumを`.tools/`へ導入する。Dockerやシステム全体へのNode.js導入は不要。

```bash
make bootstrap
make frontend-dev
```

ChromiumのLinux共有ライブラリはproject-localにはできない。E2Eで不足が報告された場合は、管理者承認のうえroot README記載の`playwright install-deps chromium`を一度だけ実行する。

## テスト

```bash
make test
```

## Lint

```bash
make lint
```

## E2E(Playwright)

```bash
make e2e
```

- backendは`backend/scripts/run_e2e_server.py`からテスト専用の一時SQLiteで起動され、開発DBには接続しない。
- 現時点ではCIには含めず、手元実行のみ([[../docs/deliverables/requirements/06_nonfunctional_requirements|NFR-020]]参照)。
- CI(GitHub Actions)ではlint・vitest(カバレッジゲート込み)・buildが自動実行される(`.github/workflows/ci.yml`)。
