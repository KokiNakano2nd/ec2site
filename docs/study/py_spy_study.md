# py-spy 学習記録

## ステップ1：基本概念の理解

### py-spyとは何か
- Rustで書かれた**サンプリング型プロファイラ**。対象のPythonプロセスの外側から、一定間隔（デフォルト約100Hz）で
  「今どの関数のどの行を実行中か」というコールスタックをスナップショットし続けることで、どこに時間が使われているかを
  統計的に可視化するツール。
- 対象プロセスに対して`pip install`や事前の計装（instrumentation）は一切不要。動いている本番プロセスに
  **後からアタッチして観測できる**のが最大の特徴。

### なぜコードを一切変更せずに観測できるのか
- 通常、Pythonの内部状態（インタプリタが今実行中のフレーム）を覗くには、対象プロセス自身に協力してもらう
  （シグナルハンドラを仕込む・`faulthandler`のように自分で書き出す、など）必要があるのが一般的。
- py-spyはOSの機能（Linuxでは`process_vm_readv`、必要に応じて`ptrace`）を使って、**対象プロセスのメモリを外部から
  直接読み取り**、CPythonのインタプリタが保持するフレームスタックの構造体を独自に解析して復元している。
  対象プロセス側は自分が覗かれていることに気づかず、何のコード変更も要らない。

### なぜ「本番でも比較的安全」と言われるのか
- **サンプリングであり常時計装ではない**：一定間隔でスナップショットを取るだけなので、
  asyncio debug modeのように全呼び出しにトレースバック収集やタイマー計測のコストを乗せるわけではない。
  観測頻度を絞れば対象プロセスへの負荷は小さい。
- **読み取り専用**：対象プロセスのメモリを読むだけで、書き換えたりコードを注入したりはしない
  （`py-spy dump`のデフォルト動作。ただし`--native`や`--force`などオプション次第で挙動が変わる点は要注意）。
- とはいえ「安全」は絶対ではなく、対象プロセスを一瞬停止させる（stop-the-world）実装のため、
  頻繁に叩きすぎるとレイテンシに影響し得る。この点はステップ4で実測して確認する。

### 権限まわりの注意（先取りメモ、ステップ4で実践）
- `ptrace`によるメモリ読み取りは通常のプロセスに対しては制限されている場合が多く、
  Linuxでは`/proc/sys/kernel/yama/ptrace_scope`の設定や、`CAP_SYS_PTRACE`権限が必要になることがある。
- Dockerコンテナ内のプロセスに対して使う場合は、コンテナ起動時に`--cap-add SYS_PTRACE`
  （または`--privileged`）を付けないと権限エラーになることが多い。

### asyncio debug modeとの対比
| | asyncio debug mode | py-spy |
|---|---|---|
| 観測方法 | プロセス内部からの計装（自己申告） | プロセス外部からのメモリ読み取り（覗き見） |
| コード変更 | 環境変数/引数で有効化のみだが、Pythonプロセス自身の動作が変わる | 対象プロセスは一切変更不要、無停止で後からアタッチ可能 |
| 検出対象 | await忘れ・ブロッキング呼び出し・スレッド安全性違反など「asyncio特有のバグ」 | 関数ごとのCPU使用時間の内訳（どこが重いか）全般 |
| オーバーヘッド | 常時有効だと大きい（トレースバック収集・タイマー計測） | サンプリング頻度に依存、瞬間的なdumpなら小さい |

**ステップ1完了条件チェック：**
- [x] py-spyが「サンプリング型プロファイラ」であり、コード変更なしに動作中プロセスを観測できることを説明できる
- [x] なぜ本番でも比較的安全とされるか（サンプリング・読み取り専用）を説明できる
- [x] Dockerコンテナに対して使う際に必要な権限（`SYS_PTRACE`）を把握した

## ステップ2：基本コマンドを試す

準備：ローカルに検証用の仮想環境を作り、そこにpy-spyをインストールした
（このマシンのPythonは`pip install`不可のexternally-managed環境だったため）。
```
python3 -m venv docs/study/.venv-pyspy
docs/study/.venv-pyspy/bin/pip install py-spy
```

観測対象: [`py_spy_target_demo.py`](./py_spy_target_demo.py)（CPUを使い切る`fib(30)`の再帰計算と、
`time.sleep(1)`で1秒待つだけの`io_wait()`を交互に呼び続けるだけのスクリプト）。

