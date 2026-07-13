# コーディング規約: フロントエンド(JavaScript / React / Vite)

> このファイルは`docs/coding_conventions/common.md`の優先順位と分類に従う。既存実装は判断材料の一つであり、React公式ガイドやWCAGと異なる箇所は移行対象として明記する。

## 1. 命名規則

- コンポーネント名・コンポーネントファイル名は`PascalCase`(例: `ProductDetail.jsx`, `Header.jsx`)
- 画面単位のコンポーネントは`XxxView.jsx`(例: `CartView.jsx`, `AdminOrdersView.jsx`)、再利用可能なUI部品は用途がわかる名前(例: `StarRating.jsx`, `ErrorBanner.jsx`)にする
- 変数・関数・propsは`camelCase`。boolean値は意味に応じて`is`/`has`/`can`/`should`等のprefixを付ける(例: `isLoading`, `hasError`, `canSubmit`)
- カスタムHookは`use`prefix必須とする(例: `useAuth`, `useQueryParamCallback`)
- API呼び出し関数は利用側から見た操作を表す。基本は`fetchXxx`/`createXxx`/`updateXxx`/`deleteXxx`を使い、`cancelOrder`、`requestPasswordReset`等、ドメイン上の操作名が明確な場合はそちらを優先する

## 2. ディレクトリ構成

- `pages/`: ルーティング単位の画面コンポーネント。対応する`*.test.jsx`を同じディレクトリに置く
- `components/`: 複数画面から使う、または画面を構成する責務のまとまったUI部品
- `api/`: バックエンドAPI呼び出しの窓口。リソースまたは機能単位に分け、`client.js`の共通`apiFetch`ヘルパーを経由する
- `lib/`: API呼び出しを伴わない純粋な共通処理(フォーマット関数、定数)
- コンポーネントから`fetch`/`axios`等を直接呼ばず、必ず`api/`配下の関数を経由する
- ディレクトリ間の循環依存を作らない。`api/`と`lib/`はページコンポーネントへ依存しない

## 3. コンポーネント設計

- 関数コンポーネント + Hooksを標準とする。クラスコンポーネントは新規作成しない
- 1ファイル1コンポーネントを原則とする。ただし同一ファイル内でしか使わない小さな補助コンポーネントはこの限りではない
- コンポーネントとHookはレンダー中にprops・state・contextや外部変数を変更せず、同じ入力に対して同じJSXを返す純粋性を保つ。副作用はイベントハンドラまたは必要なEffectに置く
- 抽象化は再利用回数だけで決めない。責務のまとまり、変更理由、テスト容易性、重複による不整合リスクを確認し、名前とAPIが明確になった時点で共通コンポーネントまたはカスタムHookへ切り出す
- 配列をレンダーする際の`key`には、並び替え・追加・削除後も対象を一意に識別する安定したIDを使う。配列indexは静的で順序不変なリストに限定する

## 4. Hooksとデータ取得

- Rules of Hooksを守る。条件分岐・ループ・early returnの後でHookを呼ばず、コンポーネントまたはカスタムHookのトップレベルで呼ぶ
- `useEffect`は外部システムとの同期に使う。レンダー中に導出できる値、ユーザー操作に直接対応する処理、state間の同期のためだけには使わない
- `useEffect`の依存配列を恣意的に削減せず、`react-hooks/exhaustive-deps`に従う。警告を抑制する前に、関数をEffect内へ移す、値をレンダー中に導出する、処理をイベントハンドラへ移す等で依存関係を正す
- ESLintルールを無効化する場合は対象行へ限定し、依存を外しても正しい理由をコメントに記載する。ファイル単位・設定全体で安易に無効化しない
- Effectでデータ取得する場合は、cleanupでリクエストを中止するか古いレスポンスを無視し、後から完了した古いリクエストで表示を上書きしない。loading・error・emptyの各状態を扱う
- 同じ取得処理、キャッシュ、再検証、重複排除が複数画面で必要になった場合は、カスタムHookまたはサーバー状態管理ライブラリの導入を検討する。現時点ではライブラリ導入を必須としない

**移行対象**: 既存のデータ取得Effectにはcleanupがないものがある。該当画面を変更する際に競合防止を追加する。

## 5. 状態管理

