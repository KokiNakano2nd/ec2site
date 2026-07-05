# asyncio デバッグモード学習記録

## ステップ1：基本概念の理解

### デバッグモードが検出するもの
- **await し忘れたコルーチン**：コルーチンオブジェクトを作っただけで実行しないと、ガベージコレクト時に
  `coroutine 'xxx' was never awaited` という警告が出る。デバッグモードだと、どこで作られたかのトレースバックも表示される。
- **時間のかかりすぎるコールバック**：イベントループの1イテレーションが長時間（デフォルト閾値100ms）ブロックされると
  `Executing <Handle...> took X seconds` という警告が出る。同期的な重い処理（`time.sleep`など）を
  async関数内に書いてしまうミスを検出できる。
- **スレッドセーフでない呼び出し**：イベントループを所有していないスレッドから
  `loop.call_soon()` などループ操作系のAPIを呼ぶと `RuntimeError` になる（通常モードでは検出されない）。
- **クローズし忘れたリソース**：`ResourceWarning` として、閉じ忘れたトランスポート／ソケットなどを検出できる。

### なぜ通常は無効なのか
- 上記のチェックはすべて追加の処理（トレースバック取得、時間計測、スレッドチェック等）を伴うため、
  実行時オーバーヘッドが生じる。本番のホットパスで常時有効にすると、レイテンシ悪化・スループット低下の原因になる。

### 本番運用での判断
- デバッグモードは **開発環境・ローカル調査・CI上でのテスト時に限定して使うべき**。
- 本プロジェクトの `backend/Dockerfile` は `--reload` 付きでuvicornを起動しているが、これは開発用の設定であり、
  デバッグモードとは別物（`--reload`はコード変更検知の自動再起動機能）。デバッグモードを有効にする場合も
  同様に開発環境限定にすべきで、本番の起動コマンドには含めない。

**ステップ1完了条件チェック：**
- [x] デバッグモードが検出する項目を3つ以上挙げられる
- [x] なぜ通常は無効なのかを説明できる
- [x] 本番環境では使うべきでない、という判断ができる

## ステップ2：有効化方法を試す

検証コード: [`debug_mode_enable_demo.py`](./debug_mode_enable_demo.py)

### 方法1：環境変数 `PYTHONASYNCIODEBUG=1`
```
$ PYTHONASYNCIODEBUG=1 python3 debug_mode_enable_demo.py env
DEBUG:asyncio:Using selector: EpollSelector
DEBUG:asyncio:Close <_UnixSelectorEventLoop running=False closed=False debug=True>
asyncio debug mode is: True
```
→ `loop.get_debug()` が `True` になり、`asyncio`ロガーからDEBUGログが出るようになった。

### 方法2：`asyncio.run(coro, debug=True)`
```
$ python3 debug_mode_enable_demo.py run_debug_arg
DEBUG:asyncio:Using selector: EpollSelector
DEBUG:asyncio:Close <_UnixSelectorEventLoop running=False closed=False debug=True>
asyncio debug mode is: True
```
→ 環境変数なしでも、コード側の引数だけで有効化できることを確認。

### 方法3：`loop.set_debug(True)`
```
$ python3 debug_mode_enable_demo.py set_debug
DEBUG:asyncio:Using selector: EpollSelector
DEBUG:asyncio:Close <_UnixSelectorEventLoop running=False closed=False debug=True>
asyncio debug mode is: True
```
→ 自前でループを作成・管理するケース（`asyncio.run()`を使わない場合）でも同様に有効化できる。

### まとめ
3つの方法はいずれも最終的に `loop.set_debug(True)` 相当の状態になる。使い分けの目安：
- 環境変数：コードを変更せず外部からON/OFFしたい場合（本番コンテナで一時調査するときなど）
- `asyncio.run(debug=True)`：スクリプト内で恒常的にデバッグしたい場合
- `loop.set_debug(True)`：ループを手動管理している既存コードに組み込む場合

**ステップ2完了条件チェック：**
- [x] 3通りの有効化方法をそれぞれ動かし、`get_debug()`がTrueになることを確認した
- [x] 出力ログを本ファイルに記録した

