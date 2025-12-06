# 本棚UI デザイン仕様書

## 1. デザインコンセプト

### 1.1 ビジョン
「フォルダを開くと、採用者のドキュメントが本棚に並んだ本のように表示され、本を選んで開くと紙の本をめくるような感覚でページを閲覧できる」

### 1.2 ユーザー体験の流れ

```
フォルダ選択 → 本棚ビュー → 本を選択 → 本が開く → ページをめくる
     ↓           ↓            ↓          ↓           ↓
  [エンジニア職] [並んだ本]  [履歴書]  [見開き表示] [アニメーション]
```

## 2. 画面構成

### 2.1 全体レイアウト

```
┌────────────────────────────────────────────────────────────┐
│  楽々ライブラリ - 採用者管理システム                        │
└────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────┐
│          │  パンくずナビゲーション                          │
│  ツリー  │  マイライブラリ > 2024年度 > エンジニア職        │
│  ナビ    ├─────────────────────────────────────────────────┤
│          │                                                  │
│  📚書庫  │           本棚ビュー（Grid表示）                 │
│  📁年度  │                                                  │
│  📁部署  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│          │  │ 📘   │ │ 📗   │ │ 📕   │ │ 📙   │       │
│          │  │ 履歴 │ │ 職務 │ │ 面接 │ │ 評価 │       │
│          │  │ 書   │ │ 経歴 │ │ 記録 │ │ シート│       │
│          │  │      │ │      │ │      │ │      │       │
│          │  │山田  │ │山田  │ │山田  │ │山田  │       │
│          │  └──────┘ └──────┘ └──────┘ └──────┘       │
│          │                                                  │
│          │  ┌──────┐ ┌──────┐                           │
│          │  │ 📘   │ │ 📗   │                           │
│          │  │ 履歴 │ │ 職務 │                           │
│          │  │ 書   │ │ 経歴 │                           │
│          │  │      │ │      │                           │
│          │  │佐藤  │ │佐藤  │                           │
│          │  └──────┘ └──────┘                           │
└──────────┴─────────────────────────────────────────────────┘

本をクリックすると...

┌────────────────────────────────────────────────────────────┐
│  [←戻る] 履歴書 - 山田太郎                                  │
│  [見開き表示] [単ページ] [ズーム] [回転] [ダウンロード]     │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│                                                              │
│    ┌─────────────────┐   ┌─────────────────┐            │
│    │                 │   │                 │            │
│    │    ページ 1     │   │    ページ 2     │            │
│    │                 │   │                 │            │
│    │   [PDF内容]     │   │   [PDF内容]     │            │
│    │                 │   │                 │            │
│    │                 │   │                 │            │
│    │                 │   │                 │            │
│    │                 │   │                 │            │
│    └─────────────────┘   └─────────────────┘            │
│                    中央の境界線                            │
│                                                              │
│           [< 前のページ]  1-2 / 10  [次のページ >]          │
└────────────────────────────────────────────────────────────┘
```

### 2.2 本棚ビューの詳細デザイン

#### 本のカード表示
```
┌──────────────┐
│              │
│   📘 [色]    │ ← 背表紙の色（バインダの色と連動）
│              │
│   ドキュメント │ ← ドキュメント種別
│   タイプ      │   （履歴書、職務経歴書など）
│              │
│   ─────────  │
│              │
│   候補者名    │ ← 採用者の名前
│              │
│   📄 5ページ │ ← ページ数
│              │
└──────────────┘
  ホバー時: 軽く浮き上がる + 影
  クリック時: 本が開くアニメーション
```

#### カラーバリエーション
- 📘 青: 履歴書
- 📗 緑: 職務経歴書
- 📕 赤: 面接記録
- 📙 黄: 評価シート
- 📓 紫: その他資料

## 3. インタラクション設計

### 3.1 本棚ビュー → 本を開く

#### アニメーション
1. 本のカードをクリック
2. カードが画面中央に移動しながら拡大
3. 本が開くように左右に分かれる（0.5秒）
4. 見開き表示のビューアに切り替わる