### つまずいた点：`-p <pid>`でのアタッチが権限エラーになった
別ターミナル（実際にはbashのバックグラウンドジョブ）で対象スクリプトを起動し、
そのPIDに対して`py-spy dump -p <pid>`を実行したところ、以下のエラーになった。
```
Permission Denied: Try running again with elevated permissions by going 'sudo env "PATH=$PATH" !!'
```
原因を調査したところ、`/proc/sys/kernel/yama/ptrace_scope`が`1`（制限モード）になっており、
この設定では**「あるプロセスは自分の子孫プロセスにしかptraceできない」**という制限がかかっていた。
bashから`&`でバックグラウンド起動した対象プロセスは、py-spyから見ると赤の他人（祖先子孫関係にない）
なので弾かれる。この環境ではsudoも非対話的には使えなかったため、`-p`でのアタッチは断念し、
`record`/`top`が対応している**「py-spy自身に対象プログラムを起動させる」方式**
（`py-spy record -- python target.py`のようにコマンドを直接渡す）に切り替えた。
この方式ならpy-spyが対象プロセスの**親**になるため、ptrace_scope=1でも制限に引っかからない。
→ 本番のDockerコンテナのように「既に動いているプロセスに後から`-p`でアタッチしたい」場合は、
　`--cap-add SYS_PTRACE`に加えて、コンテナ内の`ptrace_scope`設定次第では追加の緩和が必要になる
　ケースがある、という実践的な学びになった（ステップ4で改めて確認する）。

### `py-spy record`：flamegraphを生成する
```
$ py-spy record -o py_spy_record_demo.svg -d 5 -- python py_spy_target_demo.py
py-spy> Sampling process 100 times a second for 5 seconds. Press Control-C to exit.
py-spy> Wrote flamegraph data to 'py_spy_record_demo.svg'. Samples: 66 Errors: 0
```
生成された [`py_spy_record_demo.svg`](./py_spy_record_demo.svg) をブラウザで開くと、
横幅が「その関数にどれだけサンプルが割り当てられたか（＝CPU時間の割合）」を表す
flamegraphが表示される。`fib`が積み上げの大部分を占め、`io_wait`（`time.sleep`）はほぼ幅を持たない
（sleep中はCPUを使っていないので、サンプリング型のpy-spyからはほぼ見えなくなる）。

### `py-spy top`：htop風にリアルタイムでCPU使用の内訳を見る
`top`はcurses UIで常に画面を更新し続けるインタラクティブなコマンドのため、
`script`コマンドで擬似端末ごと出力をキャプチャした。実行4秒分のスナップショット推移：
```
Total Samples 1     → fib: (まだ計測なし。importlibの初期化中)
Total Samples 10    → fib 88.89% / importlib系
Total Samples 100   → fib 5.56%, io_wait 1.11%  （GIL: 5.56%＝ほとんどの時間sleep待ち）
Total Samples 200   → fib 0.00%, io_wait 1.00%  （GIL: 0.00%＝完全にsleep中）
Total Samples 300   → fib 12.00%, io_wait 4.00% （GIL: 12.00%＝fibの実行区間に入った）
```
- **`GIL`列（GILを保持している割合）が、まさにCPUを使っている瞬間の割合と一致する**。
  `fib`実行中はGIL保持率が上がり、`io_wait`（`time.sleep`）中はGIL保持率がほぼ0%になる。
  → py-spyは「CPUを使っている時間」を見るツールであり、「`sleep`や実際のI/O待ちで
  レスポンスが遅い」というケースは、`top`上では逆に「何も引っかからない（GILが低い）」
  という見え方になる、という重要な性質を実地で確認できた。

### `py-spy dump`：一瞬のスナップショットを取る
`-p <pid>`によるアタッチは上記の理由で本環境では権限エラーになったため、
コマンドの意味と使いどころを整理するに留めた：
- `dump`は`record`/`top`と違い、**プログラムを自分で起動する機能を持たない**
  （`-p`で既存プロセスにアタッチする用途専用）。
- 用途は「今まさに固まっている/遅いプロセスに対して、一度だけスタックを見たい」場合。
  `record`のように継続サンプリングしないため、対象プロセスへの影響が最小。
- 本番のDockerコンテナ（既に起動済みのuvicornプロセス）に対して使うのは、まさにこの`dump`
  のユースケースなので、ステップ4で権限周りを含めて改めて検証する。