- コンポーネントローカルな状態は`useState`/`useReducer`を使う
- 画面をまたぐ状態(ログインユーザー情報等)のみContext APIを使う。高頻度で更新される値やサーバーから取得した一覧全体を安易にContextへ置かない
- APIから取得したサーバー状態と、フォーム入力等のUI状態を区別し、サーバー状態をUI状態へ理由なくコピーしない
- propsや既存stateからレンダー中に計算できる値は別のstateとして保持しない。複数stateを常に同時更新する必要がある場合は、状態構造または`useReducer`を検討する

## 6. props設計

- propsは親から子への一方向データフローとして扱い、propsおよびpropsから受け取ったオブジェクトを子コンポーネント内で変更しない
- コールバックpropsは`onXxx`(例: `onSubmit`, `onDelete`)の命名にする
- propsが増えてコンポーネントの責務が曖昧になった場合、単にpropsをオブジェクトへまとめるのではなく、コンポーネント分割やcompositionを検討する

## 7. スタイリング

- 静的な見た目とレイアウトはCSSファイルへ定義し、`className`で適用する。コンポーネント固有のスタイルは対応するCSSファイルへ近接配置し、全画面で共有する変数・基本要素・ユーティリティのみグローバルCSSへ置く
- インライン`style`は、実行時に計算される幅・位置・色等、CSSクラスとして事前定義することが不自然な動的値に限定する
- 色、余白、角丸、文字サイズ等で繰り返す値はCSS custom properties等のデザイントークンへ集約し、同じ意味の値を各コンポーネントへ複製しない
- 新しいスタイリング手法を追加する場合は、既存方式との責務、移行方法、依存コストを決めてから採用する。CSS Modulesと通常CSSの最終的な使い分けは、最初のスタイル移行時に決定する

**移行対象**: `index.html`の大規模な`<style>`ブロックと、静的値だけのインラインstyleは既存資産として残っている。新規コードでは増やさず、関連コンポーネントを変更する際にCSSファイルへ移す。

## 8. アクセシビリティ

- 目標はWCAG 2.2 Level AAとする。まずネイティブHTMLの意味を使い、`div`や`span`へクリック処理とARIA roleを足すより`button`、`a`、`nav`、`main`等の適切な要素を使う
- すべてのフォームコントロールに、目的を表すプログラム上のラベルを関連付ける。placeholderをラベルの代用にしない
- 操作可能な要素はキーボードだけで利用でき、視認可能なフォーカス表示と論理的なフォーカス順を持つようにする
- 画像には用途に合う`alt`を設定する。装飾画像は空の`alt`とし、意味のある画像の説明をファイル名に任せない
- エラーは色だけで示さずテキストで対象と内容を伝え、必要に応じて`aria-invalid`、`aria-describedby`、`role="alert"`等で支援技術へ通知する
- モーダルは開いた際に適切な要素へフォーカスを移し、背後へフォーカスが抜けないようにし、Escapeで閉じ、閉じた後は起点へフォーカスを戻す
- ローディング、保存完了、トースト等、フォーカスを移さず更新される重要な状態はlive region等で認識できるようにする
- 色コントラスト、拡大、reflow、タッチターゲットを確認し、色やポインター操作だけに情報・操作を依存させない

**移行対象**: placeholderのみで識別している既存入力欄、モーダル、トースト等をWCAG観点で監査し、画面変更時に改善する。

## 9. エラー・認証情報

- APIエラーを握りつぶさず、利用者が次に取れる行動を判断できる表示へ変換する。開発用のスタックトレースや内部レスポンスをそのまま画面へ出さない
- 認証トークンをログ、URL、エラーメッセージへ含めない。`api/client.js`等の共通境界でAuthorizationヘッダーを付与する
- 認証トークンの保存方式はXSSとCSRFの脅威を比較して決める。`localStorage`を使う間は「JavaScriptから読めるためXSS時に漏えいする」制約を認識し、HTML文字列の挿入や安全性未確認の`dangerouslySetInnerHTML`を使用しない

**要決定**: 本番公開前に、現在の`localStorage` + Bearer tokenを継続するか、`Secure`・`HttpOnly`・`SameSite`属性を持つCookie方式へ移行するかを、バックエンドのCSRF対策を含めて決定する。

## 10. 主な根拠資料

- [React: Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React: useEffect](https://react.dev/reference/react/useEffect)
- [React: eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks)
- [W3C: Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C WAI: Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
