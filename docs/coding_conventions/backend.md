# コーディング規約: バックエンド(Python / FastAPI / SQLAlchemy / Pydantic)

> このファイルは`docs/coding_conventions/common.md`の優先順位と分類に従う。既存実装は判断材料の一つであり、公式ドキュメントやセキュリティ標準と異なる箇所は移行対象として明記する。

## 1. 命名・可読性

- 変数/関数: `snake_case`、クラス: `PascalCase`、モジュール定数: `UPPER_SNAKE_CASE`
- ファイル名は原則リソース名の複数形または機能名(例: `routers/products.py`, `routers/admin_orders.py`)
- ルーターファイルは「対象リソース」または「管理者操作対象」を表す名前にする。管理者専用ルーターは`admin_`プレフィックスを付ける(例: `admin_products.py`, `admin_coupons.py`)

## 2. 型ヒント

- 公開関数(ルーター関数、`services/`配下の関数、`auth.py`のユーティリティ等)の引数と戻り値には型ヒントを付ける。戻り値を返さない関数は`-> None`を明示する
- Optional型は`Optional[X]`ではなく`X | None`(PEP 604)を使う。コレクション型は`List[int]`ではなく`list[int]`(PEP 585)を使う(既存コード全体がこのスタイルに統一済み)

**移行対象**: 既存のルーター関数には戻り値型がないものが多い。関連する関数を変更する際に型を追加し、新規関数では省略しない。

## 3. コメント/Docstring

- 現状、このコードベースはdocstringをほぼ使っていない(自明な関数名・型ヒントで説明を代替する方針)。この方針を維持し、Google形式docstring等を新たに導入しない
- 例外的に、アルゴリズムが非自明な箇所(例: `services/order_calc.py`の金額計算ロジック、`rate_limit.py`の`check_rate_limit`)にはdocstring/コメントで計算根拠・制約事項を残す

## 4. アーキテクチャ・責務分離

ルーターはHTTP境界(入力、認証・認可、ステータスコード、レスポンス)を担当する。単純なCRUDではDB操作をルーター内に置いてよいが、次のいずれかに該当する処理は`services/`への分離を検討する。

- 複数のDB更新を一つのトランザクションとして扱う
- 在庫、金額、注文状態等のビジネスルールを表す
- Stripeやメール等の外部サービスとDB更新を調整する
- HTTP以外の入口からも利用する可能性がある、または独立して単体テストする価値がある
- ルーター内で分岐や状態遷移が増え、HTTP処理と業務処理の区別が難しくなった

再利用回数やファイル行数だけを機械的な分離条件にしない。repository層は必須とせず、DBアクセスの重複、交換可能性、テスト容易性から導入効果が運用コストを上回る場合に採用する。

- リクエスト/レスポンスの型は`schemas.py`のPydanticモデルに定義し、ルーター関数の`response_model`に指定する。DBモデル(`models.py`)をレスポンスに直接使わない
- DBセッションは`Depends(get_db)`で受け取る。新規に`yield`ベースの依存関数を追加する場合も、リソース解放(セッションクローズ)を`get_db`と同様にtry/finally相当で保証する
- SQLAlchemyの同期セッションや同期Stripe SDK等、ブロッキングI/Oを呼ぶルーターは`def`で定義し、FastAPIのスレッドプール上で実行する。非同期ライブラリを採用した処理のみ`async def`と`await`を使い、`async def`内で同期I/Oを直接実行しない

## 5. SQLAlchemyの書き方

- モデル定義は`Mapped`/`mapped_column`(SQLAlchemy 2.0系の型注釈スタイル)で統一する。型注釈から明確に推論できる`nullable`は重複指定しない。DB上の意図が型から読み取れない制約は明示する
- クエリは`select(Model).where(...)`を`db.execute(...)`に渡すスタイルで統一する。単一行取得は`.scalar_one_or_none()`、複数行は`.scalars().all()`を使う。主キー1件取得は`db.get(Model, id)`を使う(`select`より簡潔で意図が明確なため)
- レガシースタイルの`db.query(...)`は使わない
- 一覧取得等で`relationship`を辿る場合は、発行されるSQLを確認してN+1を避ける。コレクションにはまず`selectinload`を検討し、`joinedload`を使う場合は行数増加と`Result.unique()`の必要性を確認する
- 無制限に増える一覧APIにはページネーションまたは取得上限を設ける。順序が結果に影響する取得では`order_by`を明示する

## 6. トランザクション・同時実行

- 一つのユースケースとして成功または失敗すべきDB更新は、一つのトランザクション境界に収める。途中で部分的に`commit()`しない
- トランザクション境界はルーターまたはユースケースを調整するserviceが管理し、下位の計算関数や個別DB操作関数が独自に`commit()`しない。ID採番等で途中結果が必要な場合は`flush()`を使う
- 例外時にrollbackされることを保証する。複数更新を伴う新規処理では`Session.begin()`等のコンテキスト管理を優先する
- 一意性は事前SELECTだけに依存せず、DBの`UNIQUE`等の制約で保証し、競合時の`IntegrityError`を安全なAPIエラーへ変換する
- 在庫減算、クーポン使用回数、注文・決済状態の変更では同時リクエストを前提にする。DBの条件付きUPDATE、ロック、楽観的同時実行制御、冪等性キー等から、使用DBと要件に合う方法を設計書で決める
- 外部API成功後にDB更新が失敗する等、単一DBトランザクションで原子性を保証できない処理は、再試行・補償処理・冪等性を設計し、失敗経路をテストする

