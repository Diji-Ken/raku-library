# システムアーキテクチャ設計書

## 1. システム概要

### 1.1 システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        ユーザー                              │
│                  （ブラウザ: Chrome/Edge/Safari）             │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                          │
│               静的コンテンツ配信 + キャッシュ                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
┌───────────────────┐              ┌──────────────────────┐
│   S3 Bucket       │              │  Application Load    │
│  (React App)      │              │  Balancer (ALB)      │
│  静的ホスティング   │              └──────────────────────┘
└───────────────────┘                        ↓
                                   ┌─────────────────────┐
                                   │   Auto Scaling      │
                                   │   Group             │
                                   └─────────────────────┘
                                            ↓
                        ┌───────────────────┼───────────────────┐
                        ↓                   ↓                   ↓
                  ┌─────────┐         ┌─────────┐         ┌─────────┐
                  │  EC2    │         │  EC2    │         │  EC2    │
                  │(Backend)│         │(Backend)│         │(Backend)│
                  └─────────┘         └─────────┘         └─────────┘
                        │                   │                   │
        ┌───────────────┼───────────────────┼───────────────────┤
        ↓               ↓                   ↓                   ↓
┌───────────────┐ ┌──────────────┐  ┌────────────┐  ┌──────────────┐
│   RDS         │ │  ElastiCache │  │   S3       │  │  Cognito     │
│ (PostgreSQL)  │ │   (Redis)    │  │ (PDF保存)  │  │  (認証)      │
│  メタデータ    │ │  セッション   │  │            │  │              │
└───────────────┘ └──────────────┘  └────────────┘  └──────────────┘
```

### 1.2 技術スタック

#### フロントエンド
- **フレームワーク**: React 19 + TypeScript
- **状態管理**: React Hooks (useState, useContext)
- **ルーティング**: React Router v6
- **UIライブラリ**: Lucide React（アイコン）
- **PDFビューア**: react-pdf
- **ドキュメント変換**: mammoth (Word), xlsx (Excel)
- **HTTP通信**: Axios
- **ビルドツール**: Vite

#### バックエンド
- **ランタイム**: Node.js 20.x
- **フレームワーク**: Express.js
- **言語**: TypeScript
- **認証**: Passport.js + JWT
- **バリデーション**: Joi / Zod
- **ORM**: Prisma / TypeORM
- **テスト**: Jest + Supertest

#### インフラ（AWS）
- **コンピューティング**: EC2 (t3.medium) / ECS Fargate（将来検討）
- **ロードバランサ**: Application Load Balancer (ALB)
- **データベース**: RDS for PostgreSQL (Multi-AZ)
- **キャッシュ**: ElastiCache for Redis
- **ストレージ**: S3 (Standard, Intelligent-Tiering, Glacier)
- **CDN**: CloudFront
- **認証**: Cognito
- **監視**: CloudWatch
- **ログ**: CloudWatch Logs
- **通知**: SNS

## 2. アーキテクチャパターン

### 2.1 3層アーキテクチャ

```
┌─────────────────────────────────────┐
│   Presentation Layer                │
│   (React + TypeScript)              │
│   - UIコンポーネント                 │
│   - 状態管理                         │
│   - ルーティング                     │
└─────────────────────────────────────┘
                ↓ REST API
┌─────────────────────────────────────┐
│   Application Layer                 │
│   (Express + TypeScript)            │
│   - ビジネスロジック                 │
│   - 認証・認可                       │
│   - バリデーション                   │
│   - ファイル処理                     │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│   Data Layer                        │
│   - PostgreSQL (RDS)                │
│   - Redis (ElastiCache)             │
│   - S3 (Object Storage)             │
└─────────────────────────────────────┘
```

### 2.2 マイクロサービス指向（将来の拡張）

現在は モノリシックな構成ですが、将来的に以下のマイクロサービス化を検討：

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Auth Service   │  │ Document Service│  │  Search Service │
│  (認証・認可)    │  │ (PDF管理)       │  │  (全文検索)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        ↓                     ↓                     ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
└─────────────────────────────────────────────────────────────┘
```

## 3. データベース設計

