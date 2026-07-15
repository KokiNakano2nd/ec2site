# コーディング規約: テスト(pytest / Vitest / Playwright)

> このファイルは`docs/coding_conventions/common.md`の優先順位と分類に従う。テスト数やカバレッジ率そのものではなく、重要な振る舞いに対する再現可能な保証を目的とする。

## 1. テストレベルと責務

- backendのAPIテストは、FastAPIの入口からDB操作までを通す結合テストを基本とし、認証・バリデーション・HTTP契約・永続化結果を確認する
- 金額計算、状態遷移等の入力と出力が明確なロジックは、APIテストに加えて高速な単体テストを設ける
- frontendのコンポーネントテストは、利用者から見える表示と操作、およびAPI層との契約を確認する
- Playwright E2Eテストは、ログイン、購入、管理操作等、複数画面とbackendをまたぐ主要導線を実ブラウザで確認する。単体・コンポーネントテストで十分な細部をE2Eへ重複させない
- 同じ振る舞いを複数レベルで検証する場合は、各テストが守る境界を明確にする

## 2. 命名・配置

- backend: ファイルは`test_<対象領域>.py`、テスト関数は`test_<操作>_<期待結果>`を基本とし、名前だけで条件と期待する振る舞いが判別できるようにする(例: `test_login_wrong_password_returns_401`)
- frontend: ファイルは`<対象コンポーネント>.test.jsx`とし、テスト対象と同じディレクトリに置く
- E2E: `frontend/e2e/`へ機能または利用者導線単位の`*.spec.js`を置く
- 不具合の回帰テストには、修正内容ではなく再現条件と期待結果がわかる名前を付ける

## 3. テスト構造

- AAA(Arrange-Act-Assert)を基本構造とし、準備・実行・検証の境界を読み取れるようにする。短いテストへ機械的なAAAコメントは付けない
- 1テストでは一つの振る舞いまたはシナリオを検証する。「assertを一つだけ」に限定せず、その振る舞いを保証するために必要な複数の結果をまとめて確認してよい
- 複数の入力に同じ規則を適用するテストは、重複したテスト関数を増やす前に`pytest.mark.parametrize`や`it.each`等のパラメータ化を検討する
- テスト内に複雑な分岐や本番ロジックの再実装を持ち込まない。期待値を本番と同じ関数で計算して、同じ不具合を共有しない

## 4. フィクスチャ・モック

- 複数ファイルで共有するbackendフィクスチャは`conftest.py`に置く。単一ファイルだけで使うフィクスチャやヘルパーは利用箇所の近くに置き、`conftest.py`を無関係な準備処理の集積場所にしない
- DBを使うテストは各テストで既知の初期状態から開始し、テスト終了後に状態を残さない。現在は`_reset_db` autouse fixtureで実現している
- Stripe、メール送信等の管理外サービスは境界でモックし、成功・拒否・タイムアウト・例外を必要に応じて再現する。アプリ内部のルーターやDB操作を安易にモックしない
- frontendのコンポーネントテストでは`api/`層をモックし、HTTPの詳細ではなくコンポーネントの表示・操作を検証する。`api/`層自体の変換やエラー処理は別のテスト対象とする
- 時刻、乱数、環境変数、ネットワーク等、結果を不安定にする外部要因はテスト境界で固定する。固定後は必ず元の状態へ戻す
- 呼び出し回数や内部関数名の検証は、それ自体が外部契約である場合に限定する。最終的な状態や利用者に見える結果を優先する

## 5. frontendテストの操作と検索

- Testing Libraryでは利用者と支援技術に近い検索を優先する。原則として`getByRole` + accessible name、フォームでは`getByLabelText`を先に検討し、`getByTestId`は意味のある方法で取得できない場合に限定する
- 要素が非同期に現れる場合は`findBy...`、状態が非同期に変わる複数条件には`waitFor`を使う。任意時間のsleepで待たない
- ユーザー操作は原則として`userEvent.setup()`から得たインスタンスを使い、クリック、入力、キーボード操作を`await`する。`fireEvent`は`userEvent`で表現できない低レベルイベントに限定する
- コンポーネントのstate、内部関数、子コンポーネントの実装詳細ではなく、画面に表示される内容、accessible name、操作後の結果を検証する
- snapshotは大きなDOM全体の無批判な記録に使わない。差分を人が判断でき、構造自体が契約である小さな出力に限定する

## 6. 独立性・決定性

- 各テストは実行順序に依存せず、単独実行、全件実行、順序変更のいずれでも同じ結果になるようにする
- モジュールレベルの可変状態、モック、fake timer、環境変数をテスト間で共有しない。各テストまたはfixtureのteardownで復元する
- 実ネットワーク、現在時刻、実行速度、ローカルマシン固有のパスへ依存しない
- 不安定なテストを単にretryやskipで隠さない。原因を調査し、一時的に隔離する場合は理由と解消条件を残す

## 7. 正常系・異常系・境界値

- 新機能では代表的な正常系に加え、入力境界、バリデーションエラー、未認証、権限不足、対象なし、競合、外部サービス失敗をリスクに応じて確認する
- 決済、注文、在庫、クーポン、認証・認可は優先的にテスト密度を高め、重複送信、同時更新、途中失敗後のDB状態も検証する
- 不具合修正では、修正前に失敗する最小の回帰テストを追加してから修正することを原則とする
- HTTPステータスだけでなく、必要に応じてレスポンス契約、DBの永続状態、外部サービス呼び出しの有無を確認する

## 8. カバレッジと品質ゲート

- backendのカバレッジゲートは`backend/pytest.ini`の`--cov-fail-under=70`で管理する。70%は最低基準であり、目標値ではない
- frontendのカバレッジゲートは`frontend/vite.config.js`でstatement 65%、branch 55%、function 55%、line 70%に設定している。閾値は一か所で管理し、本規約へ数値を重複させる場合は設定変更時に同時更新する
- カバレッジ対象からファイルを除外する場合は、「テストしにくい」ではなく、生成コード、薄い起動処理、別レベルで保証済み等の具体的理由を設定コメントへ残す
- カバレッジは未検証領域を探す指標として使い、100%達成のためだけのアサーションのないテスト、実装をなぞるテスト、価値の低いsnapshotを追加しない
- CIではbackendのruff・pytest・pip-audit、frontendのESLint・Vitest coverage・buildを必須の品質ゲートとする。ローカルで関連チェックを通してからpushする

**移行対象**: frontendでは`api/`、`AuthContext.jsx`、`MainView.jsx`、`App.jsx`等がカバレッジ対象外である。除外理由を再評価し、認証・ルーティング・APIエラー処理の重要な振る舞いはテストまたはE2Eで保証する。

Playwright E2Eは、PR CIでChromiumの`@smoke` subsetを実行し、手元の`make e2e`で全件を実行する。失敗時のtrace・screenshot・HTML reportはCI artifactとして短期間保存する。クロスブラウザや全件の定期CIは[CI/CD・DevSecOps ToBe設計](../deliverables/architecture/05_cicd_devsecops_tobe.md)のPhase 2で扱う。

## 9. 主な根拠資料

- [pytest: Good Integration Practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html)
- [pytest: Parametrizing tests](https://docs.pytest.org/en/stable/how-to/parametrize.html)
- [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [Testing Library: About Queries](https://testing-library.com/docs/queries/about/)
- [Testing Library: user-event Introduction](https://testing-library.com/docs/user-event/intro/)
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)