**移行対象**: 一部のservice関数が内部で`commit()`している。呼び出し元を含むユースケース全体のトランザクション境界を確認し、下位関数は`flush()`まで、commit/rollbackは調整層の責務となるよう段階的に整理する。

## 7. Pydanticの書き方

- `BaseModel`を継承し、用途が異なる入力と出力に同じスキーマを流用しない。作成用(`XxxCreate`)・更新用(`XxxUpdate`)・レスポンス用(`XxxOut`)は、実在する操作に必要なものだけを定義する
- PATCH用スキーマでは「省略可能」と「`null`を許容する」を区別する。フィールドを省略可能にするためだけに、業務上`null`を許さない属性まで無条件にnullableにしない。更新時は`model_dump(exclude_unset=True)`等で送信されたフィールドだけを扱う
- 更新対象が限定される場合は、汎用`XxxUpdate`ではなく`OrderStatusUpdate`のように操作の意図を表す専用スキーマを使う
- DBモデルの属性から生成するレスポンススキーマには`ConfigDict(from_attributes=True)`を明示する
- フィールドの必須/省略可は型とデフォルト値で正確に表現する。文字列長、数値範囲、形式等、API境界で判断できる制約は`Field`や専用型で検証し、ルーター内に同じ検証を重複させない

## 8. 例外処理・エラーハンドリング

- ルーター内で完結する単純な入力・存在確認は`HTTPException`へ変換してよい。serviceへ分離した業務処理はFastAPIへ依存させず、必要最小限のドメイン例外または結果型で失敗を表し、ルーターがHTTPステータスとメッセージへ変換する。網羅的な独自例外クラス階層は作らない
- 権限チェックは`auth.get_current_user`/`auth.get_current_admin`の依存関数に集約し、各ルーターで重複したチェックコードを書かない
- HTTPステータスコードとエラーレスポンス形式を既存API仕様と統一する。認証・認可では、攻撃者に対象データの存在や認証情報のどの部分が誤っているかを不要に開示しない
- 捕捉する例外は回復方法が定義できるものに限定する。広い`except Exception`を使う場合は、ログ記録、rollback、外部向けエラーへの変換を行い、原因を黙って破棄しない

## 9. レート制限

- 乱用されうるエンドポイント(ログイン、ユーザー登録、パスワードリセット、確認メール再送等)には`rate_limit.check_rate_limit(key, max_requests, window_seconds)`を使う
- `check_rate_limit`はプロセス内メモリカウンタであり、複数プロセス/マルチワーカー構成では機能しない制約がある(NFR-022でスコープ許容済み)。新しいエンドポイントに適用する際もこの制約を踏まえる

**移行条件**: マルチワーカー化、複数インスタンス化、本番公開のいずれかを行う前に、共有ストレージを使うレート制限へ移行する。

## 10. 認証・パスワード

- 新規のパスワードハッシュには`argon2-cffi`の高レベル`PasswordHasher`を使い、Argon2idで保存する。独自にsaltを生成・指定せず、アプリケーションコードのパスワードハッシュ化・検証・再ハッシュ判定は`auth.hash_password`/`auth.verify_password`/`auth.password_needs_rehash`経由でのみ行う。移行互換性を再現するテストコードはこの限りではない
- bcryptは移行前に保存されたハッシュの検証専用とし、新しいbcryptハッシュを作成しない。bcryptハッシュでログインに成功した場合は、同じリクエスト内でArgon2idへ再ハッシュして保存する
- Argon2idハッシュでも`PasswordHasher.check_needs_rehash()`をログイン成功後に確認し、ライブラリ既定パラメータの変更時に段階的に再ハッシュする
- Argon2のパラメータはライブラリのRFC 9106 Low Memory既定値を基準とする。独自変更する場合は本番相当環境で性能とメモリ使用量を測定し、根拠を記録する
- 最小長・最大長等のパスワード要件は要求定義と全認証APIで統一する。入力を黙って切り詰めず、検証ライブラリの例外を500エラーとして露出させない
- JWTには有効期限を必須とし、受理する署名アルゴリズムを明示的に限定する。秘密鍵をログやレスポンスへ出力しない
- 本番環境では`SECRET_KEY`未設定時に起動を失敗させる。安全でない固定デフォルトへのフォールバックは移行対象とする

## 11. 日時

- 内部の時点はtimezone-awareなUTCで扱い、新規コードでは`datetime.utcnow()`を使わず`datetime.now(UTC)`を使う
- DBカラム、Pydanticスキーマ、比較対象のaware/naiveを混在させない。外部へ返す日時はタイムゾーンを含むISO 8601形式とする
- 利用者向けの現地時刻への変換は表示境界で行い、DBにローカル時刻を保存しない

**移行対象**: 現在のモデルと認証・分析処理には`datetime.utcnow()`およびnaive datetimeが残っている。DBデータとの互換性を確認したうえで一括移行する。

---

## 12. 主な根拠資料

- [FastAPI: Concurrency and async / await](https://fastapi.tiangolo.com/async/)
- [SQLAlchemy 2.0: ORM Querying Guide](https://docs.sqlalchemy.org/en/20/orm/queryguide/)
- [SQLAlchemy 2.0: Transactions and Connection Management](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html)
- [Pydantic: Fields](https://docs.pydantic.dev/latest/concepts/fields/)
- [Python 3.12: datetime](https://docs.python.org/3.12/library/datetime.html)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [argon2-cffi: PasswordHasher API](https://argon2-cffi.readthedocs.io/en/stable/api.html#argon2.PasswordHasher)