### 3.1 ER図（概要）

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   users     │         │ candidates  │         │ documents   │
├─────────────┤         ├─────────────┤         ├─────────────┤
│ id          │         │ id          │         │ id          │
│ email       │         │ name        │         │ candidate_id│
│ password    │         │ email       │         │ type        │
│ name        │         │ phone       │         │ s3_key      │
│ role        │         │ department  │         │ file_size   │
│ created_at  │         │ status      │         │ uploaded_at │
└─────────────┘         │ created_at  │         └─────────────┘
                        └─────────────┘
                                │
                                │ 1:N
                                ↓
                        ┌─────────────┐
                        │  folders    │
                        ├─────────────┤
                        │ id          │
                        │ name        │
                        │ parent_id   │
                        │ type        │
                        └─────────────┘
```

### 3.2 主要テーブル定義

#### users（ユーザー）
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'admin', 'hr', 'manager', 'interviewer'
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### candidates（採用候補者）
```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(100),
  position VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- 'screening', 'interview1', 'interview2', 'offer', 'hired', 'rejected'
  applied_at DATE,
  tags TEXT[], -- ['Java', 'React', '5年経験']
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_department ON candidates(department);
CREATE INDEX idx_candidates_created_at ON candidates(created_at);
```

#### documents（ドキュメント）
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'resume', 'cv', 'interview', 'test', 'offer', 'other'
  s3_key VARCHAR(500) NOT NULL, -- S3オブジェクトキー
  s3_bucket VARCHAR(100) NOT NULL,
  file_size BIGINT, -- バイト
  mime_type VARCHAR(100),
  color VARCHAR(50), -- バインダの色
  page_count INTEGER,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_candidate ON documents(candidate_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);
```

#### folders（フォルダ階層）
```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'cabinet', 'folder'
  path VARCHAR(1000), -- 階層パス（検索用）
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_path ON folders(path);
```

#### access_logs（アクセスログ）
```sql
CREATE TABLE access_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'view', 'download', 'upload', 'delete'
  resource_type VARCHAR(50), -- 'document', 'candidate', 'folder'
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_access_logs_user ON access_logs(user_id);
CREATE INDEX idx_access_logs_action ON access_logs(action);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
```

## 4. API設計

### 4.1 RESTful API エンドポイント

#### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `POST /api/auth/refresh` - トークンリフレッシュ
- `GET /api/auth/me` - 現在のユーザー情報取得

#### 採用候補者
- `GET /api/candidates` - 候補者一覧取得
- `GET /api/candidates/:id` - 候補者詳細取得
- `POST /api/candidates` - 候補者作成
- `PUT /api/candidates/:id` - 候補者更新
- `DELETE /api/candidates/:id` - 候補者削除
- `GET /api/candidates/:id/documents` - 候補者のドキュメント一覧

#### ドキュメント
- `GET /api/documents` - ドキュメント一覧取得
- `GET /api/documents/:id` - ドキュメント詳細取得
- `POST /api/documents/upload` - ドキュメントアップロード
- `GET /api/documents/:id/download` - ドキュメントダウンロード（署名付きURL）
- `DELETE /api/documents/:id` - ドキュメント削除
- `PUT /api/documents/:id` - ドキュメント更新（メタデータ）

#### フォルダ
- `GET /api/folders` - フォルダ一覧取得
- `GET /api/folders/:id` - フォルダ詳細取得
- `POST /api/folders` - フォルダ作成
- `PUT /api/folders/:id` - フォルダ更新
- `DELETE /api/folders/:id` - フォルダ削除
- `GET /api/folders/tree` - フォルダツリー取得

#### 検索
- `GET /api/search?q=keyword` - 全文検索

### 4.2 API レスポンス例

#### GET /api/candidates
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "山田太郎",
      "email": "taro.yamada@example.com",
      "department": "エンジニアリング",
      "position": "バックエンドエンジニア",
      "status": "interview2",
      "appliedAt": "2024-01-15",
      "tags": ["Java", "Spring Boot", "5年経験"],
      "documentCount": 5,
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-02-01T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

#### POST /api/documents/upload
リクエスト（multipart/form-data）:
```
candidateId: 550e8400-e29b-41d4-a716-446655440000
type: resume
file: [binary data]
```