**ステップ2完了条件チェック：**
- [x] `record`でflamegraphを生成し、CPU重い処理とsleep処理の違いを視覚的に確認した
- [x] `top`でリアルタイムのCPU内訳（GIL保持率）を確認し、sleep中は検出されないことを確認した
- [x] `dump`は既存プロセスへの`-p`アタッチ専用であり、権限（ptrace_scope）に依存することを理解した

## ステップ3：バグ入りサンプルで検証

検証コード: [`py_spy_bugs_demo.py`](./py_spy_bugs_demo.py)

仕込んだバグ：「CPUバウンドな処理をスレッド分割すれば速くなるはず」という誤解。
CPythonにはGIL（Global Interpreter Lock）があり、**CPUバウンドな処理はスレッドを増やしても
並列実行されない**（同時にバイトコードを実行できるのは1スレッドだけ）。
体感では分かりにくいこのバグを、py-spyでどう見抜けるか確認する。

### 実測：スレッド数を増やしても速くならない（むしろ遅くなる）
```
$ python py_spy_bugs_demo.py 1
threads=1 elapsed=0.32s
$ python py_spy_bugs_demo.py 2
threads=2 elapsed=0.59s
$ python py_spy_bugs_demo.py 4
threads=4 elapsed=1.09s
```
スレッド数を1→2→4に増やしても、処理時間はほぼ「合計の仕事量」に比例して増えているだけで、
並列化による短縮は一切起きていない（4スレッド分の`fib(31)`を捌くのに、単純計算で1スレッドの
約4倍=1.28秒程度かかるはずのところ、実測1.09秒と概ね一致）。

### `py-spy top -i`（idle含む）で見えたもの
```
Total Samples 10
GIL: 88.89%, Active: 111.11%, Threads: 5
  %Own  %Total  OwnTime  TotalTime  Function (filename)
222.22% 222.22%   0.200s    0.200s   fib (py_spy_bugs_demo.py)
100.00% 100.00%   0.090s    0.090s   wait (threading.py)
...

Total Samples 100
GIL: 96.67%, Active: 114.44%, Threads: 5
  %Own  %Total  OwnTime  TotalTime  Function (filename)
400.00% 400.00%    3.80s     3.80s   fib (py_spy_bugs_demo.py)
 97.78%  97.78%   0.880s    0.880s   _wait_for_tstate_lock (threading.py)
```
一見、`fib`の`%Own`が**400%**もあり「4スレッドが同時にCPUを使っている」ように見える。
しかし`GIL`の値は**96.67%（≒100%を超えない）**のままで、これは「常にどこか1スレッドだけが
GILを握っている」ことを意味する。矛盾しているように見えるが、からくりはこうだった：

- py-spyの`%Own`は**各スレッドが最後に実行していたフレーム**を毎回サンプリングして合算する。
- GILを一時的に手放して待たされている3スレッドも、Pythonバイトコードのフレームとしては
  「`fib`の途中で止まっている」ままなので、`fib`にサンプルが積み上がってしまう。
- つまり`%Own`が400%でも、**実際にCPUで動いているのはそのうち1スレッド分（GIL:96.67%）だけ**。
  残りは「`fib`の途中で順番待ちしているだけ」で、見た目のパーセンテージに騙されると
  「並列に速く処理できている」と誤解しかねない。

→ **教訓**：py-spyの`top`で複数スレッドの合計%だけを見て「並列化できている」と判断するのは危険。
  必ず`GIL`列（実際にCPUを使っている割合、理論上100%が上限）と合わせて確認する必要がある。
  この用途でCPUバウンド処理を本当に並列化したい場合は、スレッドではなく`multiprocessing`や
  `ProcessPoolExecutor`など**別プロセス化**が必要（GILはプロセスごとに独立しているため）。

**ステップ3完了条件チェック：**
- [x] 「スレッドを増やしても速くならない」CPUバウンドのバグを実測タイムで確認した
- [x] py-spyの`top`出力だけでは誤解しうる点（%Ownの合算 vs GIL占有率）を発見し記録した
- [x] 修正の方向性（`multiprocessing`によるプロセス分割）を導き出せた

## ステップ4：このプロジェクトのFastAPI/uvicornで実践

手順：
1. `backend/app/main.py` に一時的な検証用エンドポイント `/debug/py-spy-study`（`fib(32)`を計算するだけの重い処理）を追加
2. `docker-compose.yml` の `backend` サービスに `cap_add: [SYS_PTRACE]` を追加してコンテナ再作成
3. `docker exec`でコンテナ内に`pip install py-spy`（コンテナ再作成のたびに消える一時的なインストール）
4. コンテナ内のuvicornワーカープロセスに対して`py-spy dump`/`record`でアタッチして観測
5. 確認後、追加したコード・`cap_add`設定をすべて削除して元の状態に復元