#### CSS実装イメージ
```css
@keyframes bookOpen {
  0% {
    transform: scale(0.5) translateY(0);
  }
  50% {
    transform: scale(1.2) translateY(-20px);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.book-card.opening {
  animation: bookOpen 0.5s ease-out;
}
```

### 3.2 ページめくり

#### マウス操作
- **クリック**: ページの右側→次へ、左側→前へ
- **ドラッグ**: ページをつかんでめくる（スワイプ風）
- **ホイール**: 上下スクロールでページ移動

#### タッチ操作
- **タップ**: 右側→次へ、左側→前へ
- **スワイプ**: 左右にスワイプでページめくり
- **ピンチ**: ズームイン/アウト

#### ページめくりアニメーション
```
┌─────────┐          ┌─────────┐
│ Page 2  │          │ Page 3  │
│         │   →→→   │         │
│         │          │         │
└─────────┘          └─────────┘
   ふわっと左にスライド + フェード
```

### 3.3 見開き表示の特徴

#### 中央の境界線
- 本を開いた時の「綴じ目」を表現
- 薄い影を入れて立体感を出す

#### ページの配置
- 奇数ページ: 右側
- 偶数ページ: 左側
- ページ1（表紙）: 単独で右側に表示

## 4. UIコンポーネント設計

### 4.1 BookshelfView コンポーネント
```tsx
interface BookshelfViewProps {
  documents: DocumentNode[];
  onBookClick: (doc: DocumentNode) => void;
}

const BookshelfView: React.FC<BookshelfViewProps> = ({ documents, onBookClick }) => {
  return (
    <div className="bookshelf-grid">
      {documents.map(doc => (
        <BookCard
          key={doc.id}
          document={doc}
          onClick={() => onBookClick(doc)}
        />
      ))}
    </div>
  );
};
```

### 4.2 BookCard コンポーネント
```tsx
interface BookCardProps {
  document: DocumentNode;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ document, onClick }) => {
  const getBookColor = (color?: string) => {
    const colorMap = {
      blue: '#3b82f6',
      green: '#10b981',
      red: '#ef4444',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div
      className="book-card"
      style={{ '--book-color': getBookColor(document.color) }}
      onClick={onClick}
    >
      <div className="book-spine">
        <Book size={48} />
      </div>
      <div className="book-title">{document.name}</div>
      <div className="book-pages">{document.pages?.length || 0} ページ</div>
    </div>
  );
};
```

### 4.3 SpreadView コンポーネント（見開き表示）
```tsx
interface SpreadViewProps {
  document: DocumentNode;
  currentPage: number;
  zoom: number;
  rotation: number;
  onPageChange: (page: number) => void;
}

const SpreadView: React.FC<SpreadViewProps> = ({
  document,
  currentPage,
  zoom,
  rotation,
  onPageChange,
}) => {
  const isFirstPage = currentPage === 1;

  return (
    <div className="spread-viewer">
      <div className="page-container">
        {!isFirstPage && (
          <div className="page left-page">
            <Page
              pageNumber={currentPage}
              scale={zoom}
              rotate={rotation}
            />
          </div>
        )}
        <div className="book-binding" />
        <div className="page right-page">
          <Page
            pageNumber={isFirstPage ? currentPage : currentPage + 1}
            scale={zoom}
            rotate={rotation}
          />
        </div>
      </div>
    </div>
  );
};
```

## 5. CSS スタイル設計

### 5.1 本棚グリッド
```css
.bookshelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 30px;
  padding: 40px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 200px);
}
```

### 5.2 本のカード
```css
.book-card {
  --book-color: #3b82f6;

  background: var(--book-color);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1),
              0 2px 4px rgba(0, 0, 0, 0.06);
  position: relative;
  height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  color: white;
  text-align: center;

  /* 本の背表紙の質感 */
  background: linear-gradient(
    to right,
    var(--book-color) 0%,
    var(--book-color) 85%,
    rgba(0, 0, 0, 0.2) 90%,
    rgba(0, 0, 0, 0.3) 95%,
    var(--book-color) 100%
  );
}

.book-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15),
              0 10px 10px rgba(0, 0, 0, 0.1);
}

.book-card:active {
  transform: translateY(-4px) scale(1.01);
}
```

