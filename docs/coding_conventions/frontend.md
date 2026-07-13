# コーディング規約: フロントエンド(JavaScript / React / Vite)

> このファイルは`frontend/src`の実装済みコードの実態に基づいて記載する。

## 1. 命名規則

- コンポーネント名・コンポーネントファイル名は`PascalCase`(例: `ProductDetail.jsx`, `Header.jsx`)
- 画面単位のコンポーネントは`XxxView.jsx`(例: `CartView.jsx`, `AdminOrdersView.jsx`)、再利用可能なUI部品は用途がわかる名前(例: `StarRating.jsx`, `ErrorBanner.jsx`)で、`pages/`と`components/`のどちらに置くかを名前からも判断できるようにする
- 変数・関数・propsは`camelCase`。boolean値は`is`/`has`prefixを付ける(例: `isLoading`, `hasError`)
- カスタムHookを追加する場合は`use`prefix必須(例: `AuthContext.jsx`の`useAuth`、`MainView.jsx`の`useQueryParamCallback`)。既存コードもこの命名に従っており、今後増える場合も同様にする
- API呼び出し関数は`fetchXxx`(GET)/`createXxx`・`addXxx`(POST)/`updateXxx`(PATCH/PUT)/`deleteXxx`(DELETE)のprefixで動詞を統一する(`api/products.js`の`fetchProducts`, `addProductImage`, `deleteProductImage`のパターンに合わせる)

## 2. ディレクトリ構成

- `pages/`: ルーティング単位の画面コンポーネント(1画面1ファイル、対応する`*.test.jsx`を同じディレクトリに置く)
- `components/`: 複数画面から使う/画面を構成する再利用可能なUI部品
- `api/`: バックエンドAPI呼び出しの窓口。リソースごとに1ファイル(`products.js`, `orders.js`等)に分け、`client.js`の共通`apiFetch`ヘルパーを経由する
- `lib/`: API呼び出しを伴わない純粋な共通処理(フォーマット関数、定数)
- コンポーネントから`fetch`/`axios`等を直接呼ばず、必ず`api/`配下の関数を経由する

## 3. コンポーネント設計

- 関数コンポーネント + Hooksを標準とする(クラスコンポーネントは使わない)
- 1ファイル1コンポーネントを原則とする。ただし同一ファイル内でしか使わない小さな補助コンポーネント(数行程度)はこの限りではない
- 抽象化(共通コンポーネント化・カスタムHook化)は「2箇所以上で同じロジック/UIパターンが必要になった時点」で行い、使う予定のない汎用化を先回りして作らない

## 4. Hooksの使用方針

- Rules of Hooksを守る(条件分岐・ループ・early returnの後でHookを呼ばない。トップレベルでのみ呼び出す)
- `useEffect`の依存配列は省略・恣意的な削減をせず、ESLintの`react-hooks/exhaustive-deps`警告に従う。意図的に依存を外す場合は、コメントで理由を残す
- データ取得は`useEffect`内で`api/`の関数を呼び出すパターンを既存コードに合わせて使う(状態管理ライブラリは導入しない)

## 5. 状態管理

- コンポーネントローカルな状態は`useState`/`useReducer`を使う
- 画面をまたぐ状態(ログインユーザー情報等)のみ`AuthContext`(Context API)を使う。高頻度で更新される値をContextに乗せない
- APIから取得したデータ(サーバー状態)と、フォーム入力等のUI状態を区別し、サーバー状態をUI状態に無駄にコピーしない

## 6. props設計

- propsは親から子への一方向データフローとして扱い、子コンポーネント内でpropsオブジェクトを直接書き換えない
- コールバックpropsは`onXxx`(例: `onSubmit`, `onDelete`)の命名にする

## 7. スタイリング

- 既存コードは2パターンを併用している。新規実装もこれに合わせる
  - `:hover`等の疑似クラスが必要なもの、複数箇所で使い回すボタン等の見た目は、`index.html`の`<style>`ブロックにクラス(`.btn-primary`, `.btn-danger`等)を追記し、`className`で参照する
  - レイアウト調整(padding, gap, borderRadius等、その要素固有の一回限りの調整)はインラインの`style={{ ... }}`で指定する
  - 同一要素で両方(`className`+`style`)を併用してよい(既存コードの`<button className="btn-primary" style={{ padding: "10px 20px", ... }}>`のパターン)
- CSS Modules/styled-components等、上記2パターン以外の新しい手法を混在させない