### 権限まわり：`SYS_PTRACE`なしでは`dump`が失敗する
まず`cap_add`を付けない状態で試したところ、ステップ2で学んだ通りの権限エラーになった。
```
$ docker exec ec_site-backend-1 py-spy dump -p 8
Error: Failed to copy Py_Version symbol
Caused by:
    0: Permission denied (os error 13)
```
コンテナ内でも`/proc/sys/kernel/yama/ptrace_scope`は`1`（ホストと共有される設定）だったが、
それ以前に**コンテナのデフォルトcapability一覧にはそもそも`CAP_SYS_PTRACE`が含まれていない**ため、
同じコンテナ内の同じユーザー(root)であってもptraceによるプロセス読み取りが拒否される。
`docker-compose.yml`に`cap_add: [SYS_PTRACE]`を追加してコンテナを再作成したところ、
同じ`py-spy dump -p <pid>`が成功するようになった。
→ 本番でpy-spyを使う運用を考えるなら、平常時は権限を絞ったまま起動しておき、
  障害調査が必要になったタイミングだけ`cap_add`を付けて再起動する、といった運用が現実的。
  常時`SYS_PTRACE`を付けたまま本番稼働させるのは、攻撃者に侵入された場合に他プロセスの
  メモリを覗かれるリスクを広げることになるため避けるべき。

### `dump`で見えた意外な発見：syncなエンドポイントは別スレッドで動いていた
`fib(32)`を実行中に`py-spy dump`でアタッチしたところ、次のようなスタックが取れた。
```
Thread 44 (idle): "MainThread"
    run (asyncio/runners.py:118)
    ...
Thread 45 (active+gil): "AnyIO worker thread"
    fib (app/main.py:87)
    fib (app/main.py:87)
    ... (再帰で積み上がっている)
    debug_py_spy_study (app/main.py:89)
    run (anyio/_backends/_asyncio.py:1029)
    _bootstrap_inner (threading.py:1075)
```
検証用エンドポイントを`async def`ではなく普通の`def`（同期関数）として書いたところ、
**FastAPI（Starlette）が自動的にスレッドプール（AnyIO worker thread）へオフロードして実行していた**。
そのため「メインスレッド（asyncioイベントループ）」自体は終始`idle`のままで、重い処理をしていても
イベントループ自体は塞がれていなかった。実際に、この重い処理を実行している最中に並行して
`/products`を3回叩いてみたところ、レスポンスタイムに悪影響は出なかった。
```
products request 1: 200 time=0.082680s
products request 2: 200 time=0.095262s
heavy endpoint:      200 time=0.395600s   ← fib(32)の処理
products request 3: 200 time=0.099305s
```
これはステップ4（asyncio debug mode学習時）で確認した「`async def`の中に`time.sleep`を書くと
イベントループ全体が本当にブロックされる」ケースとは対照的。**FastAPIでは同期`def`のエンドポイントは
自動的にスレッドプール実行になるため、CPUバウンドな重い処理を書いても他のリクエストの応答性は
（GIL契約の範囲内で）保たれやすい**、という実践的な違いを実測で確認できた。
（ただし今回はCPUバウンドな処理なので、GIL自体は奪い合う。並行数を増やせばいずれ全体のスループットは
低下する点はステップ3の学びの通り。）

### `record`でflamegraphを取得
```
$ docker exec ec_site-backend-1 py-spy record -o /tmp/py_spy_docker_record.svg -p 44 -d 3
py-spy> Wrote flamegraph data to '/tmp/py_spy_docker_record.svg'. Samples: 174 Errors: 0
```
生成した [`py_spy_docker_record.svg`](./py_spy_docker_record.svg) でも、`fib`が
`AnyIO worker thread`配下に積み上がっている様子を視覚的に確認できた。

**ステップ4完了条件チェック：**
- [x] Dockerコンテナ内の実プロセスに対して`SYS_PTRACE`権限の有無による挙動差を確認した
- [x] 実際のFastAPI/uvicorn環境で、同期エンドポイントがスレッドプールにオフロードされる挙動を発見した
- [x] 検証用コード・`cap_add`設定を元に戻した（`grep`で痕跡なしを確認済み、`/debug/py-spy-study`は404、`/products`は200）

