# 開発環境 ToBe 設計

## 1. 目的

clone後のセットアップ、実装、検証をLinux/WSL上で再現可能にする。本プロジェクトはDocker、Docker Compose、Dev Containerを開発・検証経路として採用しない。OSへ言語ランタイムを個別導入せず、リポジトリ内の`.tools/`へ固定版toolchainを配置する。

達成する状態は次のとおり。

- `make bootstrap`だけで固定版toolchain、依存、E2Eブラウザを準備できる
- ローカルとCIが同じlockfile、言語バージョン、品質ゲートを使う
- シークレットをGitへ保存せず、環境別の設定不足を起動時に検出する
- backend/frontendをホストプロセスとして直接起動し、終了時に子プロセスを回収する
- lint、test、build、依存監査、E2E、secret scanへ統一コマンドから到達できる

関連資料は[デプロイ・構成設計](02_deployment_design.md)、[セキュリティ・プライバシー設計](03_security_privacy_design.md)、[テスト計画](../verification/02_test_plan.md)、[コーディング規約](../../coding_conventions/common.md)を正本とする。

## 2. 採用方針

### 2.1 対応環境

| 項目 | 方針 |
|---|---|
| OS | Linux/WSL、x86_64を標準環境とする |
| shell | Bash |
| task runner | root `Makefile` |
| 隔離単位 | project-local `.tools/`、backend `.venv`、frontend `node_modules` |
| コンテナ | 開発・CI・配布のいずれにも現時点では採用しない |
| OS package | Chromium共有ライブラリのみE2Eに必要。明示承認のある一回限りの導入とする |

WindowsネイティブやmacOSを正式対応する場合は、配布archive名・checksum・OS依存ライブラリを別途設計する。現在のbootstrapが対応外環境を暗黙に処理しないよう、対応環境をREADMEに明記する。

### 2.2 バージョンと単一正本

| 対象 | 固定・管理方法 | 正本 |
|---|---|---|
| uv | 0.11.28、archiveのSHA-256を検証 | `scripts/bootstrap_dev.sh` |
| Python | 3.12.13 | `backend/.python-version`、`pyproject.toml`、bootstrap、CI |
| Python package | frozen sync | `backend/pyproject.toml`、`backend/uv.lock` |
| Node.js | 24.18.0 | bootstrap、`frontend/.nvmrc`、`package.json#engines`、CI |
| npm package | clean install | `frontend/package.json`、`frontend/package-lock.json` |
| Gitleaks | 8.30.1、archiveのSHA-256を検証 | bootstrap、security workflow |
| Playwright browser | npm依存に対応するChromium | `frontend/package-lock.json`、`.tools/playwright` |

bootstrapはtoolchainを`.tools/bin`から参照し、uv cache、uv管理Python、Playwrightブラウザも`.tools/`内へ置く。`.tools/`は生成物としてgitignoreする。Chromiumの共有ライブラリはOS管理のためbootstrapへ含めず、不足時だけ管理者承認を得てPlaywright公式の`install-deps`を実行する。依存追加時だけmanifestとlockfileを同じ変更で更新し、通常同期は`uv sync --frozen`と`npm ci`を使う。

### 2.3 設定とシークレット

- root `.env.example`を設定名と安全なlocal既定値の正本とする
- 初回だけgitignoredのroot `.env`を生成し、既存ファイルは上書きしない
- backend設定は`app/config.py`へ集約し、型・許容値・環境別必須性をimport時に検証する
- productionでは既定SECRET_KEY、未指定DB、非HTTPS origin、consoleメールを拒否する
- `VITE_*`にはブラウザへ公開可能な値だけを置く
- testは専用の一時DBとモック外部サービスを使い、local DBや実Stripe/SMTPへ接続しない

### 2.4 標準コマンド

| コマンド | 契約 |
|---|---|
| `make bootstrap` | toolchainの取得・checksum検証、依存同期、`.env`初期生成、Chromium導入 |
| `make verify-toolchain` | uv、Python、Node.jsの期待版を検証 |
| `make dev` | backend `:8001`とfrontend `:5174`を直接起動 |
| `make format` | backend formatterと安全な自動修正を実行 |
| `make lint` | Ruff、OpenAPI、文書整合、ESLintを実行 |
| `make test` | pytestとVitest coverageを実行 |
| `make build` | frontend production buildを生成 |
| `make check` | CI相当の非E2E品質ゲートと依存監査を実行 |
| `make e2e` | Playwrightがテスト専用serverとDBを自己管理して実行 |
| `make security` | GitleaksでGit履歴を検査 |

