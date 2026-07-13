# frontend

## セットアップ

```bash
npm install
npm run dev
```

## テスト

```bash
npm run test:coverage
```

## Lint

```bash
npm run lint
```

## E2E(Playwright)

```bash
npm run test:e2e
```

- 現時点ではCIには含めず、手元実行のみ([[../docs/deliverables/requirements/06_nonfunctional_requirements|NFR-020]]参照)。
- CI(GitHub Actions)ではlint・vitest(カバレッジゲート込み)・buildが自動実行される(`.github/workflows/ci.yml`)。
