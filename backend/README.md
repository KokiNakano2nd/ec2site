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

## DBスキーマ管理

PostgreSQL(コンテナ、将来のRDS)のスキーマはAlembic migration(`alembic.ini` + `migrations/`)のみで管理する。`create_all()`はSQLite(pytest、`make dev-host`)向けの簡便経路に限定している。

```bash
make migrate                     # コンテナのPostgreSQLへmigrationを適用
make migration m="変更の説明"    # モデル変更からmigrationを自動生成(要レビュー)
```

`make dev`・`make seed`は起動時に`alembic upgrade head`を自動実行する。自動生成されたmigrationは必ず内容をレビューし、モデルと同じ変更でコミットする。

## Lint

```bash
make lint
```

## 依存脆弱性チェック

```bash
make check
```