Makefileは薄い入口に保ち、テストや設定ロジックを複製しない。CIとの差が生じた場合は同じ変更で揃える。

## 3. 品質・セキュリティ方針

- PRでbackend/frontendのlint、test、coverage、build、OpenAPI・文書差分、依存監査を必須化する
- CodeQLとGitleaksを定期実行し、workflow権限を最小化する
- GitHub Actionsはfull-length commit SHA固定を目標とし、自動更新PRで追従する
- 脆弱性除外には識別子、影響、理由、期限、解消条件を持たせる
- formatter、lint、testは既存の[コーディング規約](../../coding_conventions/common.md)を機械的に補完し、レビューの代替とはしない
- E2E失敗時はtrace、screenshot、reportを診断可能な形で保存する

DBスキーマは今後Alembic等でversion管理し、`create_all()`を本番更新手段にしない。本番候補DBが決定した時点で、実サービスまたはCI向けmanaged serviceを用いた統合テストを設計する。コンテナ導入を前提条件にしない。

## 4. 推奨ファイル構成

```text
.
├── .env.example
├── .github/
│   ├── dependabot.yml
│   └── workflows/
├── .tools/                     # bootstrap生成、gitignored
│   ├── bin/
│   ├── cache/
│   ├── playwright/
│   └── python/
├── Makefile
├── scripts/
│   └── bootstrap_dev.sh
├── backend/
│   ├── .python-version
│   ├── pyproject.toml
│   └── uv.lock
└── frontend/
    ├── .nvmrc
    ├── package.json
    └── package-lock.json
```

## 5. 導入状況とロードマップ

### Phase 0: 再現可能な入口

- [x] project-local bootstrapとchecksum検証
- [x] Python 3.12.13、uv 0.11.28、Node.js 24.18.0の統一
- [x] frozenなbackend/frontend依存同期
- [x] root `.env.example`とbackend設定検証
- [x] Makefileによる起動・品質・E2E・secret scan入口
- [x] Playwrightの開発者固有絶対パス除去
- [x] CodeQL/Gitleaks workflow
- [x] Docker関連の実行定義を削除し、host processへ統一

### Phase 1: 変更を安全にする品質ゲート

- [ ] frontend formatterと`.editorconfig`を導入する
- [ ] 軽量なpre-commit hookを導入する
- [ ] Alembic baseline migrationとupgrade検証を追加する
- [ ] 最小E2E smokeをCIへ追加する
- [ ] liveness/readinessの契約を定義する

### Phase 2: 運用可能性

- [ ] productionのhost、DB、静的配信、process supervisorをADRで決定する
- [ ] branch rulesetと必須checkを設定する
- [ ] backup/restore、migration、release演習を定期化する
- [ ] ActionsをSHA固定し、依存更新経路を自動化する

## 6. 非目標

- Docker、Docker Compose、Dev Container、Kubernetesを導入しない
- production基盤未決定の段階でクラウド固有構成や本番配布方式を仮定しない
- frontend TypeScript全面移行や大規模monorepo build systemを環境整備へ混在させない
- formatter、hook、task runnerを重複導入しない
- 本番DB確定前にSQLiteを廃止しない。ただし並行更新・SQL方言の検証限界を明示する

## 7. 受け入れ基準

- [x] READMEだけでclean cloneからbootstrap、起動、品質検査へ到達できる
- [x] toolchainと依存がproject-localかつ固定・検証される
- [x] `.env.example`に秘密値を含めず、production設定不足をfail closedにする
- [x] `make check`がCIの主要な非E2Eゲートを再現する
- [x] E2E設定に開発者固有の絶対パスがない
- [x] Docker関連の実行ファイル・標準手順がない
- [x] 対象WSLへChromium共有ライブラリを承認付きで導入し、E2E 4件を完走できる
- [ ] schema変更をversioned migrationで検証できる
- [ ] PRでE2E smokeを確認できる
- [ ] production基盤とrelease手順がADRで決定されている

## 8. 参考資料

- [uv: Working on projects](https://docs.astral.sh/uv/guides/projects/)
- [uv: Locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/)
- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Playwright: Browsers](https://playwright.dev/docs/browsers)
- [GitHub Actions: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
