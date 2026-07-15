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
- PR CIでは`@smoke`を付けたChromiumの主要導線を実行し、失敗時にtrace・screenshot・HTML reportを7日間保存する。
- 手元では`make e2e-smoke`でsmoke subset、`make e2e`で全件を実行できる。
- CI(GitHub Actions)ではESLint・Prettier・Vitest(カバレッジゲート込み)・production依存監査・buildも自動実行される(`.github/workflows/ci.yml`)。