### 5.3 見開き表示
```css
.spread-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: calc(100vh - 160px);
}

.page-container {
  display: flex;
  gap: 0;
  background: white;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  position: relative;
}

.page {
  background: white;
  overflow: hidden;
}

.left-page {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.right-page {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* 本の綴じ目 */
.book-binding {
  width: 4px;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.2),
    rgba(0, 0, 0, 0.1),
    rgba(0, 0, 0, 0.2)
  );
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);
  z-index: 10;
}
```

### 5.4 ページめくりアニメーション
```css
@keyframes pageFlipRight {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-20px);
    opacity: 0.5;
  }
  100% {
    transform: translateX(-100%);
    opacity: 0;
  }
}

@keyframes pageSlideIn {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.page.flipping-out {
  animation: pageFlipRight 0.4s ease-in-out;
}

.page.sliding-in {
  animation: pageSlideIn 0.4s ease-in-out;
}
```

## 6. 表示モードの切り替え

### 6.1 表示モード種類
1. **本棚ビュー**: フォルダ内のドキュメントをグリッド表示
2. **見開きビュー**: 本を開いた状態（デフォルト）
3. **単ページビュー**: 1ページずつ表示
4. **サムネイルビュー**: 全ページのサムネイル一覧

### 6.2 ツールバー
```
┌────────────────────────────────────────────────┐
│ [本棚に戻る] [見開き] [単ページ] [サムネイル] │
│ [ズーム: - 100% +] [回転] [ダウンロード]       │
└────────────────────────────────────────────────┘
```

## 7. レスポンシブ対応

### 7.1 デスクトップ（1200px以上）
- 本棚: 4-5列のグリッド
- 見開き: 2ページ並列表示

### 7.2 タブレット（768px - 1199px）
- 本棚: 3列のグリッド
- 見開き: 2ページ並列表示（やや縮小）

### 7.3 スマートフォン（767px以下）
- 本棚: 2列のグリッド
- 見開き: 単ページ表示に自動切り替え

## 8. アクセシビリティ

### 8.1 キーボード操作
- **→ / Space**: 次のページ
- **← / Shift+Space**: 前のページ
- **Esc**: 本を閉じて本棚に戻る
- **+/-**: ズームイン/アウト
- **R**: 回転

### 8.2 スクリーンリーダー対応
- 本のカードに適切なaria-label
- ページ番号の読み上げ
- 操作ボタンのラベル

## 9. パフォーマンス最適化

### 9.1 遅延読み込み
- 本棚ビュー: スクロールに応じて遅延読み込み
- PDF: 表示中のページのみレンダリング

### 9.2 サムネイル生成
- 初回表示時にサムネイルをキャッシュ
- IndexedDBに保存

## 10. 実装優先順位

### Phase 1: 基本機能
1. ✅ 本棚ビューのグリッド表示
2. ✅ 本のカードデザイン
3. ✅ 見開き表示
4. ✅ 基本的なページめくり

### Phase 2: UX向上
1. ⏳ 本を開くアニメーション
2. ⏳ ページめくりアニメーション
3. ⏳ ズーム機能
4. ⏳ 回転機能

### Phase 3: 高度な機能
1. ⏳ サムネイルビュー
2. ⏳ 付箋・マーカー機能
3. ⏳ キーボードショートカット

## 11. デモシナリオ

### シナリオ: 採用者の書類を本のように閲覧
1. 左サイドバーから「2024年度採用 > エンジニア職」を選択
2. 画面中央に本棚が表示される
3. 青い本（履歴書）をクリック
4. 本が開くアニメーションが再生
5. 見開き表示でページを閲覧
6. ページの右側をクリックしてめくる
7. ズームボタンで拡大して細かい文字を確認
8. 「本棚に戻る」で本棚ビューに戻る
9. 次の候補者の本を選択

## 12. まとめ

本棚UIは、楽々ライブラリの「バインダ」のコンセプトを進化させ、より直感的で楽しい閲覧体験を提供します。紙の本をめくる感覚を再現することで、デジタルでありながら親しみやすいUIを実現します。