## ステップ5：実用チェックリスト（まとめ）

### いつ使うか
- [ ] 本番/ステージング環境で「特定のリクエストだけ遅い」「CPU使用率が高止まりしている」といった、
      再現手順が明確でない性能問題を、**コードを一切変更せず**その場で調査したいとき
- [ ] 「スレッドを増やしたのに速くならない」など、GIL絡みの体感しにくい性能バグを疑うとき
- [ ] 一度きりのスナップショットで十分なら`dump`、傾向を継続的に見たいなら`top`、
      あとで人と共有・分析したいなら`record`のflamegraphを選ぶ
- [ ] 常時有効にしておく類のツールではない。**必要なときだけ、期間を区切ってアタッチする**

### 使うコマンドの選び方
- [ ] 「今すぐ1回だけスタックを見たい（固まっている/一瞬遅い）」→ `py-spy dump -p <pid>`
- [ ] 「htopのように継続的にCPU内訳を見ながら原因を絞り込みたい」→ `py-spy top -p <pid>`
      （`-i`でidleスレッドも含める、`-g`でGIL保持中のみに絞る）
- [ ] 「あとで見返せる形（flamegraph/speedscope）で残したい」→ `py-spy record -o out.svg -p <pid> -d <秒数>`
- [ ] 自分でプロセスを起動できる状況（ローカル検証など）なら、`-p`でのアタッチの代わりに
      `py-spy record -- python script.py`のように**py-spy自身に起動させる**方式も使える
      （ptrace_scope制限で既存プロセスへのアタッチが権限エラーになる場合の回避策にもなる）

### 権限まわりの注意（本番で最もハマりやすいポイント）
- [ ] `-p <pid>`で既存プロセスにアタッチするには、ホスト/コンテナの`ptrace`権限が必要
      （`/proc/sys/kernel/yama/ptrace_scope`が`1`だと祖先子孫関係にないプロセスは弾かれる）
- [ ] Dockerコンテナに対して使う場合は、コンテナ起動時に`--cap-add SYS_PTRACE`
      （`docker-compose.yml`なら`cap_add: [SYS_PTRACE]`）が必要になることが多い
- [ ] `SYS_PTRACE`は他プロセスのメモリを読む強い権限。**常時本番コンテナに付与し続けるのではなく、
      調査が必要なときだけ付与して再起動し、終わったら外す**運用が望ましい
- [ ] Kubernetes環境では`securityContext.capabilities.add: ["SYS_PTRACE"]`や、
      Pod間で`shareProcessNamespace: true`にしてsidecarから覗く、といった構成が必要になる場合がある
      （本プロジェクトでは未検証。実際に使う際は別途調査すること）

### 見えたものの解釈で気をつけること
- [ ] `top`の`%Own`/`%Total`は**スレッドごとの合算**であり、100%を超えることがある。
      実際に同時にCPUを使えているかは`GIL`列（理論上100%が上限）と合わせて必ず確認する
      （ステップ3で発見した「%Own 400%だがGILは100%を超えない」の罠）
- [ ] `time.sleep`のようなI/O待ち中の関数は、GIL保持率がほぼ0%になり**py-spy上では
      ほとんど見えなくなる**。「py-spyで何も引っかからない＝問題ない」ではなく、
      「py-spyで引っかからないなら、遅さの原因はCPU以外（I/O待ち・ロック待ち・DBなど）」と解釈する
- [ ] FastAPIの同期`def`エンドポイントはスレッドプールにオフロードされるため、
      重いCPU処理があってもイベントループ自体は塞がれにくい（ステップ4の発見）。
      逆に`async def`の中に同期の重い処理を書いてしまうと、イベントループを直接ブロックする
      （asyncio debug mode学習の内容と地続き）

### 運用上の注意
- [ ] 本番コンテナのDockerfileやデプロイ定義に`SYS_PTRACE`をデフォルトで含めない
- [ ] 調査用に一時的に権限を付与した場合は、確認後は必ず元の設定に戻す
- [ ] `record`のサンプリングレート（デフォルト100Hz）を上げすぎると対象プロセスへの負荷が増える。
      重い調査をする場合はレート(`-r`)や期間(`-d`)を絞る

**ステップ5完了条件チェック：**
- [x] チェックリストを見るだけで、他プロジェクトでもpy-spyを使い始められる状態になった
- [x] 全ステップ（1〜5）の学習記録が本ファイルに揃った
