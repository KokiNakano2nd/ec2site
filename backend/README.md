# backend

## セットアップ

依存管理は[uv](https://docs.astral.sh/uv/)を使用する(`pyproject.toml` + `uv.lock`)。リポジトリルートで`make bootstrap`を実行すると、固定版uvとPython 3.12.13を`.tools/`へ導入して依存を同期する。

```bash
make bootstrap
```

## テスト実行

```bash
make test
```

- `pytest.ini`でカバレッジ70%未満の場合は失敗するよう設定している(`--cov-fail-under=70`)。
- テストは`DATABASE_URL`環境変数でテスト専用の一時SQLiteに向くようになっており(`tests/conftest.py`)、開発用DB(`app/data/ec_site.db`)には触れない。
- Stripe・SMTP(メール送信)は`tests/conftest.py`のfixtureでモック化しており、実行に外部のAPIキーやネットワーク接続は不要。
- CI(GitHub Actions)でもこのテストコマンドがpush/PRごとに自動実行される(`.github/workflows/ci.yml`)。

## Lint

```bash
make lint
```

## 依存脆弱性チェック

```bash
make check
```