レスポンス:
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "candidateId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "resume.pdf",
    "type": "resume",
    "s3Key": "active/2024/engineering/candidate-001/resume.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-02-01T15:00:00Z"
  }
}
```

## 5. セキュリティ設計

### 5.1 認証・認可

#### 認証フロー
```
1. ユーザーがログイン (email + password)
2. バックエンドがパスワード検証
3. JWTトークン発行（有効期限: 1時間）
4. リフレッシュトークン発行（有効期限: 7日間）
5. フロントエンドがトークンを保存（httpOnly Cookie）
6. 以降のリクエストにトークンを含める
7. トークン有効期限切れ時、リフレッシュトークンで再発行
```

#### 認可（ロールベース）
- **admin**: 全機能アクセス可能
- **hr**: 採用関連の全データにアクセス可能
- **manager**: 自部署の採用データのみアクセス可能
- **interviewer**: 担当した候補者のデータのみ閲覧可能

### 5.2 データ保護

#### 暗号化
- **通信**: HTTPS (TLS 1.3)
- **保存時**: S3 SSE-S3 / SSE-KMS
- **データベース**: RDS暗号化
- **パスワード**: bcrypt (cost factor: 12)

#### 個人情報保護
- 不採用者データの自動削除（2年後）
- アクセスログの記録
- データエクスポート機能（GDPR対応）

### 5.3 脆弱性対策

- **SQLインジェクション**: ORMのパラメータ化クエリ
- **XSS**: React の自動エスケープ + CSP
- **CSRF**: CSRF トークン
- **ファイルアップロード**: ファイルタイプ検証、サイズ制限、ウイルススキャン

## 6. パフォーマンス設計

### 6.1 キャッシュ戦略

#### フロントエンド
- Service Worker（PWA）
- ブラウザキャッシュ
- CloudFront キャッシュ（静的コンテンツ: 24時間）

#### バックエンド
- Redis キャッシュ:
  - セッション情報
  - 頻繁アクセスされるクエリ結果（候補者一覧など）
  - 署名付きURL（15分間キャッシュ）

### 6.2 データベース最適化

- インデックスの適切な設計
- クエリの最適化（N+1問題の回避）
- コネクションプーリング
- Read Replica の活用（読み取り負荷分散）

### 6.3 ファイル処理最適化

- マルチパートアップロード（5MB以上）
- 並列処理
- 非同期処理（キュー: SQS）
- サムネイル生成（Lambda）

## 7. スケーラビリティ

### 7.1 水平スケーリング

- Auto Scaling Group: CPU使用率70%でスケールアウト
- 最小インスタンス数: 2
- 最大インスタンス数: 10

### 7.2 垂直スケーリング

- 必要に応じてインスタンスタイプを変更
- t3.medium → t3.large → c5.xlarge

## 8. 監視・運用

### 8.1 監視項目

- **インフラ**: CPU、メモリ、ディスクI/O、ネットワーク
- **アプリケーション**: レスポンスタイム、エラー率、スループット
- **データベース**: クエリ実行時間、コネクション数
- **S3**: リクエスト数、エラー率、レイテンシ

### 8.2 アラート

- エラー率 > 5%
- レスポンスタイム > 3秒
- CPU使用率 > 80%
- ディスク使用率 > 80%

### 8.3 ログ管理

- アプリケーションログ: CloudWatch Logs
- アクセスログ: S3
- 監査ログ: データベース

## 9. 災害対策

### 9.1 バックアップ

- **RDS**: 自動バックアップ（毎日）、保持期間30日
- **S3**: バージョニング + クロスリージョンレプリケーション
- **設定**: Infrastructure as Code (Terraform/CloudFormation)

### 9.2 復旧手順

1. RDSスナップショットからの復元
2. S3データの復元
3. アプリケーションの再デプロイ
4. 整合性チェック

目標復旧時間（RTO）: 4時間
目標復旧時点（RPO）: 1時間

## 10. まとめ

本システムは、AWS クラウドベースの3層アーキテクチャを採用し、スケーラビリティ、セキュリティ、可用性を重視した設計となっています。

**次のステップ**:
- 詳細設計
- プロトタイプ開発
- パフォーマンステスト
- セキュリティ監査
