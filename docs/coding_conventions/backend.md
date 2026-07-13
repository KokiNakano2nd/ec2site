# コーディング規約: バックエンド(Python / FastAPI / SQLAlchemy / Pydantic)

> このファイルは`backend/app`の実装済みコードの実態に基づいて記載する(`docs/README.md`の全体ルール「実装を優先し訂正した旨を明記する」に従う)。一般的なベストプラクティスと異なる箇所は本文中に注記する。

## 1. 命名・可読性

- 変数/関数: `snake_case`、クラス: `PascalCase`、モジュール定数: `UPPER_SNAKE_CASE`
- ファイル名は原則リソース名の複数形または機能名(例: `routers/products.py`, `routers/admin_orders.py`)
- ルーターファイルは「対象リソース」または「管理者操作対象」を表す名前にする。管理者専用ルーターは`admin_`プレフィックスを付ける(例: `admin_products.py`, `admin_coupons.py`)

## 2. 型ヒント

- 公開関数(ルーター関数、`services/`配下の関数、`auth.py`のユーティリティ等)の引数・戻り値には型ヒントを付ける
- Optional型は`Optional[X]`ではなく`X | None`(PEP 604)を使う。コレクション型は`List[int]`ではなく`list[int]`(PEP 585)を使う(既存コード全体がこのスタイルに統一済み)

## 3. コメント/Docstring

- 現状、このコードベースはdocstringをほぼ使っていない(自明な関数名・型ヒントで説明を代替する方針)。この方針を維持し、Google形式docstring等を新たに導入しない
- 例外的に、アルゴリズムが非自明な箇所(例: `services/order_calc.py`の金額計算ロジック、`rate_limit.py`の`check_rate_limit`)にはdocstring/コメントで計算根拠・制約事項を残す

## 4. アーキテクチャ・責務分離

現状の実装は「ルーター(`routers/*.py`)がリクエスト処理・DBクエリ・レスポンス組み立てを直接行う」2層構成(ルーター + `models.py`)。`services/`ディレクトリは、複数ルーターから再利用する複雑なロジック(注文の金額計算・注文操作)のみを切り出す場所として限定的に使う。

- 新しいエンドポイントも、まずルーター内に直接実装する。同じロジックが2箇所以上で必要になった場合のみ`services/`に切り出す(早すぎる抽象化を避ける)
- リクエスト/レスポンスの型は`schemas.py`のPydanticモデルに定義し、ルーター関数の`response_model`に指定する。DBモデル(`models.py`)をレスポンスに直接使わない
- DBセッションは`Depends(get_db)`で受け取る。新規に`yield`ベースの依存関数を追加する場合も、リソース解放(セッションクローズ)を`get_db`と同様にtry/finally相当で保証する
- I/Oバウンドな処理(DBアクセス、外部API呼び出し)は`def`のままで良い(SQLAlchemyの同期セッションを使っているため、`async def`にしても恩恵がない)。Stripe呼び出し等の外部同期ライブラリも同様

## 5. SQLAlchemyの書き方

- モデル定義は`Mapped`/`mapped_column`(SQLAlchemy 2.0系の型注釈スタイル)で統一する(2026-07-13、`Column(...)`ベースのレガシースタイルから全面移行済み)。`nullable`は`Mapped[X | None]`の型注釈から自動推論されるため、明示的に指定しない
- クエリは`select(Model).where(...)`を`db.execute(...)`に渡すスタイルで統一する。単一行取得は`.scalar_one_or_none()`、複数行は`.scalars().all()`を使う。主キー1件取得は`db.get(Model, id)`を使う(`select`より簡潔で意図が明確なため)
- レガシースタイルの`db.query(...)`は使わない(2026-07-13時点で全箇所を`select()`スタイルに移行済み)
- 一覧取得等でN+1クエリが問題になりうる箇所(`relationship`を辿るループ処理)は、必要に応じて`joinedload`等のeager loadingを検討する

## 6. Pydanticの書き方

- `BaseModel`を継承し、作成用(`XxxCreate`)・更新用(`XxxUpdate`、全フィールド`Optional`)・レスポンス用(`XxxOut`、`model_config = ConfigDict(from_attributes=True)`)を基本パターンとする(既存の`schemas.py`のパターンに合わせる)。ただし3種類全てを機械的に揃える必要はなく、更新系エンドポイントが存在しないリソースは`XxxUpdate`を省略してよい(既存の`Review`, `User`等がこのパターン)。逆に更新対象が一部フィールドのみの場合は、汎用`XxxUpdate`ではなく`OrderStatusUpdate`のような専用スキーマを設けてよい
- DBモデルの属性から生成するレスポンススキーマには`ConfigDict(from_attributes=True)`を明示する
- フィールドの必須/省略可はデフォルト値の有無で表現する(`str`なら必須、`str | None = None`なら省略可)。`Optional`と必須フラグの二重管理はしない

## 7. 例外処理・エラーハンドリング

- ビジネスロジックの検証エラーはルーター内で直接`HTTPException(status_code=..., detail="日本語メッセージ")`を送出する(独自例外クラス階層は導入しない。エンドポイント数の規模に対してオーバーエンジニアリングになるため)
- 権限チェックは`auth.get_current_user`/`auth.get_current_admin`の依存関数に集約し、各ルーターで重複したチェックコードを書かない

## 8. レート制限

- 乱用されうるエンドポイント(ログイン、ユーザー登録等)には`rate_limit.check_rate_limit(key, max_requests, window_seconds)`を使う(`routers/users.py`の既存パターンに合わせる)
- `check_rate_limit`はプロセス内メモリカウンタであり、複数プロセス/マルチワーカー構成では機能しない制約がある(NFR-022でスコープ許容済み)。新しいエンドポイントに適用する際もこの制約を踏まえる

## 9. 認証・パスワードまわり

- パスワードハッシュ化・検証は`auth.hash_password`/`auth.verify_password`(bcrypt直接呼び出し)経由でのみ行い、他の場所でbcryptを直接呼び出さない
- JWTの秘密鍵(`SECRET_KEY`)は環境変数から取得し、コードにデフォルト値を残す場合は開発用である旨をコード中に明記する(既存の`dev-secret-key-change-in-production`のパターン)

---

## 検討事項(要相談)

- **service/repository層の追加**: 一般的なベストプラクティスではDBアクセスをrepository層に、ビジネスロジックをservice層に分離することが推奨されるが、本プロジェクトの規模ではルーター直書きで十分回っている。今後ルーターが肥大化した場合の閾値(行数、複雑度)を決めるかどうかは検討の余地がある
