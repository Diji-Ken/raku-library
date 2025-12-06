# Vercelへのデプロイ手順

## 前提条件

- GitHubアカウント
- Vercelアカウント（https://vercel.com でサインアップ）
- このプロジェクトがGitHubにプッシュされていること

## デプロイ方法

### 方法1: Vercel CLI を使用（推奨）

#### 1. Vercel CLIをインストール

```bash
npm install -g vercel
```

#### 2. Vercelにログイン

```bash
vercel login
```

#### 3. プロジェクトをデプロイ

```bash
# 初回デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

初回デプロイ時に以下の質問が表示されます：
- `Set up and deploy "~/src/raku-library"?` → **Yes**
- `Which scope do you want to deploy to?` → あなたのアカウントを選択
- `Link to existing project?` → **No**（初回の場合）
- `What's your project's name?` → **raku-library**（または任意の名前）
- `In which directory is your code located?` → **./（Enter）**
- `Want to override the settings?` → **No**

### 方法2: Vercel Webダッシュボードを使用

#### 1. GitHubにプッシュ

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

#### 2. Vercelダッシュボードでデプロイ

1. https://vercel.com にアクセスしてログイン
2. 「Add New...」→「Project」をクリック
3. GitHubリポジトリをインポート
4. raku-libraryリポジトリを選択
5. 以下の設定を確認：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. 「Deploy」ボタンをクリック

## ビルド設定

Vercelは自動的に以下の設定を使用します（`vercel.json`に定義済み）：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## 環境変数の設定（必要な場合）

1. Vercelダッシュボードでプロジェクトを選択
2. 「Settings」→「Environment Variables」に移動
3. 必要な環境変数を追加
4. 再デプロイ

## カスタムドメインの設定

1. Vercelダッシュボードでプロジェクトを選択
2. 「Settings」→「Domains」に移動
3. 「Add Domain」をクリックして独自ドメインを追加
4. DNS設定の指示に従う

## デプロイ後の確認事項

- ✅ すべてのページが正しく表示される
- ✅ PDF表示機能が動作する
- ✅ ファイルアップロードが動作する
- ✅ LocalStorageでのデータ永続化が動作する
- ✅ 印刷機能が動作する
- ✅ 検索機能が動作する

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# ローカルでビルドテスト
npm run build

# ビルド成功を確認してからデプロイ
vercel --prod
```

### PDFが表示されない場合

`vite.config.js`に以下の設定が必要です（既に設定済み）：

```javascript
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  }
})
```

### ルーティングエラーが発生する場合

`vercel.json`のrewritesルールを確認してください（既に設定済み）。

## 自動デプロイ

GitHubと連携すると、以下のブランチへのプッシュで自動デプロイされます：

- **main/master ブランチ** → 本番環境
- **その他のブランチ** → プレビュー環境

## コマンド一覧

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ローカルでプレビュー
npm run preview

# Vercelにデプロイ（開発環境）
vercel

# Vercelにデプロイ（本番環境）
vercel --prod

# デプロイ状況確認
vercel ls

# ログ確認
vercel logs
```

## 参考リンク

- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Viteデプロイガイド](https://vitejs.dev/guide/static-deploy.html#vercel)