## ステップ3：バグ入りサンプルで検証

検証コード: [`debug_mode_bugs_demo.py`](./debug_mode_bugs_demo.py)

仕込んだバグ：
1. `forgotten_coroutine()` を呼び出すだけで `await` しない（await忘れ）
2. `blocking_task()` の中で `time.sleep(0.3)` を使い、イベントループを同期的にブロックする

### OFF（通常モード）
```
$ python3 debug_mode_bugs_demo.py
debug_mode_bugs_demo.py:26: RuntimeWarning: coroutine 'forgotten_coroutine' was never awaited
  forgotten_coroutine()
RuntimeWarning: Enable tracemalloc to get the object allocation traceback
```
- await忘れの警告は出るが、**どこでそのコルーチンが作られたか（コールスタック）は分からない**。
- ブロッキング処理（`time.sleep(0.3)`）については**何の警告も出ない**。放置すると気づけないバグになる。

### ON（`PYTHONASYNCIODEBUG=1`）
```
$ PYTHONASYNCIODEBUG=1 python3 -W always debug_mode_bugs_demo.py
debug_mode_bugs_demo.py:26: RuntimeWarning: coroutine 'forgotten_coroutine' was never awaited
Coroutine created at (most recent call last)
  File ".../debug_mode_bugs_demo.py", line 37, in <module>
    asyncio.run(main())
  ...
  File ".../debug_mode_bugs_demo.py", line 26, in main
    forgotten_coroutine()
RuntimeWarning: Enable tracemalloc to get the object allocation traceback
Executing <Task finished name='Task-1' coro=<main() ...> took 0.316 seconds
```
- await忘れの警告に **コルーチンが生成された場所のフルトレースバック**が付くようになった。
- `blocking_task`による0.3秒のブロッキングが `took 0.316 seconds` として**検出された**（デフォルト閾値100msを超えたため）。

### 差分まとめ
| 項目 | OFF | ON |
|---|---|---|
| await忘れ警告 | 出る（発生箇所のみ） | 出る＋生成元トレースバック付き |
| ブロッキング処理の検出 | 出ない | 出る（実行時間とともに警告） |

**ステップ3完了条件チェック：**
- [x] OFF時とON時の出力差分を確認し、本ファイルに記録した

## ステップ4：このプロジェクトのFastAPI/uvicornで実践

手順：
1. `backend/app/main.py` に一時的な検証用エンドポイント `/debug/asyncio-study` を追加
   （中身はステップ3と同じ「await忘れ」＋「`time.sleep`によるブロッキング」）
2. `docker-compose.yml` の `backend.environment` に `PYTHONASYNCIODEBUG=1` を追加してコンテナ再作成
3. `curl http://localhost:8001/debug/asyncio-study` を叩き、`docker logs ec_site-backend-1` を確認
4. 確認後、追加したコード・環境変数を**すべて削除**して元の状態に復元

### OFF（通常のdocker-compose設定）
```
/code/app/main.py:90: RuntimeWarning: coroutine 'debug_asyncio_study.<locals>.forgotten_coroutine' was never awaited
  forgotten_coroutine()
RuntimeWarning: Enable tracemalloc to get the object allocation traceback
INFO:     ... "GET /debug/asyncio-study HTTP/1.1" 200 OK
```
- ローカルスクリプトと同様、await忘れの警告は出るがトレースバックはなく、ブロッキング処理は無検出。

### ON（`PYTHONASYNCIODEBUG=1`）
```
Executing <Task pending name='Task-1' coro=<Server.serve() ...>> took 2.525 seconds   ← 起動処理自体もデバッグモードのオーバーヘッドで検出された
/code/app/main.py:90: RuntimeWarning: coroutine 'debug_asyncio_study.<locals>.forgotten_coroutine' was never awaited
Coroutine created at (most recent call last)
  File ".../starlette/_exception_handler.py", line 51, in wrapped_app
  ...
  File "/code/app/main.py", line 90, in debug_asyncio_study
    forgotten_coroutine()
RuntimeWarning: Enable tracemalloc to get the object allocation traceback
INFO:     ... "GET /debug/asyncio-study HTTP/1.1" 200 OK
Executing <Task finished name='Task-3' coro=<RequestResponseCycle.run_asgi() ...>> took 0.313 seconds
```
- await忘れの警告に、**Starlette→FastAPI→自分のエンドポイント**までのフルコールスタックが付与された。
- リクエスト処理タスク自体が `took 0.313 seconds` として検出され、`time.sleep`によるブロッキングを本物のASGIサーバー上で確認できた。
- 副次的な発見：サーバー起動処理（`Server.serve()`）も2.5秒かかったとして検出された。デバッグモードのオーバーヘッドは
  リクエスト処理だけでなく、アプリ起動シーケンス全体にも影響する。

### なぜ本番のuvicornで常時有効にしないか
- 上記の通り、通常なら数十ms〜数百msで終わる処理にまで計測・トレースバック収集のコストが乗る。
  リクエストが多い本番環境ではこの積み重ねがスループット低下・レイテンシ増加に直結する。
- 加えて、ブロッキング検出の閾値（デフォルト100ms）超過が本番トラフィックで大量に出ると、
  ログが警告で埋もれて本当に重要な異常が埋もれるリスクもある。
- 結論：**開発環境で一時的に有効化し、原因究明後は必ず無効化する**運用が適切。

**ステップ4完了条件チェック：**
- [x] 実際のuvicorn+FastAPI環境で警告が検出できることを確認した
- [x] 本番非推奨の理由を具体的な計測結果とともに説明できる
- [x] 検証用コード・環境変数を元に戻した（`git diff`で痕跡なしを確認済み）

## ステップ5：実用チェックリスト（まとめ）

### いつ使うか
- [ ] 「非同期処理が遅い」「たまにレスポンスが極端に遅い」といった不可解な遅延を調査するとき
- [ ] `await`し忘れによるバグが疑われるとき（コルーチンを作ったのに実行されていない）
- [ ] コードレビューやCIで、新規に書いたasync関数が同期処理をブロックしていないか確認したいとき
- [ ] **本番環境では原則使わない**（オーバーヘッドが大きく、起動処理まで遅延する）

### 有効化方法（状況に応じて選ぶ）
- [ ] 外部からON/OFFしたいだけ・コード変更したくない → 環境変数 `PYTHONASYNCIODEBUG=1`
- [ ] スクリプト内で恒常的にデバッグ実行したい → `asyncio.run(main(), debug=True)`
- [ ] 既存コードがイベントループを手動管理している → `loop.set_debug(True)`
- [ ] 詳細ログも見たい場合は合わせて `logging.getLogger("asyncio").setLevel(logging.DEBUG)`

### 検出できるもの（見たら疑うポイント）
- [ ] `RuntimeWarning: coroutine 'xxx' was never awaited` → どこかで`await`し忘れている。
      デバッグモードONなら生成元のフルトレースバックが出るので、そこから追跡する。
- [ ] `Executing <Handle/Task ...> took X seconds` → イベントループを塞ぐ同期処理が紛れ込んでいる。
      `time.sleep`・同期I/O・重いCPU処理が典型的な原因。`asyncio.sleep`や`run_in_executor`への置き換えを検討。
- [ ] スレッドから直接loop操作をして`RuntimeError`になる → `loop.call_soon_threadsafe()`等に置き換える。
- [ ] `ResourceWarning`（クローズし忘れ） → `async with`などで確実にクローズする設計に直す。

### 運用上の注意
- [ ] 本番の起動コマンド（例：`backend/Dockerfile`の`uvicorn`起動）には**含めない**
- [ ] 調査用に一時的に有効化する場合も、確認後は必ず元の設定に戻す（`docker-compose.yml`の環境変数など）
- [ ] ブロッキング検出の閾値はデフォルト約100ms。必要なら `loop.slow_callback_duration` で調整可能

**ステップ5完了条件チェック：**
- [x] チェックリストを見るだけで、他プロジェクトでもデバッグモードを使い始められる状態になった
- [x] 全ステップ（1〜5）の学習記録が本ファイルに揃った
